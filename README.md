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

## 🎮 Catálogo de Experiencias Interactivas

El sistema cuenta con un catálogo de juegos y dinámicas reactivas a los toques del LiDAR (o clics de prueba en pantalla):

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
