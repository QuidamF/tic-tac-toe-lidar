# Manual de Usuario - Sistema Interactivo LiDAR (Consola de Calibración & Catálogo de Juegos)

Este manual describe el funcionamiento, calibración y uso del **Sistema Interactivo LiDAR**, una plataforma multisensorial de detección de impactos espaciales en muros y pantallas interactivas mediante sensores LiDAR. La plataforma integra una **Consola de Calibración y Control**, el juego tradicional de **Gato LiDAR (Tres en Línea)** con soporte de hardware físico (LEDs y ESP32) y un **Catálogo Completo de Experiencias y Minijuegos Interactivos 2D/3D**.

---

## 1. Inicio y Ejecución del Sistema

El sistema cuenta con un backend centralizado desarrollado en **FastAPI y Python-SocketIO** que gestiona la adquisición del sensor LiDAR, el procesamiento espacial, la lógica de juego y el servidor web unificado.

### 1.1. Ejecución Manual (Línea de Comandos)
Para iniciar el servidor en primer plano desde la terminal:

```bash
# 1. Abrir terminal y dirigirse al directorio del proyecto
cd /home/edgar-ld/Documentos/Proyectos/GatoLidar

# 2. Activar el entorno virtual de Python
source venv/bin/activate

# 3. Iniciar el servidor central
python backend/app.py
```

### 1.2. Ejecución Automática en Segundo Plano (PM2)
En entornos de producción o instalación fija (ej. Raspberry Pi en muro interactivo), el servidor puede gestionarse con **PM2**:

```bash
# Iniciar servicio en segundo plano
pm2 start ecosystem.config.json

# Ver logs en tiempo real
pm2 logs gato-lidar-backend

# Reiniciar o detener el servicio
pm2 restart gato-lidar-backend
pm2 stop gato-lidar-backend
```

---

## 2. Acceso a la Plataforma Web

Una vez que el servidor se encuentra en ejecución, está disponible en el puerto **`8000`**.

### 2.1. Conexión de Red
- **Desde la misma computadora:** Acceda directamente a `http://localhost:8000`.
- **Desde una red local o Hotspot de la Raspberry Pi:** 
  - Conéctese a la red Wi-Fi de la Raspberry Pi (SSID típico: `gato1` o `gato2`) o a la misma red local.
  - Ingrese en el navegador a: `http://<IP_DE_LA_RASPBERRY>:8000` (ejemplo: `http://10.42.0.1:8000` o `http://192.168.0.X:8000`).

### 2.2. Mapa de Rutas y Módulos

| URL | Módulo | Descripción |
| :--- | :--- | :--- |
| **`http://<IP>:8000/`** | **Consola de Calibración & Gato** | Panel de administración de hardware, parámetros espaciales y juego Tres en Línea. |
| **`http://<IP>:8000/catalogo/`** | **Catálogo de Experiencias** | Galería interactiva con dinámicas de partículas, fluidos y juegos 2D/3D para proyección. |
| **`http://<IP>:8000/docs`** | **API REST (Swagger)** | Documentación interactiva para consulta y modificación de estado por HTTP. |

---

## 3. Catálogo de Experiencias y Juegos Interactivos (`/catalogo`)

El Catálogo de Experiencias está diseñado para proyectores de gran formato o muros LED. Al recibir impactos o toques detectados por el LiDAR (o clics de ratón en pruebas), las experiencias reaccionan en tiempo real con animaciones fluidas y síntesis de audio procedural.

```text
                                  ┌──────────────────────────┐
                                  │   CATÁLOGO INTERACTIVO   │
                                  │  (http://<IP>:8000/catalogo)│
                                  └─────────────┬────────────┘
                                                │
         ┌──────────────────┬───────────────────┼───────────────────┬──────────────────┐
         ▼                  ▼                   ▼                   ▼                  ▼
  🌊 Ondas Acuáticas   🌸 Particle Bloom   🌌 Nebulosa Cósmica  🌿 Jardín Vivo   🏰 Haunted Mansion
 (Fluido + Audio)     (Esporas botánicas) (Vórtices estelares) (Botánica viva)    (Cazafantasmas 2D)
```

