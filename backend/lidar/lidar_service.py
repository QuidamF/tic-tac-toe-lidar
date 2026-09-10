import asyncio
import time
import math
import random
from spatial.transforms import polar_to_cartesian, transform_point, inside_board
from lidar.clustering import get_valid_cluster
from gameplay.game_logic import LidarDetectorStateMachine, TicTacToeGame
from socketio_server.socket_service import emit_lidar_scan, emit_cluster, emit_gameplay, emit_game_state
from config.runtime import runtime_config

def safe_float(val, default=0.0):
    try:
        if val == "" or val is None:
            return default
        return float(val)
    except (ValueError, TypeError):
        return default

def safe_int(val, default=0):
    try:
        if val == "" or val is None:
            return default
        return int(float(val))
    except (ValueError, TypeError):
        return default

# Estado global del juego de Tic Tac Toe
game = TicTacToeGame()

# Variables para control de simulación (mock)
use_mock = False
mock_touch_point = None  # Tupla (x, y) del click simulado
mock_touch_timer = 0.0

# Bandera de estado del hardware
lidar_active = False
lidar_device = None
# Tarea global para controlar la animación ganadora de LEDs y temporizadores de partida
winning_animation_task = None
cpu_task = None
game_timer_task = None
auto_reset_task = None
game_timer_start_time = 0.0

# Modo activo desde el frontend (dashboard, catalog, gato_fullscreen)
active_interaction_mode = "dashboard"

def set_active_interaction_mode(mode: str):
    global active_interaction_mode
    active_interaction_mode = mode

def reset_game_state_service():
    """Reinicia el estado del temporizador global, de la CPU y auto-reset al comenzar partida."""
    global winning_animation_task, cpu_task, game_timer_task, auto_reset_task, game_timer_start_time
    
    # Cancelar animaciones y tareas de fondo
    if winning_animation_task and not winning_animation_task.done():
        winning_animation_task.cancel()
    if cpu_task and not cpu_task.done():
        cpu_task.cancel()
    if game_timer_task and not game_timer_task.done():
        game_timer_task.cancel()
    if auto_reset_task and not auto_reset_task.done():
        auto_reset_task.cancel()
        
    game.reset()
    
    # Resetear tiempo de inicio del temporizador global (esperando primer toque)
    game_timer_start_time = 0.0
    
    # Si le toca a la CPU de inicio
    if runtime_config.get("game_mode", "pvp") == "pvcpu" and game.current_player == "O":
        trigger_cpu_move_if_needed()

def start_game_timer():
    """Inicia o reinicia el temporizador global de juego si está habilitado."""
    global game_timer_task, game_timer_start_time
    
    # Cancelar el temporizador anterior
    if game_timer_task and not game_timer_task.done():
        game_timer_task.cancel()
        
    if game.winner:
        return
        
    if runtime_config.get("time_limit_enabled", False):
        if game_timer_start_time <= 0.0:
            game_timer_start_time = time.time()
            
        limit = int(runtime_config.get("time_limit_seconds", 120))
        elapsed = time.time() - game_timer_start_time
        remaining = max(0.1, limit - elapsed)
        
        game_timer_task = asyncio.create_task(run_game_timer(remaining))

async def run_game_timer(remaining):
    try:
        # Esperar los segundos indicados
        await asyncio.sleep(remaining)
        
        # Si se agota el tiempo, determinar ganador por conteo de fichas en tablero
        print("[TIMER] ¡Se agotó el tiempo global de la partida!")
        
        if not game.winner:
            x_count = list(game.board.values()).count("X")
            o_count = list(game.board.values()).count("O")
            
            if x_count > o_count:
                game.winner = "X"
            elif o_count > x_count:
                game.winner = "O"
            else:
                game.winner = "draw"
            game.winning_line = []
            
            # Emitir estado actualizado
            await emit_game_state({
                "board": game.board,
                "current_player": game.current_player,
                "winner": game.winner,
                "winning_line": game.winning_line
            })
            
            # Iniciar animación física ganadora de LEDs si no es empate
            if game.winner != "draw":
                global winning_animation_task
                if winning_animation_task and not winning_animation_task.done():
                    winning_animation_task.cancel()
                winning_animation_task = asyncio.create_task(run_winning_animation(game.winner, game.winning_line, runtime_config))
                
            # Disparar auto-reset tras terminar la partida
            trigger_auto_reset()
            
    except asyncio.CancelledError:
        pass
    except Exception as e:
        print(f"[TIMER] Error en el temporizador global: {e}")

