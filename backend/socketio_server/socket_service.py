import socketio
from config.runtime import runtime_config, cast_value

# Servidor Socket.IO Asíncrono en modo ASGI
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins='*'
)

@sio.event
async def connect(sid, environ):
    print(f"[Socket.IO] Cliente conectado: {sid}")
    await sio.emit('welcome', {'status': 'connected'}, room=sid)
    
    # Emitir el estado actual del juego al conectar
    try:
        from lidar.lidar_service import game
        await sio.emit('game_state', {
            "board": game.board,
            "current_player": game.current_player,
            "winner": game.winner
        }, room=sid)
    except Exception as e:
        print(f"[Socket.IO] Error al emitir estado inicial al cliente {sid}: {e}")

@sio.event
async def disconnect(sid):
    print(f"[Socket.IO] Cliente desconectado: {sid}")

@sio.event
async def update_config_temp(sid, data):
    """
    Actualiza la configuración en caliente (RAM) de forma temporal
    mientras el usuario arrastra los sliders en el frontend (sin escribir en DB).
    """
    for key, val in data.items():
        if key in runtime_config:
            runtime_config[key] = cast_value(str(val))

async def emit_lidar_scan(points: list):
    """
    Emite el escaneo procesado y filtrado actual en tiempo real.
    points: Lista de diccionarios [{'x': val, 'y': val}]
    """
    await sio.emit(
        'lidar_scan',
        {
            'points': points
        }
    )

async def emit_cluster(cluster_info: dict):
    """
    Emite la información del cluster e interrupción detectada para depuración.
    cluster_info: dict con centroid, points (count), y radius
    """
    await sio.emit(
        'lidar_cluster',
        cluster_info
    )

async def emit_gameplay(cell: str, event_type: str = "press"):
    """
    Emite un evento de gameplay (celda interactuada).
    cell: nombre de la celda (ej. 'top_left')
    event_type: 'press' o 'release'
    """
    await sio.emit(
        'gameplay_event',
        {
            'cell': cell,
            'event': event_type
        }
    )

_last_game_state = None

async def emit_game_state(game_data: dict):
    """
    Emite el estado actual de la partida del gato (tablero, turno y ganador)
    y dispara los efectos de sonido correspondientes de forma nativa en el host.
    """
    global _last_game_state
    
    await sio.emit('game_state', game_data)
    
    try:
        from services.sound_effects import (
            play_move_sound, play_steal_sound, play_win_sound, play_reset_sound, play_start_sound
        )
        
        board = game_data.get("board", {})
        winner = game_data.get("winner")
        current_player = game_data.get("current_player", "X")
        
        if _last_game_state is None:
            # Inicializar el estado de referencia
            _last_game_state = {
                "board": {k: v for k, v in board.items()},
                "winner": winner,
                "current_player": current_player
            }
            # Emitir sonido de bienvenida en el primer arranque del juego
            play_start_sound()
            return
            
        prev_board = _last_game_state.get("board", {})
        prev_winner = _last_game_state.get("winner")
        
        move_detected = False
        steal_detected = False
        
        for cell, curr_val in board.items():
            prev_val = prev_board.get(cell, "")
            if prev_val != curr_val:
                if prev_val == "":
                    move_detected = True
                elif prev_val != "" and curr_val != "":
                    steal_detected = True
                    
        prev_is_all_empty = all(v == "" for v in prev_board.values()) if prev_board else True
        curr_is_all_empty = all(v == "" for v in board.values()) if board else True
        
        if not prev_is_all_empty and curr_is_all_empty:
            # Partida reiniciada
            play_reset_sound()
        elif winner and winner != prev_winner:
            # Fin del juego
            if winner == "draw":
                play_reset_sound()
            else:
                play_win_sound()
        elif steal_detected:
            # Robo de casilla
            play_steal_sound()
        elif move_detected:
            # Tiro normal (el jugador que tiró fue el del turno anterior)
            prev_player = _last_game_state.get("current_player", "X")
            play_move_sound(prev_player)
            
        # Actualizar referencia
        _last_game_state = {
            "board": {k: v for k, v in board.items()},
            "winner": winner,
            "current_player": current_player
        }
    except Exception as e:
        print(f"[SOUND] Error en la lógica de sonido del host: {e}")
