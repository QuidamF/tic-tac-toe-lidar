from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from config.runtime import runtime_config, update_runtime_config
from lidar.lidar_service import trigger_mock_touch, game, use_mock, cancel_winning_animation, reset_game_state_service
from socketio_server.socket_service import emit_game_state
from mqtt.mqtt_service import publish_game_state
import services.bluetooth_audio as bt_audio

router = APIRouter(prefix="/api")


class ConfigUpdateRequest(BaseModel):
    # LiDAR
    lidar_port: str = None
    lidar_baudrate: int = None
    lidar_x: float = None
    lidar_y: float = None
    lidar_rotation: float = None
    observation_angle_min: float = None
    observation_angle_max: float = None
    
    # Muro
    wall_width: float = None
    wall_height: float = None

    # Tablero
    board_x: float = None
    board_y: float = None
    board_width: float = None
    board_height: float = None
    board_rows: int = None
    board_cols: int = None
    
    # Clustering
    cluster_min_points: int = None
    cluster_max_points: int = None
    expected_cluster_radius: float = None
    cluster_max_dist: float = None
    cooldown_ms: int = None
    
    # MQTT
    mqtt_broker: str = None
    mqtt_port: int = None
    
    # GPIOs (Active Touch/Interruption)
    gpio_top_left: int = None
    gpio_top_center: int = None
    gpio_top_right: int = None
    gpio_mid_left: int = None
    gpio_center: int = None
    gpio_mid_right: int = None
    gpio_bottom_left: int = None
    gpio_bottom_center: int = None
    gpio_bottom_right: int = None

    # GPIOs (Player X Permanent Markers)
    gpio_top_left_x: int = None
    gpio_top_center_x: int = None
    gpio_top_right_x: int = None
    gpio_mid_left_x: int = None
    gpio_center_x: int = None
    gpio_mid_right_x: int = None
    gpio_bottom_left_x: int = None
    gpio_bottom_center_x: int = None
    gpio_bottom_right_x: int = None

    # GPIOs (Player O Permanent Markers)
    gpio_top_left_o: int = None
    gpio_top_center_o: int = None
    gpio_top_right_o: int = None
    gpio_mid_left_o: int = None
    gpio_center_o: int = None
    gpio_mid_right_o: int = None
    gpio_bottom_left_o: int = None
    gpio_bottom_center_o: int = None
    gpio_bottom_right_o: int = None

    # Gameplay
    game_mode: str = None
    time_limit_enabled: bool = None
    time_limit_seconds: int = None
    single_attempt_mode: bool = None
    steal_enabled: bool = None

class MockTouchRequest(BaseModel):
    x: float
    y: float

@router.get("/config")
def get_config():
    """Retorna la configuración cargada en RAM en caliente."""
    return runtime_config

@router.get("/game_state")
def get_game_state():
    """Retorna el estado de la partida actual."""
    return {
        "board": game.board,
        "current_player": game.current_player,
        "winner": game.winner,
        "winning_line": game.winning_line
    }

@router.post("/config")
async def update_config(data: ConfigUpdateRequest):
    """Actualiza los parámetros en RAM y los persiste en SQLite."""
    # Filtrar solo campos no nulos enviados por el usuario
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No se enviaron campos válidos para actualizar.")
        
    updated = update_runtime_config(update_data)
    
    # Si cambió la configuración del temporizador o modo, aplicar los cambios en caliente
    if "time_limit_enabled" in update_data or "time_limit_seconds" in update_data:
        from lidar.lidar_service import start_game_timer, game_timer_task, game_timer_start_time
        if updated.get("time_limit_enabled", False):
            if game_timer_start_time > 0.0:
                start_game_timer()
        else:
            if game_timer_task and not game_timer_task.done():
                game_timer_task.cancel()
                
    if "game_mode" in update_data:
        from lidar.lidar_service import trigger_cpu_move_if_needed
        trigger_cpu_move_if_needed()
        
    return updated

@router.post("/mock_touch")
def mock_touch(data: MockTouchRequest):
    """Inyecta una interacción de prueba (simulación)."""
    trigger_mock_touch(data.x, data.y)
    return {"status": "ok", "message": f"Toque simulado en ({data.x}, {data.y})"}

