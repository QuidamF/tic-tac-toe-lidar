# Manual de Hardware - Gato LiDAR (Funcionamiento, Responsabilidades e Instalación)

Este manual técnico describe los componentes físicos, sus responsabilidades de control, el esquema de interconexión y la guía detallada para la instalación del hardware del proyecto **Gato LiDAR**.

---

## 1. Arquitectura General y Responsabilidades

El sistema opera bajo un modelo distribuido de tres módulos principales interconectados de forma cableada e inalámbrica para garantizar un funcionamiento fluido y de fácil montaje:

<div class="architecture-diagram" style="background-color: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 20px; margin: 25px 0; font-family: 'Outfit', sans-serif; page-break-inside: avoid; text-align: center;">
  
  <!-- Fila Superior: Lidar y Raspberry Pi -->
  <div style="display: flex; justify-content: space-around; align-items: center; gap: 15px; width: 100%;">
    <!-- Sensor LiDAR -->
    <div style="flex: 1; background-color: #0369a1; border: 1px solid #0284c7; color: white; padding: 12px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
      <strong style="color: #38bdf8; font-size: 10pt; text-transform: uppercase;">Sensor LiDAR RPLIDAR C1</strong><br>
      <span style="font-size: 8.5pt; color: #e0f2fe;">(Genera Cortina Virtual)</span>
    </div>
    
    <!-- Enlace USB -->
    <div style="color: #64748b; font-size: 8pt; font-weight: bold; padding: 0 10px;">
      ◀ Cable USB / Módulo FTDI Serial ▶
    </div>
    
    <!-- Raspberry Pi -->
    <div style="flex: 1; background-color: #0f172a; border: 1px solid #1e293b; color: white; padding: 12px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
      <strong style="color: #06b6d4; font-size: 10pt; text-transform: uppercase;">Raspberry Pi</strong><br>
      <span style="font-size: 8.5pt; color: #cbd5e1;">(Computadora Central y Broker MQTT)</span>
    </div>
  </div>
  
  <!-- Enlace Inalámbrico hacia el ESP32 -->
  <div style="margin: 15px 0;">
    <div style="color: #64748b; font-size: 8pt; font-weight: bold; margin-bottom: 2px;">▲ Conexión Inalámbrica (Wi-Fi Local) ▲</div>
    <div style="color: #0891b2; font-weight: bold; font-size: 11pt;">⚡ Mensajes MQTT (Casillas / Turnos) ⚡</div>
    <div style="color: #64748b; font-size: 10pt; font-weight: bold; margin-top: 2px;">▼</div>
  </div>
  
  <!-- Fila Inferior: ESP32, Drivers y LEDs -->
  <div style="display: flex; flex-direction: column; align-items: center; gap: 15px; width: 100%;">
    <!-- Módulo ESP32-S3 -->
    <div style="width: 60%; background-color: #334155; border: 1px solid #475569; color: white; padding: 12px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
      <strong style="color: #94a3b8; font-size: 10pt; text-transform: uppercase;">ESP32-S3 WROOM 1</strong><br>
      <span style="font-size: 8.5pt; color: #cbd5e1;">(Controlador de Luces / Receptor MQTT)</span>
    </div>
    
    <!-- Enlace de Control -->
    <div style="color: #64748b; font-size: 8pt; font-weight: bold; margin: -5px 0;">
      ▼ Señales lógicas GPIO de baja corriente (3.3V)
    </div>
    
    <!-- Bloque de Potencia y LEDs -->
    <div style="display: flex; justify-content: space-around; align-items: center; gap: 15px; width: 100%;">
      <!-- Fuente de Poder Externa -->
      <div style="flex: 1; background-color: #d97706; border: 1px solid #b45309; color: white; padding: 12px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
        <strong style="color: #fde68a; font-size: 10pt; text-transform: uppercase;">Fuente Externa</strong><br>
        <span style="font-size: 8.5pt; color: #fef3c7;">(5V o 12V Regula Potencia)</span>
      </div>
      
      <!-- MOSFETs / Relevadores -->
      <div style="flex: 1; background-color: #4b5563; border: 1px solid #374151; color: white; padding: 12px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
        <strong style="color: #d1d5db; font-size: 10pt; text-transform: uppercase;">Módulos MOSFET</strong><br>
        <span style="font-size: 8.5pt; color: #f3f4f6;">(Conmutan corriente a LEDs)</span>
      </div>
      
      <!-- Tiras LED -->
      <div style="flex: 1; background-color: #b91c1c; border: 1px solid #991b1b; color: white; padding: 12px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
        <strong style="color: #fca5a5; font-size: 10pt; text-transform: uppercase;">Tiras LED Neón</strong><br>
        <span style="font-size: 8.5pt; color: #fee2e2;">(Iluminación Física X/O)</span>
      </div>
    </div>
  </div>
  
  <!-- Nota de Tierra Común -->
  <div style="margin-top: 15px; padding: 8px; background-color: #fee2e2; border: 1px solid #fca5a5; border-radius: 6px; color: #991b1b; font-size: 8.5pt; font-weight: bold;">
    ⚠️ NOTA CRÍTICA: La Tierra (GND) del ESP32 y el polo negativo (GND/0V) de la Fuente Externa deben unirse (Tierra Común).
  </div>
