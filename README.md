# Sistema Interactivo LiDAR (Gato & Catálogo de Experiencias)

Sistema integral de detección espacial en tiempo real mediante sensores LiDAR para muros y pantallas interactivas. Permite calibrar la geometría del muro, filtrar impactos de balones u objetos (clustering DBSCAN) y proyectar tanto el juego tradicional de **Gato (Tic-Tac-Toe)** con retroalimentación física (LEDs vía MQTT / GPIO) como un **Catálogo Completo de Experiencias y Minijuegos Interactivos 2D/3D**.

---

## 🚀 Guía Rápida de Ejecución

### 1. Activar el entorno virtual e iniciar el servidor
El backend (FastAPI + Socket.IO) sirve tanto la API, la adquisición del sensor LiDAR, el panel de calibración y el catálogo interactivo:

```bash
# 1. Posicionarse en la raíz del proyecto
cd /home/edgar-ld/Documentos/Proyectos/GatoLidar

# 2. Activar el entorno virtual Python
source venv/bin/activate

# 3. Iniciar el servidor
python backend/app.py
```

> **Alternativa (Segundo Plano con PM2):**
> ```bash
> pm2 start ecosystem.config.json
> pm2 logs gato-lidar-backend
> ```

---

## 🌐 URLs y Puntos de Acceso

Una vez iniciado el servidor (por defecto en el puerto **`8000`**), abre tu navegador en:

| Sección | URL Local | URL en Red Local / Hotspot Pi |
| :--- | :--- | :--- |
| **Panel de Calibración & Gato** | `http://localhost:8000/` | `http://<IP_RPI>:8000/` |
| **Catálogo de Experiencias Interactivas** | `http://localhost:8000/catalogo/` | `http://<IP_RPI>:8000/catalogo/` |
| **Documentación de la API (Swagger)** | `http://localhost:8000/docs` | `http://<IP_RPI>:8000/docs` |

---

## 🔌 Guía de Integración para Nuevos Juegos (Web, Unity, Unreal, Godot)

Cualquier cliente externo (aplicación web, motor de videojuegos o dashboard) puede conectarse al servidor mediante **Socket.IO** y consumir los datos espaciales e impactos procesados en tiempo real.

### 1. Conexión del Cliente
* **Protocolo:** Socket.IO v4 (transports: `['websocket', 'polling']`)
* **Endpoint / URL:** `http://<IP_BACKEND>:8000` (o `ws://<IP_BACKEND>:8000/socket.io/`)
* **CORS:** Habilitado para todos los orígenes (`*`).

---

### 2. Eventos que Emite el Backend hacia los Juegos

#### A. `lidar_cluster` *(Impacto / Toque Procesado)*
Es el evento principal para dinámicas interactivas y minijuegos. Se emite cuando el algoritmo de clustering detecta un objeto o balón impactando el muro dentro de los parámetros de calibración.

```json
{
  "centroid": [1.452, 1.208],
  "points": 8,
  "radius": 0.095
}
```
* `centroid`: Array `[x, y]` con la posición física del impacto en **metros** respecto al origen inferior izquierdo del muro `(0, 0)`.
* `points`: Cantidad de reflexiones LiDAR que conforman el impacto.
* `radius`: Radio estimado del objeto en metros.
* *Nota:* Cuando el impacto finaliza o el objeto se retira, se emite `null`.

#### B. `lidar_scan` *(Nube de Puntos Cruda en el Muro)*
Transmite la totalidad de puntos detectados y limitados al área del muro para visualización, nubes de partículas o efectos de contorno.

```json
{
  "points": [
    { "x": 1.25, "y": 0.85 },
    { "x": 1.28, "y": 0.89 }
  ]
}
```
* Frecuencia regulada automáticamente a ~15 Hz para optimizar rendimiento de red y rendering.

#### C. `gameplay_event` *(Toques discretos sobre casillas)*
Útil para juegos basados en cuadrículas o botones interactivos en el muro:
```json
{
  "cell": "top_left",
  "event": "press"
}
```
* `cell`: Nombre de la celda impactada (`top_left`, `top_center`, `top_right`, `mid_left`, `center`, `mid_right`, `bottom_left`, `bottom_center`, `bottom_right`).
* `event`: `"press"` (inicio de toque) o `"release"` (liberación).

#### D. `game_state` *(Estado del Juego de Gato)*
```json
{
  "board": {
    "top_left": "X",
    "top_center": "",
    "top_right": "O",
    "mid_left": "",
    "center": "X",
    "mid_right": "",
    "bottom_left": "",
    "bottom_center": "",
    "bottom_right": "O"
  },
  "current_player": "X",
  "winner": null,
  "winning_line": null,
  "game_mode": "pvp"
}
```

---

### 3. Normalización de Coordenadas para Pantallas y Motores Gráficos

Para mapear los metros físicos del muro `(x, y)` a la resolución de pantalla de tu juego:

```text
(0, Alto del Muro)  ┌─────────────────────────┐  (Ancho del Muro, Alto del Muro)
                    │                         │
                    │      MURO FÍSICO        │
                    │   (Coordenadas en m)    │
                    │                         │
            (0, 0)  └─────────────────────────┘  (Ancho del Muro, 0)
```