def trigger_auto_reset():
    """Agenda el auto-reinicio de la partida si ya hay un ganador o empate."""
    global auto_reset_task
    if auto_reset_task and not auto_reset_task.done():
        auto_reset_task.cancel()
    auto_reset_task = asyncio.create_task(run_auto_reset())

async def run_auto_reset():
    try:
        cooldown = int(runtime_config.get("auto_reset_seconds", 10))
        # Esperar x segundos
        await asyncio.sleep(cooldown)
        print(f"[GAMEPLAY] Auto-reiniciando partida tras {cooldown} segundos de fin de juego.")
        reset_game_state_service()
        
        # Emitir estado del juego reiniciado al frontend
        await emit_game_state({
            "board": game.board,
            "current_player": game.current_player,
            "winner": game.winner,
            "winning_line": game.winning_line
        })
    except asyncio.CancelledError:
        pass
    except Exception as e:
        print(f"[GAMEPLAY] Error en auto-reset: {e}")

def trigger_cpu_move_if_needed():
    """Si está activo el modo PVCPU y le toca al CPU ('O'), agenda su movimiento."""
    global cpu_task
    # Cancelar tarea previa de CPU si existiera
    if cpu_task and not cpu_task.done():
        cpu_task.cancel()
        
    if runtime_config.get("game_mode", "pvp") == "pvcpu" and game.current_player == "O" and not game.winner:
        cpu_task = asyncio.create_task(run_cpu_move_delayed())

async def run_cpu_move_delayed():
    try:
        # Retardo de 1 segundo para simular "pensamiento" de la CPU
        await asyncio.sleep(1.0)
        
        cell_name = select_cpu_move()
        if cell_name:
            print(f"[CPU] Selecciona celda: {cell_name}")
            handle_press(cell_name)
    except asyncio.CancelledError:
        pass
    except Exception as e:
        print(f"[CPU] Error en jugada de CPU: {e}")

def select_cpu_move():
    """
    Selecciona la mejor celda para la CPU ('O') según las reglas de Tic-Tac-Toe
    y las opciones de robo/casilla vacía.
    """
    board = game.board
    steal_enabled = runtime_config.get("steal_enabled", True)
    
    # 1. Buscar si hay una celda vacía o robable que le dé la victoria inmediata a CPU ("O")
    best_move = find_winning_move("O", "O", steal_enabled)
    if best_move:
        return best_move
        
    # 2. Buscar si hay una celda vacía o robable que bloquee la victoria inmediata del Jugador ("X")
    block_move = find_winning_move("X", "O", steal_enabled)
    if block_move:
        return block_move
        
    # 3. Tratar de tomar el centro si está vacío (o robable si es del oponente)
    if "center" in board:
        if board["center"] == "":
            return "center"
        elif steal_enabled and board["center"] == "X":
            return "center"
            
    # 4. Tratar de tomar esquinas vacías
    corners = ["top_left", "top_right", "bottom_left", "bottom_right"]
    random.shuffle(corners)
    for corner in corners:
        if board[corner] == "":
            return corner
            
    # 5. Tomar esquinas robables
    if steal_enabled:
        for corner in corners:
            if board[corner] == "X":
                return corner
                
    # 6. Tomar cualquier celda vacía disponible
    empty_cells = [k for k, v in board.items() if v == ""]
    if empty_cells:
        return random.choice(empty_cells)
        
    # 7. Robar cualquier celda del oponente disponible
    if steal_enabled:
        opponent_cells = [k for k, v in board.items() if v == "X"]
        if opponent_cells:
            return random.choice(opponent_cells)
            
    return None

def find_winning_move(target_player, current_player, steal_enabled):
    """
    Encuentra una celda tal que si target_player la ocupa, completa una línea de 3.
    """
    board = game.board
    lines = [
        # Horizontales
        ["top_left", "top_center", "top_right"],
        ["mid_left", "center", "mid_right"],
        ["bottom_left", "bottom_center", "bottom_right"],
        # Verticales
        ["top_left", "mid_left", "bottom_left"],
        ["top_center", "center", "bottom_center"],
        ["top_right", "mid_right", "bottom_right"],
        # Diagonales
        ["top_left", "center", "bottom_right"],
        ["top_right", "center", "bottom_left"]
    ]
    
    for line in lines:
        vals = [board[cell] for cell in line]
        if vals.count(target_player) == 2:
            for cell in line:
                val = board[cell]
                if val == "":
                    return cell
                elif val != current_player and steal_enabled:
                    return cell
    return None

