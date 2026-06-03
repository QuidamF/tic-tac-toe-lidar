import asyncio
import os
import sys
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
import socketio
import uvicorn

# Configuración de rutas para importar módulos locales en backend
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.append(CURRENT_DIR)

from api.routes import router
from socketio_server.socket_service import sio
from config.runtime import load_config_from_db, runtime_config
from mqtt.mqtt_service import connect_mqtt
from lidar.lidar_service import lidar_loop

app = FastAPI(title="Gato Lidar Server", version="2.0.0")

# Permitir CORS desde cualquier origen para testing local
app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*']
)

# Incluir los endpoints REST
app.include_router(router)

# Ruta estática para servir el frontend compilado de React
# Si la carpeta static existe, la montamos. Si no, creamos un mockup index.html para testing inicial.
STATIC_DIR = os.path.join(CURRENT_DIR, "static")
if not os.path.exists(STATIC_DIR):
    os.makedirs(STATIC_DIR)
    # Crear un index.html básico temporal para evitar errores de carga
    with open(os.path.join(STATIC_DIR, "index.html"), "w") as f:
        f.write("<h1>Gato Lidar Server Online</h1><p>Compila el frontend para ver el Dashboard aquí.</p>")

@app.get("/")
def read_root():
    """Sirve la interfaz de usuario en la ruta principal."""
    index_path = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"status": "ok", "message": "Gato Lidar Server Online"}

@app.get("/board")
def read_board():
    """Sirve la interfaz de usuario para el tablero únicamente."""
    index_path = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"status": "ok", "message": "Gato Lidar Server Online"}

# Montar los assets estáticos (JS, CSS, Imágenes)
assets_dir = os.path.join(STATIC_DIR, "assets")
if not os.path.exists(assets_dir):
    os.makedirs(assets_dir)
app.mount("/assets", StaticFiles(directory=assets_dir), name="static")

# Combinar FastAPI y Socket.IO en una sola aplicación ASGI
socket_app = socketio.ASGIApp(
    sio,
    other_asgi_app=app
)

@app.on_event('startup')
async def startup_event():
    print("[SERVER] Arrancando servicios del backend...")
    
    # 1. Cargar configuración de SQLite a RAM
    config = load_config_from_db()
    
    # 2. Inicializar conexión MQTT (de fondo)
    connect_mqtt(config)
    
    # 3. Lanzar el bucle principal de adquisición y procesamiento del LiDAR
    asyncio.create_task(lidar_loop())
    
    # 4. Restablecer la salida de audio predeterminada si está configurada
    default_sink = config.get("default_audio_sink", "")
    if default_sink:
        print(f"[AUDIO] Restableciendo salida de audio predeterminada: {default_sink}")
        from services.bluetooth_audio import set_default_sink
        asyncio.create_task(set_default_sink(default_sink))
        
    print("[SERVER] Tareas de segundo plano iniciadas correctamente.")

@app.on_event('shutdown')
def shutdown_event():
    print("[SERVER] Apagando servicios del backend...")
    from lidar.lidar_service import shutdown_lidar
    shutdown_lidar()

if __name__ == '__main__':
    # Arrancar servidor ASGI local en el puerto 8000
    uvicorn.run(
        socket_app,
        host='0.0.0.0',
        port=8000
    )
