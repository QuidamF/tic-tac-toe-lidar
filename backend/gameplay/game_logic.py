import time

# Mapeo de celdas según fila y columna en un tablero de 3x3
CELL_GRID = [
    ["top_left", "top_center", "top_right"],
    ["mid_left", "center", "mid_right"],
    ["bottom_left", "bottom_center", "bottom_right"]
]

def get_cell_name(x: float, y: float, config: dict):
    """
    Determina en qué celda cayó la coordenada (x, y) del muro.
    Divide el ancho y alto del tablero en 3 columnas y 3 filas.
    """
    bx = config["board_x"]
    by = config["board_y"]
    bw = config["board_width"]
    bh = config["board_height"]
    
    # Calcular ancho y alto de cada celda
    cell_w = bw / config.get("board_cols", 3)
    cell_h = bh / config.get("board_rows", 3)
    
    # Calcular columna (0 a 2)
    col = int((x - bx) / cell_w)
    col = max(0, min(col, 2))
    
    # Calcular fila (0 a 2). Fila 0 es la parte de arriba (mayor Y)
    row = 2 - int((y - by) / cell_h)
    row = max(0, min(row, 2))
    
    return CELL_GRID[row][col]


class TicTacToeGame:
    """Gestiona el estado y reglas del juego Tic Tac Toe."""
    def __init__(self):
        self.reset()
        
    def reset(self):
        self.board = {
            "top_left": "", "top_center": "", "top_right": "",
            "mid_left": "", "center": "", "mid_right": "",
            "bottom_left": "", "bottom_center": "", "bottom_right": ""
        }
        self.current_player = "X"
        self.winner = None  # X, O, draw, o None
        self.winning_line = None # list de 3 casillas o None
        
    def make_move(self, cell_name: str, config: dict = None):
        """Intenta colocar la ficha del jugador actual en la celda."""
        if self.winner or cell_name not in self.board:
            return False
            
        # Leer parámetros de configuración (o usar valores por defecto)
        steal_enabled = config.get("steal_enabled", True) if config else True
        single_attempt = config.get("single_attempt_mode", False) if config else False
        
        current_val = self.board[cell_name]
        
        # Validar movimiento
        valid_move = False
        if current_val == "":
            valid_move = True
        elif steal_enabled and current_val != self.current_player:
            valid_move = True
            
        if valid_move:
            self.board[cell_name] = self.current_player
            self.check_winner()
            
            if not self.winner:
                self.current_player = "O" if self.current_player == "X" else "X"
            return True
        else:
            # Si el movimiento es inválido pero es modo de un solo intento, el turno cambia igual
            if single_attempt:
                self.current_player = "O" if self.current_player == "X" else "X"
            return False

    def check_winner(self):
        b = self.board
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
            if b[line[0]] != "" and b[line[0]] == b[line[1]] == b[line[2]]:
                self.winner = b[line[0]]
                self.winning_line = line
                return
                
        # Verificar empate
        if all(val != "" for val in b.values()):
            self.winner = "draw"
            self.winning_line = None


class LidarDetectorStateMachine:
    """
    Máquina de estados temporal para la detección del cluster y control de antirrebote.
    Estados: IDLE, CLUSTER_DETECTED, TRACKING, CLUSTER_LOST, COOLDOWN
    """
    def __init__(self, config: dict):
        self.config = config
        self.state = "IDLE"
        self.current_cell = None
        
        # Tiempos de control
        self.lost_timestamp = 0.0
        self.cooldown_timestamp = 0.0
        
        # Callbacks
        self.on_press_callback = None
        self.on_release_callback = None

    def set_callbacks(self, on_press, on_release):
        self.on_press_callback = on_press
        self.on_release_callback = on_release

    def update(self, cluster_info: dict):
        """
        Actualiza el estado de la detección según la presencia de un cluster.
        cluster_info: dict con {"centroid": (x,y), "points": n, "radius": r} o None si no hay cluster.
        """
        now = time.time() * 1000  # Milisegundos
        
        # 1. ESTADO: IDLE
        if self.state == "IDLE":
            if cluster_info is not None:
                cx, cy = cluster_info["centroid"]["x"], cluster_info["centroid"]["y"]
                self.current_cell = get_cell_name(cx, cy, self.config)
                self.state = "CLUSTER_DETECTED"
                
                # Ejecutar callback de detección
                if self.on_press_callback:
                    self.on_press_callback(self.current_cell)
                
                # Pasar inmediatamente a TRACKING
                self.state = "TRACKING"
                
        # 2. ESTADO: TRACKING
        elif self.state == "TRACKING":
            if cluster_info is None:
                # Se perdió la señal temporalmente, ir a CLUSTER_LOST
                self.state = "CLUSTER_LOST"
                self.lost_timestamp = now
            else:
                # El cluster sigue ahí, seguimos trackeando (actualizar celda por si se mueve,
                # pero el gameplay final se bloquea con el primer toque).
                pass
                
        # 3. ESTADO: CLUSTER_LOST (Debounce de pérdida de señal)
        elif self.state == "CLUSTER_LOST":
            if cluster_info is not None:
                # Se recuperó de inmediato la señal del cluster
                self.state = "TRACKING"
            else:
                # Si pasa más de 150 ms sin señal, se considera que el objeto realmente se retiró
                if (now - self.lost_timestamp) > 150:
                    self.state = "COOLDOWN"
                    self.cooldown_timestamp = now
                    if self.on_release_callback:
                        self.on_release_callback(self.current_cell)

        # 4. ESTADO: COOLDOWN (Tiempo muerto para evitar rebotes)
        elif self.state == "COOLDOWN":
            # Ignorar lecturas durante el cooldown_ms
            if (now - self.cooldown_timestamp) >= self.config["cooldown_ms"]:
                self.state = "IDLE"
                self.current_cell = None