</div>


### Tabla de Responsabilidades

| Componente | Conectividad | Función Principal |
| :--- | :--- | :--- |
| **Raspberry Pi** | Wi-Fi (AP/Cliente) / Bluetooth (BLE) / USB | Servidor central (FastAPI/WebSocket), base de datos de calibración, procesamiento matemático del LiDAR, broker MQTT, hotspot local y reproducción de audio. |
| **LiDAR RPLIDAR C1** | USB-A (Raspberry) to USB-C (Sensor) | Barrido láser plano (cortina virtual) para telemetría espacial en tiempo real y detección de toques de balón en el muro. |
| **ESP32-S3 WROOM 1** | Wi-Fi (Cliente MQTT) | Recepción de eventos de juego mediante protocolo MQTT y activación de los pines de control para la iluminación física neon (X, O y Turnos). |

---

## 2. Raspberry Pi - Computadora Central

Es el cerebro lógico del sistema. Administra la lógica del juego, aloja la interfaz de calibración y gestiona la sincronización inalámbrica con el controlador de luces.

![Raspberry Pi instalada en gabinete de protección](/home/edgar-ld/.gemini/antigravity/brain/306cd5e2-0b76-4ebe-837f-bbecfad43c56/hardware/20260605_005707.jpg)

### Características Físicas y Montaje
- **Puntos de Sujeción**: En la parte trasera de la carcasa protectora cuenta con perforaciones diseñadas para fijación a paneles, soportes VESA o directo a muro mediante tornillería adecuada.
- **Alimentación**: Requiere un adaptador eliminador USB-C de 5V y 3A (incluido) conectado directo al tomacorriente.

### Funcionamiento de Red
1. Al conectar el eliminador, la Raspberry Pi arranca y enciende sus LEDs indicadores interno/externo (visibles a través de las rejillas de ventilación de la caja).
2. **Espera unos segundos (entre 20 y 30 s)** para que cargue el sistema operativo.
3. El sistema levantará automáticamente un Hotspot local con el SSID: **`gato1`** o **`gato2`** (según el paquete/kit entregado). Esta variación permite colocar múltiples juegos juntos sin interferencias de Wi-Fi.
4. Una vez detectada la red, conéctese desde su dispositivo (computadora o tablet) sin contraseña e ingrese a `http://10.42.0.1:3000` para entrar al panel.

---

## 3. Sensor LiDAR RPLIDAR C1 - Cortina Virtual

El LiDAR (Light Detection and Ranging) es el sensor encargado de escanear la pared y crear una barrera láser plana invisible ("cortina virtual") para interceptar los toques del balón.

