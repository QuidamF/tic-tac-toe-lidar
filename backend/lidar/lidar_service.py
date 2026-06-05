import asyncio
import time
import math
import random
from spatial.transforms import polar_to_cartesian, transform_point, inside_board
from lidar.clustering import get_valid_cluster
from gameplay.game_logic import LidarDetectorStateMachine, TicTacToeGame
from socketio_server.socket_service import emit_lidar_scan, emit_cluster, emit_gameplay, emit_game_state
from mqtt.mqtt_service import publish_cell, publish_led, publish_game_state, publish_move_led, publish_clear_move_led, publish_turn_leds
from config.runtime import runtime_config

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
    
    # Actualizar los LEDs físicos del turno (inicializar con X encendido)
    publish_turn_leds(game.current_player, game.winner, runtime_config)
    
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
            
            # Notificar ganador por MQTT
            publish_game_state("winner", {"winner": game.winner, "winning_line": game.winning_line})
            
            # Apagar LEDs de turno
            publish_turn_leds(game.current_player, game.winner, runtime_config)
            
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
        
        # Notificar al ESP32 por MQTT (apaga todos los LEDs físicos de celdas)
        publish_game_state("reset", {"status": "cleared"})
        
        # E iniciar el LED de turno para el primer jugador
        publish_turn_leds(game.current_player, game.winner, runtime_config)
        
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
    
    # 3. Emitir a MQTT para el ESP32
    publish_cell(cell_name)
    publish_led(cell_name, runtime_config, state=True)
    
    if moved:
        player = game.board[cell_name]
        # Si fue un robo de casilla, apagar el LED físico del oponente antes de encender el nuevo
        if prev_occupant != "" and prev_occupant != player:
            print(f"[GAMEPLAY] ¡ROBO! {player} le roba la casilla {cell_name} a {prev_occupant}")
            publish_clear_move_led(cell_name, prev_occupant, runtime_config)
            
        publish_move_led(cell_name, player, runtime_config)

    # Actualizar los LEDs físicos del turno correspondiente
    if turn_changed or (game.winner != prev_winner):
        publish_turn_leds(game.current_player, game.winner, runtime_config)
    
    if moved and game.winner != prev_winner:
        publish_game_state("winner", {"winner": game.winner, "winning_line": game.winning_line})
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
            
        print(f"[ANIMATION] Iniciando secuencia ganadora para {winner} en la línea {winning_line}")
        
        # 1. Apagar todas las fichas (X y O) que NO están en la línea ganadora
        for cell in cells:
            if cell not in winning_line:
                publish_clear_move_led(cell, "X", config)
                publish_clear_move_led(cell, "O", config)
        
        # Mantener los ganadores encendidos durante 800ms
        await asyncio.sleep(0.8)
        
        # 2. Parpadear la línea ganadora 3 veces
        for _ in range(3):
            # Apagar ganadores
            for cell in winning_line:
                publish_clear_move_led(cell, winner, config)
            await asyncio.sleep(0.3)
            
            # Encender ganadores
            for cell in winning_line:
                publish_move_led(cell, winner, config)
            await asyncio.sleep(0.3)
            
        await asyncio.sleep(0.4)
        
        # 3. Encender y apagar todas las casillas (X y O) 2 veces en secuencia festiva
        for _ in range(2):
            # Encender todas
            for cell in cells:
                publish_move_led(cell, "X", config)
                publish_move_led(cell, "O", config)
            await asyncio.sleep(0.5)
            
            # Apagar todas
            for cell in cells:
                publish_clear_move_led(cell, "X", config)
                publish_clear_move_led(cell, "O", config)
            await asyncio.sleep(0.5)
            
        # Al final, volver a encender solo la combinación ganadora para dejar el tablero en estado final
        for cell in winning_line:
            publish_move_led(cell, winner, config)
            
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
    
    # Emitir liberación en Socket.IO y apagar LED en MQTT
    asyncio.create_task(emit_gameplay(cell_name, "release"))
    publish_led(cell_name, runtime_config, state=False)

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
            print(f"[LiDAR] Inicializando hardware en puerto {port}...")
            
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
            print("[LiDAR] Conectado e interactuando con hardware real.")
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
                
                # Actualizar el buffer permanente de barrido
                for pt in points_to_process:
                    angle_key = round(pt['a_deg'], 1)
                    if pt['d_mm'] is not None and pt['d_mm'] > 0:
                        scan_buffer[angle_key] = pt['d_mm']
                    else:
                        # Si es 0 o None, removemos la lectura para no generar puntos fantasmas
                        scan_buffer.pop(angle_key, None)
                
                # Controlar la tasa de emisión (throttle a ~15Hz para estabilidad y rendimiento de Socket.IO)
                now = time.time()
                if now - last_emit_time >= 0.066:
                    should_process = True
                    last_emit_time = now
                    # Extraer el escaneo completo actual a partir de la memoria de barrido
                    raw_scan = [(angle, dist) for angle, dist in scan_buffer.items()]
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
            
            # Procesar puntos del LiDAR real o ruido simulado
            for angle, dist_mm in raw_scan:
                # Normalizar ángulos a [0, 360] para soportar cualquier rango (incluso negativos o cruces por 0)
                angle_norm = angle % 360
                min_norm = runtime_config["observation_angle_min"] % 360
                max_norm = runtime_config["observation_angle_max"] % 360
                
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
                if -1.5 <= x_wall <= runtime_config["wall_width"] + 1.5 and -1.0 <= y_wall <= runtime_config["wall_height"] + 1.5:
                    # Guardar coordenadas reales sin saturar para clustering
                    unclamped_points.append((x_wall, y_wall))
                    
                    # Guardar coordenadas saturadas/limitadas al muro para visualización
                    x_wall_sat = max(0.0, min(x_wall, runtime_config["wall_width"]))
                    y_wall_sat = max(0.0, min(y_wall, runtime_config["wall_height"]))
                    all_points.append((x_wall_sat, y_wall_sat))
            
            # Inyectar directamente el cluster mock si está activo
            if mock_touch_point is not None:
                tx, ty = mock_touch_point
                # Generar cluster denso de prueba
                for _ in range(runtime_config["cluster_min_points"] + 5):
                    px = tx + random.uniform(-0.04, 0.04)
                    py = ty + random.uniform(-0.04, 0.04)
                    unclamped_points.append((px, py))
                    
                    # Limitar al muro
                    px_sat = max(0.0, min(px, runtime_config["wall_width"]))
                    py_sat = max(0.0, min(py, runtime_config["wall_height"]))
                    all_points.append((px_sat, py_sat))
            
            # Emitir escaneo COMPLETO del LiDAR al frontend (Socket.IO)
            formatted_points = [{"x": p[0], "y": p[1]} for p in all_points]
            await emit_lidar_scan(formatted_points)
            
            # Filtrar puntos que caen dentro del tablero para clustering (usando coordenadas sin saturar)
            # excluyendo una pequeña franja de 6cm en el suelo (y < 0.06) y techo (y > H - 0.06)
            board_points = []
            for p in unclamped_points:
                if inside_board(p[0], p[1], runtime_config):
                    if 0.06 <= p[1] <= runtime_config["wall_height"] - 0.06:
                        board_points.append(p)
            
            # Ejecutar agrupamiento (clustering) únicamente dentro del tablero
            detected_cluster = get_valid_cluster(board_points, runtime_config)
            
            # Máquina de estados
            if detected_cluster:
                # Emitir cluster debug via Socket.IO
                cluster_event_data = {
                    "centroid": {
                        "x": detected_cluster["centroid"][0],
                        "y": detected_cluster["centroid"][1]
                    },
                    "points": detected_cluster["count"],
                    "radius": detected_cluster["radius"]
                }
                await emit_cluster(cluster_event_data)
                state_machine.update(cluster_event_data)
            else:
                await emit_cluster(None)
                state_machine.update(None)
            
            # Imprimir estadísticas de depuración cada 2 segundos para monitorear el flujo de datos
            now = time.time()
            if now - last_debug_time >= 2.0:
                print(f"[LiDAR-Debug] Leídos: {len(points_to_process)} | Muro: {len(all_points)} | Tablero: {len(board_points)}")
                last_debug_time = now
                
        except Exception as e:
            print(f"[LiDAR] Error en el bucle principal de escaneo: {e}")
            await asyncio.sleep(0.5)
