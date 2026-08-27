# Manual de Usuario - Gato LiDAR (Consola de Control, Calibración y Juego)

Este manual describe el funcionamiento, calibración y configuración de la consola web del proyecto **Gato LiDAR**, un sistema interactivo de juego "Tres en Línea" (Tic-Tac-Toe) basado en detección de impactos de balón mediante sensores LiDAR.

---

## 1. Acceso al Sistema
La consola web se ejecuta en un servidor local dentro de la Raspberry Pi. Para acceder a la interfaz de administración y calibración, siga los siguientes pasos:

1. **Conexión al Hotspot de la Raspberry Pi**:
   - Busque redes Wi-Fi disponibles desde su dispositivo (computadora, tablet o smartphone).
   - Conéctese a la red con SSID: **`gato1`** o **`gato2`** (el nombre de la red dependerá de cuál paquete/kit del sistema esté utilizando; esta variación en el nombre previene conflictos de red e interferencias en caso de que existan múltiples sistemas operando en el mismo espacio).
   - Esta red **no requiere contraseña**.

2. **Acceso Web**:
   - Abra cualquier navegador web e ingrese a la siguiente dirección IP y puerto:
     ```
     http://10.42.0.1:3000
     ```

---

## 2. Consola de Control (Vista General)
Una vez dentro del sistema, se presentará el Dashboard de administración. Este panel unificado permite configurar el hardware, ajustar la lógica de juego y visualizar los datos espaciales.

![Dashboard Principal de Control del Gato LiDAR](/home/edgar-ld/.gemini/antigravity/brain/306cd5e2-0b76-4ebe-837f-bbecfad43c56/gameplay_dashboard_1780761912558.png)

La interfaz se compone de tres paneles:
- **Panel de Configuración (Izquierda)**: Ajustes técnicos del sistema divididos por pestañas (LiDAR, Reglas y Audio).
- **Preview Canvas / Visualizador LiDAR (Centro)**: Renderizado en tiempo real de los datos del sensor y el área delimitada para el tablero.
- **Sección de Gameplay / Simulación del Gato (Derecha)**: Representación visual del estado del juego en tiempo real con controles para simulación y reinicio rápido.

---

## 3. Configuración Detallada del LiDAR
La pestaña **LiDAR** es la sección más compleja del sistema, ya que controla la calibración geométrica y la interfaz física. Se subdivide en las siguientes áreas de ajuste:

### 3.1. Posición y Calibración del LiDAR
Ajusta la posición del sensor con respecto a la pantalla de juego:
- **LiDAR X / Y**: Coordenadas físicas en metros para ubicar el centro del sensor sobre la pared de proyección.
- **Rotación**: Alinea la orientación angular del sensor en grados para corregir desviaciones físicas de montaje.
- **Ángulos de Observación (Min / Max)**: Delimita la ventana angular en la que el LiDAR buscará impactos de balón, ignorando lecturas fuera del área objetivo (ej. rebotes de fondo o de paredes laterales).

![Ajustes de Posición, Ángulos y Límites de Calibración](/home/edgar-ld/.gemini/antigravity/brain/306cd5e2-0b76-4ebe-837f-bbecfad43c56/lidar_seccion_calibracion_1780761782702.png)

---

### 3.2. Setpoints de Muro y Tablero
Define los límites cartesianos de la zona de juego:
- **Dimensiones de Muro**: Ancho y alto del muro físico de proyección (en metros).
- **Dimensiones de Tablero**: Ancho, alto y coordenadas de inicio (X, Y) del marco del juego Tres en Línea dentro del muro. Estos setpoints delimitan dónde el sistema buscará los toques válidos para marcar las casillas.

![Configuración de Dimensiones y Filtros de Agrupamiento (Clustering)](/home/edgar-ld/.gemini/antigravity/brain/306cd5e2-0b76-4ebe-837f-bbecfad43c56/lidar_seccion_muro_y_filtros_1780761792394.png)

---

### 3.3. Filtros del Balón (Clustering)
Configura el algoritmo DBSCAN para distinguir el balón de otros objetos o ruidos espaciales:
- **Puntos Mínimos / Máximos**: Determina cuántos puntos reflejados por el sensor se necesitan para confirmar que se trata del balón.
- **Radio Esperado y Distancia Máxima**: Define la geometría del objeto agrupado para validar que corresponde al tamaño real del balón.
- **Cooldown Antirrebote (ms)**: Tiempo muerto de protección tras registrar un tiro, evitando que vibraciones secundarias o el rebote inmediato del balón se interpreten como tiros adicionales en el mismo o en otro turno.

---