<div class="curtain-diagram" style="background-color: #0f172a; border: 1.5px solid #1e293b; border-radius: 8px; padding: 25px; margin: 25px 0; font-family: 'Outfit', sans-serif; color: white; page-break-inside: avoid; text-align: center; position: relative;">
  <strong style="color: #06b6d4; font-size: 11pt; text-transform: uppercase; display: block; margin-bottom: 15px;">Concepto de Cortina Virtual con LiDAR C1</strong>
  
  <div style="display: inline-block; position: relative; width: 320px; height: 260px; border: 2px solid #334155; background-color: #1e293b; border-radius: 6px; overflow: hidden;">
    <!-- LiDAR en la parte superior -->
    <div style="position: absolute; top: 5px; left: 50%; transform: translateX(-50%); width: 40px; height: 20px; background: #0369a1; border-radius: 4px; border: 1px solid #38bdf8; z-index: 10;">
      <span style="font-size: 6pt; display: block; line-height: 20px; font-weight: bold;">LiDAR</span>
    </div>
    
    <!-- Flecha de 0 grados hacia abajo -->
    <div style="position: absolute; top: 25px; left: 50%; transform: translateX(-50%); width: 2px; height: 15px; background: #38bdf8; z-index: 10;"></div>
    <div style="position: absolute; top: 37px; left: 50%; transform: translateX(-50%); border-left: 4px solid transparent; border-right: 4px solid transparent; border-top: 5px solid #38bdf8; z-index: 10;"></div>
    
    <!-- Cortina virtual / haz laser -->
    <div style="position: absolute; top: 25px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 140px solid transparent; border-right: 140px solid transparent; border-bottom: 220px solid rgba(6, 182, 212, 0.15); z-index: 2;"></div>
    <!-- Líneas de límite del haz -->
    <div style="position: absolute; top: 25px; left: 50%; transform: translateX(-50%) rotate(-30deg); transform-origin: top center; width: 1px; height: 230px; background: rgba(6, 182, 212, 0.4); z-index: 3;"></div>
    <div style="position: absolute; top: 25px; left: 50%; transform: translateX(-50%) rotate(30deg); transform-origin: top center; width: 1px; height: 230px; background: rgba(6, 182, 212, 0.4); z-index: 3;"></div>
    
    <!-- Tablero de juego 3x3 -->
    <div style="position: absolute; top: 60px; left: 50%; transform: translateX(-50%); width: 160px; height: 160px; border: 1px solid rgba(255,255,255,0.15); display: grid; grid-template-columns: repeat(3, 1fr); grid-template-rows: repeat(3, 1fr); z-index: 1;">
      <div style="border: 0.5px solid rgba(255,255,255,0.1);"></div>
      <div style="border: 0.5px solid rgba(255,255,255,0.1);"></div>
      <div style="border: 0.5px solid rgba(255,255,255,0.1);"></div>
      <div style="border: 0.5px solid rgba(255,255,255,0.1);"></div>
      <div style="border: 0.5px solid rgba(255,255,255,0.1);"></div>
      <div style="border: 0.5px solid rgba(255,255,255,0.1);"></div>
      <div style="border: 0.5px solid rgba(255,255,255,0.1);"></div>
      <div style="border: 0.5px solid rgba(255,255,255,0.1);"></div>
      <div style="border: 0.5px solid rgba(255,255,255,0.1);"></div>
    </div>
    
    <!-- Balón tocando el plano -->
    <div style="position: absolute; top: 130px; left: 110px; width: 16px; height: 16px; background: radial-gradient(circle, #f97316 60%, #ea580c); border-radius: 50%; z-index: 5; box-shadow: 0 0 8px #f97316;"></div>
    <!-- Ondas de choque / Detección -->
    <div style="position: absolute; top: 124px; left: 104px; width: 28px; height: 28px; border: 2px solid #06b6d4; border-radius: 50%; opacity: 0.8; z-index: 4;"></div>
    <div style="position: absolute; top: 138px; left: 130px; color: #06b6d4; font-size: 7pt; font-weight: bold; z-index: 6;">Impacto (X, Y)</div>
    
    <!-- Plano paralelo a la pared -->
    <div style="position: absolute; bottom: 5px; left: 5px; color: rgba(255,255,255,0.5); font-size: 7pt;">Muro de Juego</div>
    <div style="position: absolute; bottom: 5px; right: 5px; color: #38bdf8; font-size: 7pt; font-weight: bold;">Plano Láser (~2-5 cm de la pared)</div>
  </div>
  
  <div style="margin-top: 12px; font-size: 9pt; color: #94a3b8; text-align: justify; padding: 0 10px;">
    El haz láser barre de forma continua el espacio paralelo al muro a una distancia de <strong>2 a 5 cm</strong>. Al impactar el balón, este obstruye el haz láser reflejándolo hacia el sensor. La Raspberry Pi calcula el ángulo y la distancia del impacto, los transforma en coordenadas (X, Y) dentro del tablero de juego y notifica el evento.
  </div>