def trigger_mock_touch(x: float, y: float):
    """Permite inyectar una coordenada simulada desde la API."""
    global mock_touch_point, mock_touch_timer
    mock_touch_point = (x, y)
    mock_touch_timer = time.time()
    print(f"[MOCK] Impacto simulado inyectado en: ({x:.2f}, {y:.2f})")

def handle_press(cell_name: str):
    """Callback ejecutado al detectar un impacto en la cortina virtual."""
    global winning_animation_task
    print(f"[GAMEPLAY] ¡Impacto detectado en celda: {cell_name}!")
    
    # Obtener ocupante anterior para lógica de robo
    prev_occupant = game.board.get(cell_name, "")
    
    # 1. Intentar hacer la jugada en el Gato
    prev_winner = game.winner
    prev_player = game.current_player
    
    # Determinar si el tablero estaba vacío antes de la jugada
    is_first_move = all(v == "" or v is None for v in game.board.values())
    
    moved = game.make_move(cell_name, runtime_config)
    
    if moved and is_first_move:
        print("[GAMEPLAY] Primer tiro registrado. Iniciando temporizador global de juego.")
        start_game_timer()
    
    # Evaluar si el turno cambió (sea por jugada válida, o por un intento fallido en modo un solo intento)
    turn_changed = moved or (prev_player != game.current_player)
    
    # 2. Emitir eventos de Socket.IO
    asyncio.create_task(emit_gameplay(cell_name, "press"))
    asyncio.create_task(emit_game_state({
        "board": game.board,
        "current_player": game.current_player,
        "winner": game.winner,
        "winning_line": game.winning_line
    }))
    
    if moved and game.winner != prev_winner:
        # Cancelar temporizador global
        if game_timer_task and not game_timer_task.done():
            game_timer_task.cancel()
        # Cancelar animación previa si existiera
        if winning_animation_task and not winning_animation_task.done():
            winning_animation_task.cancel()
        # Iniciar animación física ganadora de LEDs
        winning_animation_task = asyncio.create_task(run_winning_animation(game.winner, game.winning_line, runtime_config))
        # Disparar auto-reset tras terminar la partida
        trigger_auto_reset()

    # Si el juego no ha terminado y el turno cambió, disparar CPU si le toca
    if not game.winner and turn_changed:
        if runtime_config.get("game_mode", "pvp") == "pvcpu" and game.current_player == "O":
            trigger_cpu_move_if_needed()

def cancel_winning_animation():
    """Cancela la animación ganadora de LEDs y las tareas de juego si están activas."""
    global winning_animation_task, cpu_task, game_timer_task
    if winning_animation_task and not winning_animation_task.done():
        winning_animation_task.cancel()
        print("[LiDAR] Petición de cancelación de animación ganadora enviada.")
    if cpu_task and not cpu_task.done():
        cpu_task.cancel()
    if game_timer_task and not game_timer_task.done():
        game_timer_task.cancel()

async def run_winning_animation(winner: str, winning_line: list, config: dict):
    """
    Controla la animación física de LEDs al haber un ganador.
    1. Apagar todas las celdas que no forman parte de la línea ganadora.
    2. Parpadear la línea ganadora 3 veces.
    3. Destellar todas las celdas del tablero (X y O) como celebración final.
    """
    try:
        cells = [
            "top_left", "top_center", "top_right",
            "mid_left", "center", "mid_right",
            "bottom_left", "bottom_center", "bottom_right"
        ]
        
        if not winning_line:
            return
            
        print(f"[ANIMATION] Secuencia ganadora omitida (no hay MQTT).")
            
    except asyncio.CancelledError:
        print("[ANIMATION] Animación ganadora cancelada por reinicio del juego.")
    except Exception as e:
        print(f"[ANIMATION] Error en la animación ganadora: {e}")

def shutdown_lidar():
    """Detiene y apaga el hardware del LiDAR de forma segura, liberando el puerto serial."""
    global lidar_device, lidar_active
    if lidar_device:
        try:
            print("[LiDAR] Apagando láser, deteniendo motor y cerrando el puerto serial...")
            lidar_device.stop_event.set()
            lidar_device.shutdown()
            print("[LiDAR] Desconectado y apagado correctamente.")
        except Exception as e:
            print(f"[LiDAR] Error al apagar el hardware: {e}")
        finally:
            lidar_device = None
            lidar_active = False

