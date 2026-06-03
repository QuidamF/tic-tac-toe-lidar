import math

def calculate_centroid(points: list):
    """Calcula el centroide (x_promedio, y_promedio) de una lista de puntos 2D."""
    if not points:
        return None
    sx = sum(p[0] for p in points)
    sy = sum(p[1] for p in points)
    return (sx / len(points), sy / len(points))

def calculate_radius(points: list, centroid: tuple):
    """Calcula el radio de un cluster como la distancia máxima desde el centroide."""
    if not points or not centroid:
        return 0.0
    cx, cy = centroid
    max_d = 0.0
    for px, py in points:
        d = math.sqrt((px - cx)**2 + (py - cy)**2)
        if d > max_d:
            max_d = d
    return max_d

def correct_centroid(raw_centroid: tuple, points: list, config: dict):
    """
    Compensa el centroide crudo (que está desplazado hacia el LiDAR) para
    obtener el verdadero centro geométrico de la pelota.
    Realiza la corrección en coordenadas de muro (después de traslación/rotación).
    """
    if not raw_centroid:
        return raw_centroid

    cx_raw, cy_raw = raw_centroid

    # 1. Obtener posición del LiDAR en coordenadas de muro y radio de la pelota
    lx = config.get("lidar_x", 1.5)
    ly = config.get("lidar_y", 3.0)
    R = config.get("expected_cluster_radius", 0.10)

    # 2. Calcular vector visual desde el LiDAR al centroide crudo
    vx = cx_raw - lx
    vy = cy_raw - ly
    dist_raw = math.sqrt(vx**2 + vy**2)

    if dist_raw < 0.01:
        return raw_centroid # Evitar división por cero

    # Vector unitario en la dirección LiDAR -> Centroide
    ux = vx / dist_raw
    uy = vy / dist_raw

    # 3. Factor de compensación del centroide de arco
    # El centroide de los puntos del arco de superficie visible de la pelota
    # se localiza geométricamente a una distancia de ~0.75 * R de su centro real.
    # Desplazamos el centroide a lo largo de la visual alejándolo del LiDAR.
    f = 0.75

    corrected_cx = cx_raw + (f * R) * ux
    corrected_cy = cy_raw + (f * R) * uy

    return (corrected_cx, corrected_cy)

def find_clusters(points: list, max_dist: float):
    """
    Agrupa los puntos en clusters utilizando un algoritmo de búsqueda por proximidad (tipo DBSCAN simple).
    Dos puntos pertenecen al mismo cluster si la distancia euclidiana entre ellos es menor o igual a max_dist.
    """
    clusters = []
    n = len(points)
    visited = [False] * n
    
    # Precalcular distancias cuadradas para mayor rapidez
    max_dist_sq = max_dist ** 2
    
    for i in range(n):
        if visited[i]:
            continue
            
        # Comenzar un nuevo cluster (BFS)
        cluster = []
        queue = [i]
        visited[i] = True
        
        while queue:
            curr_idx = queue.pop(0)
            curr_pt = points[curr_idx]
            cluster.append(curr_pt)
            
            # Buscar vecinos no visitados
            for j in range(n):
                if not visited[j]:
                    ox, oy = points[j]
                    cx, cy = curr_pt
                    dist_sq = (ox - cx)**2 + (oy - cy)**2
                    if dist_sq <= max_dist_sq:
                        visited[j] = True
                        queue.append(j)
                        
        clusters.append(cluster)
        
    return clusters

def get_valid_cluster(points: list, config: dict):
    """
    Agrupa los puntos y devuelve el mejor cluster que cumpla con las restricciones
    de tamaño y radio especificadas en la configuración.
    """
    if not points:
        return None
        
    clusters = find_clusters(points, config["cluster_max_dist"])
    
    valid_clusters = []
    for c in clusters:
        n_pts = len(c)
        if config["cluster_min_points"] <= n_pts <= config["cluster_max_points"]:
            centroid = calculate_centroid(c)
            radius = calculate_radius(c, centroid)
            
            # Validación opcional de radio
            # La pelota de fútbol tiene un radio definido, aceptamos hasta un 150% de tolerancia
            max_allowed_radius = config["expected_cluster_radius"] * 1.8
            if radius <= max_allowed_radius:
                # Aplicar la compensación de centroide por proyección del LiDAR
                corrected = correct_centroid(centroid, c, config)
                valid_clusters.append({
                    "points": c,
                    "centroid": corrected,
                    "radius": radius,
                    "count": n_pts
                })
                
    if not valid_clusters:
        return None
        
    # Retornar el cluster con más puntos (el más representativo)
    valid_clusters.sort(key=lambda x: x["count"], reverse=True)
    return valid_clusters[0]