</div>

### Montaje y Referencia de 0 Grados
El sensor cuenta en su cara superior con una **flecha de referencia triangular de color negro**. Esta marca indica la posición angular de **0 grados (referencia del eje X)**.

![Flecha de referencia de 0 grados en la parte superior del LiDAR](/home/edgar-ld/.gemini/antigravity/brain/306cd5e2-0b76-4ebe-837f-bbecfad43c56/hardware/20260605_005055.jpg)

- **Orientación Estándar**: Por defecto, al montar el sensor en el tablero de juego (ubicación recomendada: parte superior central, viendo hacia abajo), la flecha debe apuntar de manera paralela al muro.
- **Ajuste en Software**: Si por espacio físico el sensor se rota, la desviación angular puede corregirse de forma digital desde la consola en la pestaña LiDAR (`Rotación`).
- **Sujeción Mecánica**: En la base (parte trasera) del sensor, cuenta con **insertos metálicos roscados** para fijarlo sólidamente mediante tornillos, evitando vibraciones que afecten el escaneo.

> [!TIP]
> **Separación Crítica entre LiDAR y Muro**:
> La alineación paralela del haz láser respecto al muro de juego debe tomarse midiendo la distancia **desde la cara de la flecha del LiDAR hasta el muro de interacción**. 
> Se recomienda calibrar esta separación para que sea **2 a 3 cm menor que el diámetro total de la pelota o balón** que se usará para jugar. Esto asegura que el balón corte la cortina virtual justo antes de chocar con el muro, evitando detecciones tardías o rebotes fantasmas.

> [!WARNING]
> **Distancia Mínima de Detección (Zona Ciega)**:
> El sensor LiDAR cuenta con una zona ciega física (los primeros centímetros de rango no se pueden medir confiablemente). Por ello, el LiDAR debe colocarse de manera que **el inicio del tablero de juego proyectado/calibrado esté separado al menos de 5 a 10 cm del sensor**. De lo contrario, los toques que ocurran inmediatamente debajo del LiDAR no serán detectados.

![Insertos metálicos traseros en base del LiDAR](/home/edgar-ld/.gemini/antigravity/brain/306cd5e2-0b76-4ebe-837f-bbecfad43c56/hardware/20260605_005105.jpg)

### Conexión y Comunicación
El sensor se comunica y alimenta a través del puerto USB de la Raspberry Pi usando los siguientes accesorios incluidos:
1. Conecte el cable USB-C al sensor LiDAR.
2. Conecte el extremo del cable al **adaptador FTDI USB-a-Serial** (módulo verde translúcido indicador de estado).
3. Enchufe el puerto USB-A del adaptador FTDI a cualquiera de los puertos USB de la Raspberry Pi.

![Adaptador FTDI USB-Serial para comunicación del LiDAR](/home/edgar-ld/.gemini/antigravity/brain/306cd5e2-0b76-4ebe-837f-bbecfad43c56/hardware/20260605_005059.jpg)

---

## 4. ESP32-S3 WROOM 1 - Control de Luces LED

El módulo ESP32-S3 es el actuador físico encargado de encender la iluminación neon del tablero al recibir las señales del juego desde la Raspberry Pi por medio de red inalámbrica (MQTT).

![Módulo ESP32-S3 listo para instalación](/home/edgar-ld/.gemini/antigravity/brain/306cd5e2-0b76-4ebe-837f-bbecfad43c56/hardware/20260605_005046.jpg)

### Firmware y Conexión Automática
> [!NOTE]
> El módulo ESP32-S3 se entrega con el **firmware precargado de fábrica**. 
> Al encender el sistema, este módulo buscará automáticamente el Hotspot local de la Raspberry Pi (`gato1` o `gato2`), se conectará al broker MQTT en la IP `10.42.0.1` y quedará a la escucha de comandos del tablero sin requerir configuraciones de software adicionales por tu parte.

### Distribución y Asignación de Pines (GPIO, Tierra y Alimentación)

Para garantizar un cableado ordenado y evitar fallas de conexión, el ESP32-S3 cuenta con pines de control, alimentación y tierra organizados de la siguiente manera:

#### Tabla de Pines de Alimentación y Referencia
| Identificación | Tipo | Descripción | Nota de Instalación |
| :--- | :--- | :--- | :--- |
| **5V / VIN** | Entrada | Alimentación principal de 5V para el ESP32-S3. | Puede alimentarse vía USB-C o desde una salida regulada de 5V de la fuente de los LEDs. |
| **GND** | Tierra | Polo negativo de referencia eléctrica de la placa (tierra). | **Obligatorio: Debe estar unido físicamente al polo negativo de la fuente de los LEDs (Tierra Común).** |

#### Tabla de Distribución de Pines GPIO (Salidas de Control 3.3V)
El firmware precargado expone **21 pines GPIO configurables** en la placa. Su asignación de funciones no es fija en el hardware, sino que se define de manera dinámica a través de la interfaz web de control de Gato LiDAR:

| Pines GPIO Disponibles | Función por Defecto / Asignable | Conector DuPont |
| :---: | :--- | :---: |
| **4** | Canal GPIO de propósito general para control de LED (Configurable) | Pre-agrupado (Arnés) |
| **5** | Canal GPIO de propósito general para control de LED (Configurable) | Pre-agrupado (Arnés) |
| **6** | Canal GPIO de propósito general para control de LED (Configurable) | Pre-agrupado (Arnés) |
| **7** | Canal GPIO de propósito general para control de LED (Configurable) | Pre-agrupado (Arnés) |
| **8** | Canal GPIO de propósito general para control de LED (Configurable) | Pre-agrupado (Arnés) |
| **9** | Canal GPIO de propósito general para control de LED (Configurable) | Pre-agrupado (Arnés) |
| **10** | Canal GPIO de propósito general para control de LED (Configurable) | Pre-agrupado (Arnés) |
| **11** | Canal GPIO de propósito general para control de LED (Configurable) | Pre-agrupado (Arnés) |
| **12** | Canal GPIO de propósito general para control de LED (Configurable) | Pre-agrupado (Arnés) |
| **13** | Canal GPIO de propósito general para control de LED (Configurable) | Pre-agrupado (Arnés) |
| **14** | Canal GPIO de propósito general para control de LED (Configurable) | Pre-agrupado (Arnés) |
| **15** | Canal GPIO de propósito general para control de LED (Configurable) | Pre-agrupado (Arnés) |
| **16** | Canal GPIO de propósito general para control de LED (Configurable) | Pre-agrupado (Arnés) |
| **17** | Canal GPIO de propósito general para control de LED (Configurable) | Pre-agrupado (Arnés) |
| **18** | Canal GPIO de propósito general para control de LED (Configurable) | Pre-agrupado (Arnés) |
| **21** | Canal GPIO de propósito general para control de LED (Configurable) | Pre-agrupado (Arnés) |
| **35** | Canal GPIO de propósito general para control de LED (Configurable) | Pre-agrupado (Arnés) |
| **36** | Canal GPIO de propósito general para control de LED (Configurable) | Pre-agrupado (Arnés) |
| **37** | Canal GPIO de propósito general para control de LED (Configurable) | Pre-agrupado (Arnés) |
| **38** | Canal GPIO de propósito general para control de LED (Configurable) | Pre-agrupado (Arnés) |
| **39** | Canal GPIO de propósito general para control de LED (Configurable) | Pre-agrupado (Arnés) |

Para facilitar el cableado rápido, se incluye un **arnés con conectores tipo DuPont pre-agrupados** que se conectan de forma segura a las regletas de pines de la placa.

![Arnés de cables DuPont pre-agrupado y conexión directa al ESP32](/home/edgar-ld/.gemini/antigravity/brain/306cd5e2-0b76-4ebe-837f-bbecfad43c56/hardware/20260605_005048.jpg)
![ESP32 con conectores DuPont instalados](/home/edgar-ld/.gemini/antigravity/brain/306cd5e2-0b76-4ebe-837f-bbecfad43c56/hardware/20260605_005050.jpg)

---

## 5. Alimentación Eléctrica y Potencia (Esquema Crítico)

> [!IMPORTANT]
> **No conecte las tiras LED directamente a las salidas del ESP32.** 
> Los pines del ESP32 funcionan a **3.3V con un límite de corriente bajo (máx. 20-40 mA)**. Las tiras LED de neón físico suelen operar a **5V o 12V** con demandas de corriente elevadas (varios amperios).