def handle_release(cell_name: str):
    """Callback ejecutado al terminar la interrupción y cooldown."""
    print(f"[GAMEPLAY] Fin de interacción en celda: {cell_name}")
    
    # Emitir liberación en Socket.IO
    asyncio.create_task(emit_gameplay(cell_name, "release"))

async def lidar_loop():
    """
    Bucle principal de lectura del LiDAR.
    Si el hardware falla o se solicita el modo mock, conmuta automáticamente a simulación.
    """
    global use_mock, mock_touch_point, mock_touch_timer, lidar_active, lidar_device
    
    state_machine = LidarDetectorStateMachine(runtime_config)
    state_machine.set_callbacks(handle_press, handle_release)
    
    lidar = None
    
    # Intentar inicializar el LiDAR real si no está en modo forzado mock
    if not use_mock:
        try:
            import sys
            import os
            original_path = sys.path.copy()
            sys.path = [p for p in sys.path if p not in ('', '.') and p != os.getcwd()]
            try:
                from rplidarc1 import RPLidar
            finally:
                sys.path = original_path
            
            port = runtime_config["lidar_port"]
            baud = runtime_config["lidar_baudrate"]
            lidar_type = runtime_config.get("lidar_type", "rplidar")
            print(f"[LiDAR] Inicializando hardware tipo {lidar_type} en puerto {port}...")
            
            if lidar_type == "lanhai":
                from lidar.lanhai_lidar import LanhaiLidar
                lidar_device = LanhaiLidar(port=port, baudrate=baud)
                lidar_device.stop_event = asyncio.Event()
                
                # Iniciar escaneo
                asyncio.create_task(lidar_device.simple_scan())
                lidar_active = True
                lidar = lidar_device
                print(f"[LiDAR] Conectado e interactuando con hardware Lanhai (LDS-50C-2A).")
            else:
                lidar_device = RPLidar(port=port, baudrate=baud)
                
                # Intentar reiniciar el hardware para asegurar un estado limpio en caso de interrupción previa
                try:
                    print("[LiDAR] Enviando secuencia de reset para asegurar un estado limpio...")
                    lidar_device.reset()
                    print("[LiDAR] Esperando 0.3s adicionales para recibir mensajes de arranque...")
                    await asyncio.sleep(0.3)
                    print("[LiDAR] Limpiando el buffer serial post-reset...")
                    lidar_device._clear_input_buffer()
                except Exception as reset_err:
                    print(f"[LiDAR] Advertencia durante el reset de hardware: {reset_err}")
                    
                lidar_device.stop_event = asyncio.Event()
                
                # Iniciar escaneo en el hardware
                asyncio.create_task(lidar_device.simple_scan())
                lidar_active = True
                lidar = lidar_device
                print("[LiDAR] Conectado e interactuando con hardware real (RPLidar).")
        except Exception as e:
            import traceback
            print(f"[LiDAR] ERROR: No se pudo conectar al hardware real: {repr(e)}")
            traceback.print_exc()
            print("[LiDAR] Conmutando automáticamente a modo SIMULACIÓN (Mock).")
            use_mock = True
            lidar_active = False
            lidar_device = None
            
    # Bucle de procesamiento de escaneos
    scan_buffer = {}
    last_emit_time = 0.0
    last_debug_time = time.time()
    while True:
        try:
            raw_scan = []
            points_to_process = []
            
            # Limpiar mock_touch_point si ya pasaron los 400ms
            if mock_touch_point is not None and (time.time() - mock_touch_timer >= 0.4):
                mock_touch_point = None
                
            if use_mock:
                # Generar datos simulados a aprox. 10Hz
                await asyncio.sleep(0.1)
                
                # Simular ruido de fondo de la cortina (puntos en los límites de la habitación)
                # Creamos un semicírculo de fondo a 2.5 metros
                for angle in range(-70, 71, 2):
                    dist = 2.5 + random.uniform(-0.01, 0.01)
                    raw_scan.append((angle, dist * 1000.0))
                
                should_process = True
            else:
                # Consumir TODOS los puntos acumulados en la cola de hardware
                while not lidar.output_queue.empty():
                    try:
                        point = lidar.output_queue.get_nowait()
                        points_to_process.append(point)
                        lidar.output_queue.task_done()
                    except Exception:
                        break
                
                now = time.time()
                # Actualizar el buffer permanente de barrido guardando la estampa de tiempo
                for pt in points_to_process:
                    angle_key = round(pt['a_deg'], 1)
                    if pt['d_mm'] is not None and pt['d_mm'] > 0:
                        scan_buffer[angle_key] = (pt['d_mm'], now)
                    else:
                        # Si es 0 o None, removemos la lectura para no generar puntos fantasmas
                        scan_buffer.pop(angle_key, None)
                
                # Expirar lecturas antiguas no actualizadas en los últimos 0.3 segundos (fantasmas)
                max_age = 0.3
                stale_keys = [k for k, (dist, ts) in scan_buffer.items() if now - ts > max_age]
                for k in stale_keys:
                    del scan_buffer[k]
                
                # Controlar la tasa de emisión (throttle a ~15Hz para estabilidad y rendimiento de Socket.IO)
                if now - last_emit_time >= 0.066:
                    should_process = True
                    last_emit_time = now
                    # Extraer el escaneo completo actual a partir de la memoria de barrido
                    raw_scan = [(angle, dist_ts[0]) for angle, dist_ts in scan_buffer.items()]
                else:
                    should_process = False
                    # Dar un pequeño respiro para evitar saturación de CPU
                    await asyncio.sleep(0.01)
                    continue

            if not should_process:
                continue

            # Procesar el escaneo actual
            all_points = []
            unclamped_points = []
            board_points = []
            
            obs_min_val = safe_float(runtime_config.get("observation_angle_min"), -70.0)
            obs_max_val = safe_float(runtime_config.get("observation_angle_max"), 70.0)
            min_norm = obs_min_val % 360
            max_norm = obs_max_val % 360
            
            wall_w = safe_float(runtime_config.get("wall_width"), 3.0)
            wall_h = safe_float(runtime_config.get("wall_height"), 3.0)
            cluster_min_pts = safe_int(runtime_config.get("cluster_min_points"), 3)
            
            # Procesar puntos del LiDAR real o ruido simulado
            for angle, dist_mm in raw_scan:
                # Normalizar ángulos a [0, 360] para soportar cualquier rango (incluso negativos o cruces por 0)
                angle_norm = angle % 360
                
                is_inside = False
                if min_norm <= max_norm:
                    is_inside = min_norm <= angle_norm <= max_norm
                else:
                    # El arco cruza el cero (ej. de 350 a 10)
                    is_inside = (angle_norm >= min_norm) or (angle_norm <= max_norm)
                
                if not is_inside:
                    continue
                
                # Filtrar puntos muy cercanos (zona ciega/ruido del soporte y cables)
                if dist_mm < 200.0:
                    continue
                
                # Convertir a cartesianas y aplicar transformaciones
                x_lidar, y_lidar = polar_to_cartesian(angle, dist_mm / 1000.0)
                x_wall, y_wall = transform_point(x_lidar, y_lidar, runtime_config)
                
                # Guardar los puntos con un margen amplio para ver la alineación y rotación en el canvas
                if -1.5 <= x_wall <= wall_w + 1.5 and -1.0 <= y_wall <= wall_h + 1.5:
                    # Guardar coordenadas reales sin saturar para clustering
                    unclamped_points.append((x_wall, y_wall))
                    
                    # Guardar coordenadas saturadas/limitadas al muro para visualización
                    x_wall_sat = max(0.0, min(x_wall, wall_w))
                    y_wall_sat = max(0.0, min(y_wall, wall_h))
                    all_points.append((x_wall_sat, y_wall_sat))
            
            # Inyectar directamente el cluster mock si está activo
            if mock_touch_point is not None:
                tx, ty = mock_touch_point
                # Generar cluster denso de prueba
                for _ in range(cluster_min_pts + 5):
                    px = tx + random.uniform(-0.04, 0.04)
                    py = ty + random.uniform(-0.04, 0.04)
                    unclamped_points.append((px, py))
                    
                    # Limitar al muro
                    px_sat = max(0.0, min(px, wall_w))
                    py_sat = max(0.0, min(py, wall_h))
                    all_points.append((px_sat, py_sat))
            
            # Emitir escaneo completo sólo cuando se visualiza el canvas de calibración (dashboard y gato_config)
            # En modos interactivos (catalog, gato_fullscreen), omitir la emisión masiva de 400+ puntos para maximizar FPS y eliminar latencia
            if active_interaction_mode in ("dashboard", "gato_config"):
                formatted_points = [{"x": p[0], "y": p[1]} for p in all_points]
                await emit_lidar_scan(formatted_points)
            
            # Lógica de Interacción dependiendo del Modo Activo
            if active_interaction_mode in ("gato_fullscreen", "dashboard", "gato_config"):
                # Modo Gato o Dashboard: Filtrar puntos que caen dentro del tablero
                for p in unclamped_points:
                    if inside_board(p[0], p[1], runtime_config):
                        if 0.06 <= p[1] <= runtime_config["wall_height"] - 0.06:
                            board_points.append(p)
                
                detected_cluster = get_valid_cluster(board_points, runtime_config)
                
                if detected_cluster:
                    cluster_event_data = {
                        "centroid": {"x": detected_cluster["centroid"][0], "y": detected_cluster["centroid"][1]},
                        "points": detected_cluster["count"],
                        "radius": detected_cluster["radius"]
                    }
                    await emit_cluster(cluster_event_data)
                    state_machine.update(cluster_event_data)
                else:
                    await emit_cluster(None)
                    state_machine.update(None)
                    
            elif active_interaction_mode == "catalog":
                # Modo Catálogo: Evaluar SÓLO dentro del área de proyección interactiva (tablero calibrado)
                # Aplicar un margen de 4.0 cm dentro del tablero para evitar reflexiones en marcos y esquinas físicas.
                wall_points = []
                margin = 0.04
                bx = runtime_config["board_x"]
                by = runtime_config["board_y"]
                bw = runtime_config["board_width"]
                bh = runtime_config["board_height"]

                for p in unclamped_points:
                    if inside_board(p[0], p[1], runtime_config):
                        if (bx + margin <= p[0] <= bx + bw - margin) and (by + margin <= p[1] <= by + bh - margin):
                            wall_points.append(p)
                
                # Exigir un mínimo de 3 puntos por cluster en catálogo para evitar que ruidos de 2 puntos atasquen la esquina
                catalog_config = runtime_config.copy()
                catalog_config["cluster_min_points"] = max(3, int(runtime_config.get("cluster_min_points", 3)))
                catalog_config["cluster_max_points"] = runtime_config.get("cluster_max_points", 9999)
                catalog_config["expected_cluster_radius"] = 2.0 # Permitir grandes volúmenes (2 metros de radio)
                catalog_config["apply_centroid_correction"] = False # No desplazar el centroide por radio de pelota en catálogo
                
                detected_cluster = get_valid_cluster(wall_points, catalog_config)
                
                # Descartar el cluster si su centroide cae demasiado cerca del límite extremo superior izquierdo
                if detected_cluster:
                    cx = detected_cluster["centroid"][0]
                    cy = detected_cluster["centroid"][1]
                    # Si el centroide está excesivamente cerca de los límites extremos del marco (esquina superior izquierda)
                    if (cx <= bx + 0.02) or (cy >= by + bh - 0.02):
                        detected_cluster = None

                if detected_cluster:
                    cluster_event_data = {
                        "centroid": {"x": detected_cluster["centroid"][0], "y": detected_cluster["centroid"][1]},
                        "points": detected_cluster["count"],
                        "radius": detected_cluster["radius"]
                    }
                    print(f"[LiDAR] Cluster detectado en Catalog Mode: x={cluster_event_data['centroid']['x']:.2f}, y={cluster_event_data['centroid']['y']:.2f}")
                    await emit_cluster(cluster_event_data)
                else:
                    await emit_cluster(None)
                    
                # Desactivar la máquina de estados del gato temporalmente para no jugar en el fondo
                state_machine.update(None)
            
            # Imprimir estadísticas de depuración cada 2 segundos para monitorear el flujo de datos
            now = time.time()
            if now - last_debug_time >= 2.0:
                print(f"[LiDAR-Debug] Leídos: {len(points_to_process)} | Muro: {len(all_points)} | Tablero: {len(board_points)}")
                last_debug_time = now
                
        except Exception as e:
            print(f"[LiDAR] Error en el bucle principal de escaneo: {e}")
            await asyncio.sleep(0.5)