### 3.4. Comunicación MQTT (ESP32)
Configura los parámetros de comunicación inalámbrica con el módulo ESP32 que controla la iluminación física de la pantalla:
- **Broker IP / Host y Puerto**: Dirección de red del servidor Mosquitto que canaliza la comunicación.

---

### 3.5. Mapeos de Pines GPIO (LEDs Físicos)
Permite definir los números de pin físicos GPIO asociados a cada una de las 9 casillas del tablero:
- **Toque**: Pin que se activa al presionar la celda.
- **Ficha X / Ficha O**: Pines asignados para la iluminación física neon correspondiente a la marca de cada jugador en cada una de las casillas.
- **GPIO Turno X / O**: Pines asignados para indicar de forma física a qué jugador le corresponde realizar el tiro activo.

![Parámetros de Broker MQTT y Mapeo GPIO para Leds Físicos](/home/edgar-ld/.gemini/antigravity/brain/306cd5e2-0b76-4ebe-837f-bbecfad43c56/lidar_seccion_mqtt_y_gpio_1780761801785.png)

---

## 4. Reglas y Lógica de Juego
En la pestaña **Reglas**, se definen las variantes de comportamiento de la partida:

![Pestaña de Ajustes y Modos de Juego](/home/edgar-ld/.gemini/antigravity/brain/306cd5e2-0b76-4ebe-837f-bbecfad43c56/seccion_reglas_juego_1780761844316.png)

- **Modo de Juego**: 
  - `👥 Jugador vs Jugador (PVP)`: Juego tradicional de dos competidores físicos alternando turnos.
  - `🤖 Jugador vs CPU (PVCPU)`: El sistema simula la jugada del contrincante "O" tras detectar el tiro del jugador "X".
- **Límite de Tiempo de Partida**: Si se activa, la partida tiene un límite global de juego. Si finaliza el tiempo y no hay un Tres en Línea tradicional, gana el jugador que posea mayor cantidad de casillas marcadas.
- **Re-inicio Automático**: Cooldown en segundos entre el término de una partida y la limpieza automática del tablero físico e interfaz.
- **Intento por Turno**:
  - *Cambio de turno libre*: El jugador puede lanzar varias veces si su disparo cae fuera de las casillas válidas.
  - *Solo 1 intento por turno*: Cualquier tiro fallido o en celda ocupada consume el intento, pasando el turno de inmediato al oponente.
- **Permitir Robar Casilla**: Habilita la regla dinámica de juego donde un tiro preciso sobre una casilla ocupada por el rival le quita la pertenencia y la reasigna al jugador actual.

---

## 5. Control de Audio y Bluetooth
La pestaña **Audio** gestiona los canales de retroalimentación sonora para los efectos de juego:

![Sección de Audio y Enlace Bluetooth](/home/edgar-ld/.gemini/antigravity/brain/306cd5e2-0b76-4ebe-837f-bbecfad43c56/seccion_audio_bluetooth_1780761854366.png)

- **Salida de Audio Principal**: Permite seleccionar entre los canales disponibles en el sistema de la Raspberry Pi (ej. HDMI, tarjeta de sonido USB o periféricos Bluetooth enlazados).
- **Probar Audio**: Envía un tono de prueba inmediato al canal seleccionado para validar el nivel de volumen.
- **Volumen del Sistema**: Control deslizante para el volumen maestro.
- **Periféricos Bluetooth**: Escanea, vincula y conecta altavoces o diademas Bluetooth sin necesidad de acceder a la consola del sistema operativo.

---

## 6. Sección de Visualización y Simulación (Preview y Gameplay)
El Dashboard contiene dos herramientas visuales de gran utilidad durante el despliegue del sistema:

### 6.1. Preview Canvas (Calibración Espacial)
En la parte central, la nube de puntos se dibuja en tiempo real. Esto permite:
1. Validar que la posición y rotación del sensor estén alineadas con el muro físico.
2. Identificar zonas de ruido o falsos positivos (puntos que aparecen fuera del área de juego).
3. Monitorear el centroide del impacto detectado del balón (representado con un círculo y radio dinámico).

### 6.2. Sección de Gameplay (Tablero Gato)
En la parte derecha se muestra el estado digital del juego.
- Permite forzar o **simular toques** haciendo clic directo sobre cualquiera de las 9 casillas en la interfaz, facilitando el desarrollo y las pruebas de iluminación de LEDs físicos (MQTT) sin necesidad de impactar físicamente el muro con un balón.
- Muestra de forma interactiva la ficha colocada ("X" o "O"), el turno actual en la cabecera y resalta en rojo la combinación ganadora al terminar la partida.