### Reglas de Conexión Eléctrica
1. **Separación de Potencia**: Los LEDs deben ser alimentados de forma externa mediante una fuente regulada adecuada para el voltaje de sus tiras LED (5V o 12V según el caso).
2. **Interfaz de Control**: Utilice módulos intermedios de potencia, tales como **tarjetas de transistores MOSFET, relés de estado sólido o optoacopladores**. La salida del ESP32 (3.3V) activará la compuerta del transistor para permitir el paso de la corriente principal hacia los LEDs.
3. **Tierra Común (GND) Obligatoria**: Para que la señal de control del ESP32 sea interpretada correctamente por los transistores, **debe unir físicamente el pin GND (Tierra) del ESP32 con el polo negativo (GND / 0V) de la fuente de alimentación externa de los LEDs**. Sin una tierra común, las señales sufrirán ruido eléctrico y las luces parpadearán o no responderán.

<div class="schematic-diagram" style="background-color: #0f172a; border: 1.5px solid #1e293b; border-radius: 8px; padding: 25px; margin: 25px 0; font-family: 'Outfit', sans-serif; color: white; page-break-inside: avoid; text-align: center;">
  <strong style="color: #38bdf8; font-size: 11pt; text-transform: uppercase; display: block; margin-bottom: 20px;">Esquemático Electrónico Recomendado (Conmutación MOSFET Canal-N)</strong>
  
  <div style="max-width: 550px; margin: 0 auto; overflow-x: auto;">
    <svg width="550" height="280" viewBox="0 0 550 280" style="background-color: #0f172a;" xmlns="http://www.w3.org/2000/svg">
      <!-- Technical grid background -->
      <defs>
        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(51, 65, 85, 0.15)" stroke-width="1"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" />

      <!-- ESP32-S3 Module Block -->
      <rect x="30" y="70" width="110" height="140" rx="4" fill="#1e293b" stroke="#38bdf8" stroke-width="2" />
      <text x="85" y="95" font-family="sans-serif" font-size="11" font-weight="bold" fill="#38bdf8" text-anchor="middle">ESP32-S3</text>
      <text x="85" y="110" font-family="sans-serif" font-size="8" fill="#94a3b8" text-anchor="middle">(Controlador)</text>

      <!-- Pins and Labels -->
      <line x1="140" y1="130" x2="230" y2="130" stroke="#4ade80" stroke-width="2" />
      <text x="135" y="125" font-family="sans-serif" font-size="9" font-weight="bold" fill="#4ade80" text-anchor="end">GPIO Pin</text>
      <line x1="140" y1="180" x2="180" y2="180" stroke="#94a3b8" stroke-width="2" />
      <text x="135" y="175" font-family="sans-serif" font-size="9" fill="#cbd5e1" text-anchor="end">GND</text>

      <!-- 10k Pull-down Resistor (R1) -->
      <circle cx="180" cy="130" r="3" fill="#4ade80" />
      <line x1="180" y1="130" x2="180" y2="145" stroke="#4ade80" stroke-width="2" />
      <!-- Zig-zag Resistor symbol -->
      <path d="M 180 145 L 175 148 L 185 152 L 175 156 L 185 160 L 175 164 L 180 167" fill="none" stroke="#f59e0b" stroke-width="2" />
      <line x1="180" y1="167" x2="180" y2="180" stroke="#cbd5e1" stroke-width="2" />
      <circle cx="180" cy="180" r="3" fill="#cbd5e1" />
      <text x="192" y="158" font-family="sans-serif" font-size="9" font-weight="bold" fill="#f59e0b">R1 (10 kΩ)</text>

      <!-- N-Channel MOSFET Symbol -->
      <!-- Gate plate -->
      <line x1="235" y1="115" x2="235" y2="145" stroke="#cbd5e1" stroke-width="2.5" />
      <line x1="230" y1="130" x2="235" y2="130" stroke="#4ade80" stroke-width="2" />
      <!-- Channel plates -->
      <line x1="245" y1="110" x2="245" y2="120" stroke="#60a5fa" stroke-width="2.5" />
      <line x1="245" y1="125" x2="245" y2="135" stroke="#cbd5e1" stroke-width="2.5" />
      <line x1="245" y1="140" x2="245" y2="150" stroke="#cbd5e1" stroke-width="2.5" />
      <!-- Back Plate connection line -->
      <line x1="245" y1="115" x2="245" y2="145" stroke="#cbd5e1" stroke-width="1.5" stroke-dasharray="2,2" />
      
      <!-- Terminals -->
      <text x="225" y="145" font-family="sans-serif" font-size="9" fill="#cbd5e1" text-anchor="end">G</text>
      <!-- Drain (D) Connection -->
      <line x1="245" y1="115" x2="270" y2="115" stroke="#60a5fa" stroke-width="2" />
      <line x1="270" y1="115" x2="270" y2="70" stroke="#60a5fa" stroke-width="2" />
      <text x="275" y="125" font-family="sans-serif" font-size="9" fill="#60a5fa">D</text>
      <!-- Source (S) Connection -->
      <line x1="245" y1="145" x2="270" y2="145" stroke="#cbd5e1" stroke-width="2" />
      <line x1="270" y1="145" x2="270" y2="180" stroke="#cbd5e1" stroke-width="2" />
      <text x="275" y="155" font-family="sans-serif" font-size="9" fill="#cbd5e1">S</text>
      <!-- Bulk connector -->
      <line x1="245" y1="130" x2="270" y2="145" stroke="#cbd5e1" stroke-width="1.5" />
      <!-- N-channel arrow pointing in -->
      <polygon points="247,130 255,126 255,134" fill="#cbd5e1" />

      <!-- Transistor label -->
      <text x="260" y="98" font-family="sans-serif" font-size="9" font-weight="bold" fill="#38bdf8">Q1 (IRLZ44N)</text>

      <!-- External Power Supply Box -->
      <rect x="360" y="150" width="150" height="60" rx="4" fill="#3f1a0a" stroke="#ea580c" stroke-width="1.5" />
      <text x="435" y="170" font-family="sans-serif" font-size="9" font-weight="bold" fill="#ea580c" text-anchor="middle">FUENTE EXTERNA</text>
      <text x="435" y="182" font-family="sans-serif" font-size="8" fill="#94a3b8" text-anchor="middle">(5V / 12V DC)</text>
      <text x="375" y="200" font-family="sans-serif" font-size="9" font-weight="bold" fill="#ef4444">V+</text>
      <text x="495" y="200" font-family="sans-serif" font-size="9" font-weight="bold" fill="#cbd5e1" text-anchor="end">V- (GND)</text>

      <!-- LED Strip Box -->
      <rect x="360" y="30" width="150" height="60" rx="4" fill="#450a0a" stroke="#ef4444" stroke-width="1.5" />
      <text x="435" y="55" font-family="sans-serif" font-size="10" font-weight="bold" fill="#ef4444" text-anchor="middle">TIRA LED NEÓN</text>
      <text x="435" y="67" font-family="sans-serif" font-size="8" fill="#94a3b8" text-anchor="middle">(5V o 12V)</text>
      <text x="375" y="80" font-family="sans-serif" font-size="9" font-weight="bold" fill="#ef4444">+</text>
      <text x="495" y="80" font-family="sans-serif" font-size="9" font-weight="bold" fill="#60a5fa" text-anchor="end">-</text>

      <!-- Circuit Wiring Paths -->
      <!-- Positive Path: V+ to LED Anode (+) -->
      <path d="M 370 180 L 340 180 L 340 60 L 360 60" fill="none" stroke="#ef4444" stroke-width="2" />
      <!-- Negative Path: LED Cathode (-) to MOSFET Drain -->
      <line x1="510" y1="60" x2="530" y2="60" stroke="#60a5fa" stroke-width="2" />
      <line x1="530" y1="60" x2="530" y2="10" stroke="#60a5fa" stroke-width="2" />
      <line x1="530" y1="10" x2="270" y2="10" stroke="#60a5fa" stroke-width="2" />
      <line x1="270" y1="10" x2="270" y2="70" stroke="#60a5fa" stroke-width="2" />

      <!-- Common GND Path (Source to V- to ESP32 GND) -->
      <line x1="180" y1="180" x2="270" y2="180" stroke="#cbd5e1" stroke-width="2" />
      <circle cx="270" cy="180" r="3" fill="#cbd5e1" />
      <path d="M 270 180 L 270 240 L 490 240 L 490 210" fill="none" stroke="#cbd5e1" stroke-width="2" />
      <text x="380" y="255" font-family="sans-serif" font-size="9" fill="#cbd5e1" font-weight="bold" text-anchor="middle">Tierra Común (GND)</text>
    </svg>
  </div>
  
  <div style="width: 100%; margin-top: 15px; text-align: left; font-size: 8.5pt; color: #cbd5e1; background: #1e293b; padding: 12px; border-radius: 6px; border: 0.5px solid #334155; line-height: 1.45;">
    <strong style="color: #38bdf8; display: block; margin-bottom: 5px;">Explicación de las Conexiones Electrónicas:</strong>
    🟢 <strong>Línea de Control (Verde):</strong> Une la salida del ESP32 (ej. GPIO 4) con la compuerta (<code>Gate</code>) del MOSFET <code>Q1</code>. La resistencia de pull-down <code>R1</code> (10 kΩ) a tierra previene que los LEDs parpadeen durante el inicio del microcontrolador.<br>
    🔴 <strong>Línea Positiva de Potencia (Roja):</strong> Conecta directamente el voltaje positivo <code>V+</code> (5V o 12V) de la fuente externa al terminal <code>(+)</code> de la tira LED.<br>
    🔵 <strong>Línea de Conmutación de Retorno (Azul):</strong> Conecta el terminal negativo <code>(-)</code> de la tira LED al drenador (<code>Drain</code>) del MOSFET. El circuito de potencia se cierra cuando el MOSFET recibe señal lógica en Gate.<br>
    ⚫ <strong>Línea de Tierra Común (Gris):</strong> Conecta la tierra <code>GND</code> del ESP32, el polo negativo <code>V-</code> de la fuente de potencia y el surtidor (<code>Source</code>) del MOSFET. **Esta unión es indispensable para que las referencias de voltaje coincidan.**
  </div>