#### En JavaScript / Web (Canvas / Three.js / PixiJS):
```javascript
import { io } from "socket.io-client";

const socket = io("http://localhost:8000");

// Dimensiones físicas del muro (obtenidas de /api/config o por defecto 3x3 m)
const WALL_WIDTH = 3.0;
const WALL_HEIGHT = 3.0;

socket.on("lidar_cluster", (cluster) => {
  if (!cluster || !cluster.centroid) return;

  const [xMeters, yMeters] = cluster.centroid;

  // 1. Normalizar a rango [0.0 - 1.0]
  const normX = Math.min(Math.max(xMeters / WALL_WIDTH, 0.0), 1.0);
  // Invertir Y si el origen del Canvas está en la esquina superior izquierda
  const normY = Math.min(Math.max(1.0 - (yMeters / WALL_HEIGHT), 0.0), 1.0);

  // 2. Convertir a píxeles de pantalla
  const pixelX = normX * window.innerWidth;
  const pixelY = normY * window.innerHeight;

  // 3. Ejecutar lógica de juego
  miJuego.dispararImpacto(pixelX, pixelY, cluster.radius);
});
```

#### En Unity / C# (usando paquete `SocketIOClient`):
```csharp
using UnityEngine;
using SocketIOClient;
using System;

public class LidarInputReceiver : MonoBehaviour {
    private SocketIOUnity socket;
    public float wallWidth = 3.0f;
    public float wallHeight = 3.0f;

    void Start() {
        socket = new SocketIOUnity(new Uri("http://127.0.0.1:8000"), new SocketIOOptions {
            Transport = SocketIOClient.Transport.TransportProtocol.WebSocket
        });

        socket.On("lidar_cluster", response => {
            var data = response.GetValue<ClusterData>();
            if (data != null && data.centroid != null && data.centroid.Length >= 2) {
                float normX = Mathf.Clamp01(data.centroid[0] / wallWidth);
                float normY = Mathf.Clamp01(data.centroid[1] / wallHeight);

                // Convertir a posición del mundo en cámara 2D/3D
                Vector3 screenPos = new Vector3(normX * Screen.width, normY * Screen.height, 10f);
                Vector3 worldPos = Camera.main.ScreenToWorldPoint(screenPos);

                UnityMainThreadDispatcher.Instance().Enqueue(() => {
                    InstantiateEffectAt(worldPos);
                });
            }
        });

        socket.Connect();
    }
}

[System.Serializable]
public class ClusterData {
    public float[] centroid;
    public int points;
    public float radius;
}
```

---

### 4. Endpoints REST Complementarios

| Método | Endpoint | Descripción |
| :--- | :--- | :--- |
| `GET` | `/api/config` | Obtiene los parámetros actuales de calibración (dimensiones de muro, tablero, clustering). |
| `POST` | `/api/config` | Actualiza la configuración en la base de datos SQLite y memoria RAM. |
| `GET` | `/api/game_state` | Consulta el estado actual de casillas y turno del juego Tres en Línea. |
| `POST` | `/api/mock_touch` | Simula un impacto en coordenadas `{"x": 1.5, "y": 1.5}` para pruebas sin sensor físico. |
| `POST` | `/api/game_state/reset` | Reinicia la partida activa del juego de Gato. |

---

## 🎮 Catálogo de Experiencias Interactivas

El sistema incluye experiencias prediseñadas listas para proyección:

1. **🌊 Ondas Acuáticas (*Fluid Waves*)**: Simulación hidrodinámica con propagación de ondas y síntesis de audio reactiva.
2. **🌸 Particle Bloom**: Crecimiento de flores y esporas procedimentales al impactar el muro.
3. **🌌 Nebulosa Cósmica**: Campo de atracción gravitacional de partículas estelares con audio envolvente.
4. **🌿 Jardín Vivo**: Ecosistema botánico que florece y evoluciona dinámicamente con los impactos.
5. **✨ Red de Partículas (*Constellations*)**: Red de nodos conectados por proximidad que reacciona con ondas elásticas.
6. **🦅 Bandada de Pájaros (*Boids Simulation*)**: Simulación de comportamiento de bandadas que se dispersan ante impactos.
7. **👻 Nube de Sprites**: Dinámica de partículas y entidades reactivas.
8. **🏰 Haunted Mansion (*Whac-A-Mole / Cazafantasmas*)**: Minijuego 2D con puntuación, temporizador y objetivos dinámicos.
9. **❌⭕ Gato LiDAR (*Tic-Tac-Toe*)**: Juego de Tres en Línea con control de turnos, modos PVP/CPU y enlace a hardware físico (ESP32 / LEDs).

---

## ⚙️ Estructura del Proyecto

```text
├── backend/                  # Servidor FastAPI, procesamiento espacial y drivers
│   ├── app.py                # Punto de entrada principal (FastAPI + Socket.IO)
│   ├── lidar/                # Drivers RPLIDAR C1, Lanhai LDS-50C y clustering
│   ├── spatial/              # Transformaciones polares, rotación y límites
│   ├── gameplay/             # Máquina de estados del juego Tres en Línea
│   ├── mqtt/                 # Comunicación con ESP32 / LEDs
│   ├── services/             # Control de audio del sistema y Bluetooth
│   └── static/               # Frontend compilado y catálogo de juegos
│       ├── index.html        # App React (Panel de Calibración)
│       └── catalogo/         # Experiencias interactivas HTML5/Canvas/Three.js
├── frontend/                 # Código fuente de la consola React + Vite
├── lanhai-driver/            # Driver C++ para LiDAR Lanhai LDS-50C
├── rplidarc1/                # Driver Python para LiDAR RPLIDAR C1
├── ecosystem.config.json     # Configuración de despliegue con PM2
├── manual_usuario.md         # Manual de Usuario detallado
└── manual_hardware.md        # Manual de Hardware e instalación física
```

---

## 🛠️ Desarrollo del Frontend (Opcional)

Si necesitas modificar la interfaz de la consola de calibración con recarga en caliente (Hot Reload):

```bash
cd frontend
npm run dev
```

Para generar los archivos estáticos de producción servidos por el backend:
```bash
npm run build
```
