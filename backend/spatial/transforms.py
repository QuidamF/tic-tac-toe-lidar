import math

def safe_float(val, default=0.0):
    try:
        if val == "" or val is None:
            return default
        return float(val)
    except (ValueError, TypeError):
        return default

def polar_to_cartesian(angle_deg: float, distance_m: float):
    """
    Convierte coordenadas polares (ángulo en grados, distancia en metros)
    a coordenadas cartesianas relativas al LiDAR.
    El LiDAR C1 reporta 0° al Norte (frente) y aumenta en sentido horario:
    - 0°   -> (0, d)
    - 90°  -> (d, 0)
    - 180° -> (0, -d)
    - 270° -> (-d, 0)
    """
    angle_rad = math.radians(safe_float(angle_deg))
    x = distance_m * math.sin(angle_rad)
    y = distance_m * math.cos(angle_rad)
    return x, y

def rotate_point(x: float, y: float, rotation_deg: float):
    """
    Rota un punto (x, y) alrededor de su origen por un ángulo determinado en grados.
    """
    angle_rad = math.radians(safe_float(rotation_deg))
    rx = x * math.cos(angle_rad) - y * math.sin(angle_rad)
    ry = x * math.sin(angle_rad) + y * math.cos(angle_rad)
    return rx, ry

def transform_point(x: float, y: float, config: dict):
    """
    Aplica rotación de calibración y traslación basada en la posición
    física del LiDAR en el muro para obtener coordenadas del muro (origen inferior izquierdo).
    """
    # 1. Aplicar rotación de alineación del LiDAR
    rot = safe_float(config.get("lidar_rotation"), 0.0)
    rx, ry = rotate_point(x, y, rot)
    
    # 2. Aplicar offset de posición física del LiDAR en el muro
    lx = safe_float(config.get("lidar_x"), 0.0)
    ly = safe_float(config.get("lidar_y"), 0.0)
    tx = rx + lx
    ty = ry + ly
    
    return tx, ty

def inside_board(x: float, y: float, config: dict):
    """
    Comprueba si un punto (x, y) en coordenadas del muro está dentro de los límites
    geométricos del tablero de juego.
    """
    bx = safe_float(config.get("board_x"), 0.0)
    by = safe_float(config.get("board_y"), 0.0)
    bw = safe_float(config.get("board_width"), 1.0)
    bh = safe_float(config.get("board_height"), 1.0)
    
    return (bx <= x <= bx + bw) and (by <= y <= by + bh)