@router.post("/reset")
async def reset_game():
    """Reinicia la partida actual de Tic Tac Toe."""
    reset_game_state_service()
    
    # Notificar reinicio al frontend via Websocket
    await emit_game_state({
        "board": game.board,
        "current_player": game.current_player,
        "winner": game.winner,
        "winning_line": game.winning_line
    })
    
    # Notificar al ESP32 a través de MQTT (apaga todos los LEDs físicos)
    publish_game_state("reset", {"status": "cleared"})
    
    # E iniciar el LED de turno para el primer jugador
    from lidar.lidar_service import publish_turn_leds
    publish_turn_leds(game.current_player, game.winner, runtime_config)
    
    return {"status": "ok", "message": "Juego de gato reiniciado."}

@router.post("/calibrate")
def run_calibration():
    """Inicia calibración del muro (en esta versión, retorna estado del LiDAR)."""
    return {
        "status": "ok",
        "lidar_active": not use_mock,
        "mode": "simulation" if use_mock else "physical"
    }

# --- ENDPOINTS BLUETOOTH Y AUDIO ---

class BluetoothDeviceRequest(BaseModel):
    mac: str

class AudioSinkRequest(BaseModel):
    sink_name: str

class AudioVolumeRequest(BaseModel):
    level: int

@router.get("/bluetooth/devices")
async def get_bluetooth_devices():
    """Retorna la lista de dispositivos Bluetooth conocidos/vinculados."""
    devices = await bt_audio.list_devices()
    return devices

@router.post("/bluetooth/scan")
async def scan_bluetooth_devices():
    """Escanea dispositivos Bluetooth por 3s y los retorna."""
    devices = await bt_audio.scan_devices()
    return devices

@router.post("/bluetooth/connect")
async def connect_bluetooth_device(req: BluetoothDeviceRequest):
    """Vincula (si es necesario) y conecta un periférico Bluetooth."""
    res = await bt_audio.connect_device(req.mac)
    if not res["success"]:
        raise HTTPException(status_code=400, detail=res["message"])
    return res

@router.post("/bluetooth/disconnect")
async def disconnect_bluetooth_device(req: BluetoothDeviceRequest):
    """Desconecta un periférico Bluetooth."""
    res = await bt_audio.disconnect_device(req.mac)
    if not res["success"]:
        raise HTTPException(status_code=400, detail=res["message"])
    return res

@router.post("/bluetooth/remove")
async def remove_bluetooth_device(req: BluetoothDeviceRequest):
    """Olvida/desvincula un periférico Bluetooth."""
    res = await bt_audio.remove_device(req.mac)
    if not res["success"]:
        raise HTTPException(status_code=400, detail=res["message"])
    return res

@router.get("/audio/sinks")
async def get_audio_sinks():
    """Retorna todas las salidas de audio disponibles y la por defecto."""
    sinks_info = await bt_audio.list_sinks()
    return sinks_info

@router.post("/audio/default-sink")
async def set_default_sink(req: AudioSinkRequest):
    """Configura la salida de audio por defecto y la persiste en SQLite."""
    res = await bt_audio.set_default_sink(req.sink_name)
    if not res["success"]:
        raise HTTPException(status_code=400, detail=res["message"])
    
    # Persistir en SQLite y RAM para recordar al reiniciar
    update_runtime_config({"default_audio_sink": req.sink_name})
    return res

@router.get("/audio/volume")
async def get_audio_volume():
    """Retorna el volumen actual del sistema (0-100)."""
    vol = await bt_audio.get_volume()
    return {"level": vol}

@router.post("/audio/volume")
async def set_audio_volume(req: AudioVolumeRequest):
    """Ajusta el volumen general del sistema."""
    res = await bt_audio.set_volume(req.level)
    if not res["success"]:
        raise HTTPException(status_code=400, detail=res["message"])
    return res

@router.post("/audio/test-sound")
async def play_audio_test_sound():
    """Reproduce un archivo wav de prueba en el backend."""
    res = await bt_audio.play_test_sound()
    if not res["success"]:
        raise HTTPException(status_code=500, detail=res["message"])
    return res