### 3.1. Experiencias Disponibles
1. **🌊 Ondas Acuáticas (*Fluid Waves*)**: Simulación hidrodinámica reactiva donde cada impacto sobre el muro genera ondas con dispersión física y tonos armónicos acuáticos.
2. **🌸 Particle Bloom**: Generación de flores y esporas reactivas. Las partículas se desplazan y florecen con patrones dinámicos de color.
3. **🌌 Nebulosa Cósmica**: Campo de partículas espaciales gobernadas por gravedad y turbulencia que interactúan con los puntos de contacto.
4. **🌿 Jardín Vivo**: Ecosistema botánico donde los impactos estimulan el crecimiento de tallos, pétalos y hojas que evolucionan continuamente.
5. **✨ Red de Partículas (*Constellations*)**: Nodos interconectados por resortes virtuales elásticos que se agitan al recibir impactos.
6. **🦅 Bandada de Pájaros (*Boids*)**: Simulación de bandadas que vuelan en armonía y se dispersan rápidamente ante la presencia de un impacto.
7. **👻 Nube de Sprites**: Sistema de entidades gráficas con comportamientos de persecución y dispersión.
8. **🏰 Haunted Mansion (*Cazafantasmas / Whac-A-Mole*)**: Minijuego interactivo 2D donde aparecen fantasmas en ventanas y puertas. Los jugadores deben golpearlos para sumar puntos antes de que se agote el tiempo.

### 3.2. Controles en Pantalla
- **Selector de Experiencia:** Menú flotante para cambiar de dinámica rápidamente.
- **Pantalla Completa:** Botón para ocultar barras de navegación y optimizar la salida al proyector.
- **Modo Debug / Puntero:** Muestra los puntos de impacto detectados por el LiDAR en tiempo real.

---

## 4. Consola de Calibración y Control (`/`)

La Consola Principal permite afinar la respuesta del sensor LiDAR a la geometría física del muro y gestionar el juego Tres en Línea.

### 4.1. Configuración Geométrica del LiDAR
- **LiDAR X / Y (m):** Posición del sensor (en metros) respecto a la esquina inferior izquierda del muro de proyección.
- **Rotación (°):** Ángulo de corrección para compensar inclinaciones físicas del sensor al estar montado.
- **Ángulos de Observación (Min / Max):** Ventana angular activa (en grados). Todo punto reflejado fuera de este rango es descartado inmediatamente, evitando detectar personas en los costados o mobiliario circundante.

### 4.2. Dimensiones del Muro y Tablero Interactivo
- **Ancho y Alto de Muro (m):** Dimensiones físicas totales del área de proyección.
- **Posición X / Y del Tablero (m):** Coordenadas de inicio del área activa de juego.
- **Ancho y Alto del Tablero (m):** Tamaño del marco interactivo del Tres en Línea.
- **Interruptor "📐 Ver Tablero":** Muestra u oculta la cuadrícula de juego en el visualizador 2D en tiempo real.

### 4.3. Filtros de Detección de Balón (Clustering)
- **Puntos Mínimos / Máximos:** Rango de puntos que debe reflejar el balón para considerarse un toque válido (ignora reflejos aislados por polvo o manos de paso rápido).
- **Distancia Máxima de Agrupamiento (`cluster_max_dist`):** Distancia máxima en metros entre puntos adyacentes para formar un grupo único.
- **Radio Esperado y Tolerancia:** Radio geométrico del objeto (ej. balón de fútbol ~0.11 m) para validar su silueta y calcular el centroide exacto de impacto.
- **Cooldown Antirrebote (ms):** Tiempo muerto tras un impacto para evitar disparos múltiples accidentales debido al rebote del balón.

### 4.4. Audio y Periféricos Bluetooth
- **Selector de Salida:** Permite alternar entre HDMI, altavoces integrados, tarjetas USB y altavoces Bluetooth.
- **Control de Volumen:** Ajuste maestro del nivel de sonido del sistema.
- **Gestor Bluetooth:** Escaneo y emparejamiento directo de bocinas inalámbricas desde la interfaz web.

---

## 5. Dinámica de Juego: Gato LiDAR (Tres en Línea)

El módulo de juego de Gato permite tanto partidas recreativas simples como torneos interactivos con retroalimentación lumínica.

### 5.1. Modos y Reglas
- **Modo de Juego:**
  - `👥 Jugador vs Jugador (PVP)`: Dos jugadores alternan lanzamientos en el muro físico.
  - `🤖 Jugador vs CPU (PVCPU)`: El sistema responde automáticamente con jugadas estratégicas.
