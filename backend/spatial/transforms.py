import math

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
    angle_rad = math.radians(angle_deg)
    x = distance_m * math.sin(angle_rad)
    y = distance_m * math.cos(angle_rad)
    return x, y

def rotate_point(x: float, y: float, rotation_deg: float):
    """
    Rota un punto (x, y) alrededor de su origen por un ángulo determinado en grados.
    """
    angle_rad = math.radians(rotation_deg)
    rx = x * math.cos(angle_rad) - y * math.sin(angle_rad)
    ry = x * math.sin(angle_rad) + y * math.cos(angle_rad)
    return rx, ry

def transform_point(x: float, y: float, config: dict):
    """
    Aplica rotación de calibración y traslación basada en la posición
    física del LiDAR en el muro para obtener coordenadas del muro (origen inferior izquierdo).
    """
    # 1. Aplicar rotación de alineación del LiDAR
    rx, ry = rotate_point(x, y, config["lidar_rotation"])
    
    # 2. Aplicar offset de posición física del LiDAR en el muro
    tx = rx + config["lidar_x"]
    ty = ry + config["lidar_y"]
    
    return tx, ty

def inside_board(x: float, y: float, config: dict):
    """
    Comprueba si un punto (x, y) en coordenadas del muro está dentro de los límites
    geométricos del tablero de juego.
    """
    bx = config["board_x"]
    by = config["board_y"]
    bw = config["board_width"]
    bh = config["board_height"]
    
    return (bx <= x <= bx + bw) and (by <= y <= by + bh)