</div>

---

## 6. Guía de Instalación Paso a Paso

1. **Montaje del LiDAR**:
   - Atornille el sensor LiDAR firmemente en la parte superior central de la estructura de proyección utilizando los insertos roscados traseros.
   - Alinee la cara del sensor de manera que su haz barra una línea paralela al muro. La separación de montaje entre la cara con la flecha del LiDAR y el muro debe ser **2 a 3 cm menor que el diámetro de la pelota o balón de juego** que se planea utilizar. Asegure que no existan obstrucciones mecánicas en esta franja de barrido.
   - **Margen de Zona Ciega**: Fije el LiDAR de manera que el inicio superior de la cuadrícula activa del tablero de juego (ejes calibrados) quede a una **distancia libre de al menos 5 a 10 cm del sensor**, permitiendo lecturas óptimas desde el primer pixel de juego.
   
2. **Conexión LiDAR-Raspberry**:
   - Conecte el cable USB-C al sensor LiDAR.
   - Enchufe el extremo en el adaptador FTDI verde y conecte el adaptador en cualquier puerto USB de la Raspberry Pi.

3. **Instalación y Cableado del ESP32 y LEDs**:
   - Fije el módulo ESP32 cerca de la placa o caja de control de potencia.
   - Conecte el arnés de cables DuPont pre-agrupado a los pines correspondientes del ESP32.
   - Conecte cada línea de señal a la entrada del controlador de potencia correspondiente (MOSFET / Relé).
   - Cablee los polos positivos de las tiras LED a la fuente de voltaje externo (5V / 12V), y sus polos negativos a la salida del controlador.
   - **Una la tierra (GND) de la fuente de los LEDs al GND del ESP32.**
   - Alimente el ESP32 a través de su puerto USB-C (usando un eliminador estándar de 5V) o mediante los pines de alimentación (V5 / GND) conectados a la salida regulada de tu fuente de LEDs si esta cuenta con salida de 5V.

4. **Arranque del Sistema**:
   - Energice la fuente de alimentación de los LEDs.
   - Conecte el eliminador de corriente USB-C de la Raspberry Pi.
   - Espere unos 30 segundos. Verifique en su dispositivo la aparición de la red Wi-Fi `gato1` o `gato2`.
   - Conéctese al Wi-Fi e ingrese a `http://10.42.0.1:3000` en su navegador para realizar las primeras pruebas de encendido de casillas de forma digital.