- **Intento por Turno:**
  - *Libre:* El jugador puede seguir lanzando hasta acertar en una casilla válida.
  - *1 Intento:* Fallar el tiro o golpear una casilla no permitida pasa el turno inmediatamente.
- **Robo de Casilla:** Permite capturar una casilla del contrincante al impactarla directamente.
- **Límite de Tiempo:** Finaliza la partida tras un tiempo límite, coronando a quien domine más casillas.

### 5.2. Mapeo de Hardware y Luces LED (MQTT / ESP32)
- **Broker MQTT:** Dirección y puerto del broker Mosquitto que sincroniza el estado de las 9 casillas.
- **Mapeo de Pines GPIO:** Asignación individual de pines para la animación de toque, luces de turno y marcas de jugador (`X` y `O`) en cada celda física.

---

## 6. Solución de Problemas Frecuentes

| Síntoma | Causa Posible | Solución |
| :--- | :--- | :--- |
| **No se detectan impactos en el muro** | El sensor no está conectado o el puerto serial cambió. | Verifique que el cable USB esté conectado y revise si el dispositivo aparece en `/dev/ttyUSB0`. |
| **Puntos fantasma o fuera del muro** | Ángulo de observación demasiado amplio o reflejos de pared lateral. | Reduzca los límites de `Ángulo Mínimo` y `Ángulo Máximo` en el panel de calibración. |
| **El balón no registra toque** | El parámetro de `Puntos Mínimos` es demasiado alto. | Reduzca `Puntos Mínimos` a 2 o 3 y aumente ligeramente `cluster_max_dist`. |
| **Doble toque inmediato al lanzar** | Cooldown antirrebote muy bajo. | Incremente el tiempo de `Cooldown Antirrebote` a 600 ms o superior. |
| **Sin sonido en las experiencias** | El navegador bloqueó el autoplay o el dispositivo de audio está apagado. | Haga clic en cualquier parte de la pantalla para activar el contexto de Web Audio y revise la pestaña de Audio en la consola. |

---

## 7. Guía para Desarrolladores: Integración de Nuevos Juegos

Cualquier aplicación externa (HTML5 Canvas, Three.js, Unity, Unreal Engine, Godot, TouchDesigner) puede conectarse al servidor mediante **Socket.IO** en `http://<IP_HOST>:8000` para recibir eventos de interacción espacial en tiempo real.

### 7.1. Eventos y Estructura de Datos (Payloads)

#### A. Evento `lidar_cluster` (Detección de Impacto de Balón u Objeto)
Es el canal principal para minijuegos interactivos. Emite las coordenadas del centroide de impacto ya calibradas en metros respecto a la esquina inferior izquierda del muro:

```json
{
  "centroid": [1.452, 1.208],
  "points": 8,
  "radius": 0.095
}
```

* **`centroid`**: `[x, y]` en **metros**.
  * `x`: Posición horizontal (de `0.0` a `wall_width`).
  * `y`: Posición vertical (de `0.0` a `wall_height`).
* **`points`**: Cantidad de haces láser reflejados por el objeto.
* **`radius`**: Radio estimado del impacto en metros.
* **`null`**: Se envía cuando el objeto se retira o se extingue el contacto.

#### B. Evento `lidar_scan` (Nube de Puntos Completa en Muro)
Emisión a ~15 Hz de todos los puntos dentro del área de observación para visualización o efectos continuos de partículas:

```json
{
  "points": [
    { "x": 1.25, "y": 0.85 },
    { "x": 1.28, "y": 0.89 }
  ]
}
```

#### C. Evento `gameplay_event` (Pulsación de Casillas)
```json
{
  "cell": "top_left",
  "event": "press"
}
```
* `cell`: Nombre de la casilla (`top_left`, `center`, `bottom_right`, etc.).
* `event`: `"press"` o `"release"`.

### 7.2. Conversión a Píxeles de Pantalla (Canvas / Web)
```javascript
// Coordenadas normalizadas [0.0 - 1.0]
const normX = cluster.centroid[0] / config.wall_width;
const normY = 1.0 - (cluster.centroid[1] / config.wall_height); // Invertir si Y crece hacia abajo

// Mapeo a resolución de pantalla
const screenX = normX * window.innerWidth;
const screenY = normY * window.innerHeight;
```

