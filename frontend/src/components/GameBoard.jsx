import React from "react";

const GameBoard = ({ gameState, onReset, config, onSimulateTouch }) => {
  const { board, current_player, winner } = gameState;

  // Celdas distribuidas en estructura 3x3 (top a bottom)
  const cellGrid = [
    ["top_left", "top_center", "top_right"],
    ["mid_left", "center", "mid_right"],
    ["bottom_left", "bottom_center", "bottom_right"]
  ];

  const cellLabels = {
    top_left: "Top-Left (1)",
    top_center: "Top-Center (2)",
    top_right: "Top-Right (3)",
    mid_left: "Mid-Left (4)",
    center: "Center (5)",
    mid_right: "Mid-Right (6)",
    bottom_left: "Bottom-Left (7)",
    bottom_center: "Bottom-Center (8)",
    bottom_right: "Bottom-Right (9)"
  };

  const handleCellClick = (cellName, row, col) => {
    // Si ya hay ganador, no hacer nada
    if (winner) return;

    // Si la celda pertenece al jugador actual, no permitir robarse a sí mismo
    if (board[cellName] === current_player) return;

    // Calcular el centro geométrico de esta celda en coordenadas del muro (metros)
    const bw = config.board_width;
    const bh = config.board_height;
    const bx = config.board_x;
    const by = config.board_y;

    const cellW = bw / 3;
    const cellH = bh / 3;

    // Col es 0, 1, 2 (izq a der)
    const cx = bx + (col + 0.5) * cellW;
    // Fila es 0, 1, 2 (arriba a abajo). En el muro Y aumenta hacia arriba.
    const cy = by + (2 - row + 0.5) * cellH;

    onSimulateTouch(cx, cy);
  };

  return (
    <div className="game-container">
      <div className="game-header">
        <h3>Tablero de Juego (Tic Tac Toe)</h3>
        
        {winner ? (
          <div className={`game-status winner ${winner}`}>
            {winner === "draw" ? "¡Empate técnico!" : `¡Ganador: Jugador ${winner}!`}
          </div>
        ) : (
          <div className="game-status turn">
            Turno actual: <span className={`player-badge ${current_player}`}>{current_player}</span>
          </div>
        )}
      </div>

      <div className="gato-board">
        {cellGrid.map((rowArr, rowIndex) => (
          <div className="gato-row" key={rowIndex}>
            {rowArr.map((cellName, colIndex) => {
              const val = board[cellName] || "";
              const winningLine = gameState.winning_line || [];
              const isWinningCell = winningLine.includes(cellName);
              return (
                <button
                  key={cellName}
                  className={`gato-cell ${val} ${winner ? "disabled" : ""} ${isWinningCell ? "winning-cell" : ""}`}
                  onClick={() => handleCellClick(cellName, rowIndex, colIndex)}
                  disabled={board[cellName] === current_player || !!winner}
                >
                  <span className="cell-symbol">{val}</span>
                  <span className="cell-label">{cellLabels[cellName]}</span>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div className="game-actions">
        <button className="btn btn-danger" onClick={onReset}>
          Reiniciar Partida
        </button>
      </div>
    </div>
  );
};

export default GameBoard;
