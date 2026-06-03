from persistence.sqlite_manager import initialize_db, get_all_settings, save_setting

# Caché en RAM de la configuración activa
runtime_config = {}

# Configuración por defecto
DEFAULT_CONFIG = {
    # LiDAR
    "lidar_port": "/dev/ttyUSB0",
    "lidar_baudrate": 460800,
    "lidar_x": 1.5,                 # metros (centro horizontal del muro de 3m)
    "lidar_y": 3.0,                 # metros (altura del LiDAR)
    "lidar_rotation": 180.0,        # grados (orientación física)
    "observation_angle_min": -70.0, # grados límite izquierdo
    "observation_angle_max": 70.0,  # grados límite derecho

    # Muro
    "wall_width": 3.0,              # metros de ancho del muro físico
    "wall_height": 3.0,             # metros de alto del muro físico

    # Tablero
    "board_x": 0.3,                 # metros (borde izquierdo desde origen muro)
    "board_y": 0.3,                 # metros (borde inferior desde el suelo)
    "board_width": 2.4,             # metros de ancho
    "board_height": 2.4,            # metros de alto
    "board_rows": 3,
    "board_cols": 3,

    # Clustering / Detección
    "cluster_min_points": 3,
    "cluster_max_points": 40,
    "expected_cluster_radius": 0.10, # metros
    "cluster_max_dist": 0.15,        # metros de tolerancia entre puntos
    "cooldown_ms": 700,             # milisegundos de cooldown post-tiro

    # MQTT
    "mqtt_broker": "192.168.0.50",
    "mqtt_port": 1883,

    # Audio
    "default_audio_sink": "",

    # Mapeos GPIO de las celdas (para el impacto/toque activo del ESP32)
    "gpio_top_left": -1,
    "gpio_top_center": -1,
    "gpio_top_right": -1,
    "gpio_mid_left": -1,
    "gpio_center": -1,
    "gpio_mid_right": -1,
    "gpio_bottom_left": -1,
    "gpio_bottom_center": -1,
    "gpio_bottom_right": -1,

    # Mapeos GPIO de las celdas para ficha X (fichas permanentes)
    "gpio_top_left_x": 4,
    "gpio_top_center_x": 5,
    "gpio_top_right_x": 18,
    "gpio_mid_left_x": 11,
    "gpio_center_x": 13,
    "gpio_mid_right_x": 14,
    "gpio_bottom_left_x": 46,
    "gpio_bottom_center_x": 47,
    "gpio_bottom_right_x": 48,

    # Mapeos GPIO de las celdas para ficha O (fichas permanentes)
    "gpio_top_left_o": -1,
    "gpio_top_center_o": -1,
    "gpio_top_right_o": -1,
    "gpio_mid_left_o": -1,
    "gpio_center_o": -1,
    "gpio_mid_right_o": -1,
    "gpio_bottom_left_o": -1,
    "gpio_bottom_center_o": -1,
    "gpio_bottom_right_o": -1
}

def cast_value(val_str: str):
    """Convierte un valor de cadena a su tipo correspondiente (int, float, bool o str)."""
    # Intentar como entero
    try:
        return int(val_str)
    except ValueError:
        pass
    
    # Intentar como float
    try:
        return float(val_str)
    except ValueError:
        pass
    
    # Intentar como booleano
    if val_str.lower() == "true":
        return True
    if val_str.lower() == "false":
        return False
        
    # Queda como cadena
    return val_str

def load_config_from_db():
    """
    Carga todos los parámetros desde SQLite a la caché en RAM (runtime_config).
    Si faltan parámetros por defecto en la base de datos, los inicializa y los guarda.
    """
    global runtime_config
    
    # Asegurar que la base de datos y la tabla existan
    initialize_db()
    
    # Leer todas las configuraciones persistidas
    db_rows = get_all_settings()
    db_settings = {k: cast_value(v) for k, v in db_rows}
    
    # Migrar valores por defecto obsoletos en la BD para mejorar la experiencia inmediatamente
    if db_settings.get("cluster_min_points") == 5:
        db_settings["cluster_min_points"] = 3
        save_setting("cluster_min_points", "3")
    if db_settings.get("cooldown_ms") == 1500:
        db_settings["cooldown_ms"] = 700
        save_setting("cooldown_ms", "700")
        
    # Rellenar la RAM con los valores por defecto si no existen
    updated_db = False
    runtime_config.clear()
    
    for key, default_val in DEFAULT_CONFIG.items():
        if key in db_settings:
            runtime_config[key] = db_settings[key]
        else:
            runtime_config[key] = default_val
            save_setting(key, str(default_val))
            updated_db = True
            
    if updated_db:
        print("[CONFIG] Se agregaron parámetros por defecto faltantes en la base de datos.")
    else:
        print("[CONFIG] Configuración cargada con éxito desde SQLite a RAM.")
        
    return runtime_config

def update_runtime_config(new_settings: dict):
    """
    Actualiza la configuración en caliente (RAM) y persiste los cambios
    en la base de datos SQLite (doble escritura).
    """
    global runtime_config
    for key, val in new_settings.items():
        # Actualizar RAM
        runtime_config[key] = cast_value(str(val))
        # Actualizar SQLite
        save_setting(key, str(val))
    print(f"[CONFIG] Parámetros actualizados en caliente: {list(new_settings.keys())}")
    return runtime_config
