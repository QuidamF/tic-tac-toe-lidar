import React, { useState, useEffect, useRef } from "react";

// Web Audio API Sound Synthesizer for Retro-Futuristic FX
const playSynthSound = (type) => {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const audioCtx = new AudioContextClass();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    const now = audioCtx.currentTime;

    if (type === "X") {
      // Futuristic high-pitched cyber sweep
      osc.type = "sine";
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.exponentialRampToValueAtTime(987.77, now + 0.12); // B5
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.12);
    } else if (type === "O") {
      // Smooth tech synth drop
      osc.type = "triangle";
      osc.frequency.setValueAtTime(329.63, now); // E4
      osc.frequency.exponentialRampToValueAtTime(220.00, now + 0.18); // A3
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.start(now);
      osc.stop(now + 0.18);
    } else if (type === "win") {
      // Cybernetic triumphant arpeggio
      const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // C4, E4, G4, C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const noteOsc = audioCtx.createOscillator();
        const noteGain = audioCtx.createGain();
        noteOsc.connect(noteGain);
        noteGain.connect(audioCtx.destination);
        noteOsc.type = "sine";
        noteOsc.frequency.setValueAtTime(freq, now + idx * 0.08);
        noteGain.gain.setValueAtTime(0.06, now + idx * 0.08);
        noteGain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.3);
        noteOsc.start(now + idx * 0.08);
        noteOsc.stop(now + idx * 0.08 + 0.3);
      });
    } else if (type === "draw") {
      // Disappointment sound (descending low pulse)
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(146.83, now); // D3
      osc.frequency.linearRampToValueAtTime(73.42, now + 0.45); // D2
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc.start(now);
      osc.stop(now + 0.45);
    } else if (type === "reset") {
      // Sci-fi power-up laser sweep
      osc.type = "sine";
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(1500, now + 0.4);
      gain.gain.setValueAtTime(0.07, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);
    } else if (type === "steal") {
      // Swooping retro cyber alert sound
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(146.83, now + 0.35); // D3
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    }
  } catch (e) {
    console.warn("AudioContext blocked or uninitialized by browser policy:", e);
  }
};

// Animated SVGs for Player Symbols
const XSymbolSvg = () => (
  <svg className="cyber-symbol-svg x-svg" viewBox="0 0 100 100">
    <line x1="20" y1="20" x2="80" y2="80" stroke="var(--accent-cyan)" strokeWidth="12" strokeLinecap="round" />
    <line x1="80" y1="20" x2="20" y2="80" stroke="var(--accent-cyan)" strokeWidth="12" strokeLinecap="round" />
  </svg>
);

const OSymbolSvg = () => (
  <svg className="cyber-symbol-svg o-svg" viewBox="0 0 100 100">
    <circle cx="50" cy="50" r="30" fill="none" stroke="var(--accent-green)" strokeWidth="12" strokeLinecap="round" />
  </svg>
);

const GameplayBoardOnly = ({ gameState, onReset, config, onSimulateTouch, socketStatus }) => {
  const { board, current_player, winner } = gameState;
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showHeader, setShowHeader] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const prevBoardRef = useRef(board);
  const prevWinnerRef = useRef(winner);

  // Auto-play sound effects when gameState changes
  useEffect(() => {
    if (!soundEnabled) {
      prevBoardRef.current = board;
      prevWinnerRef.current = winner;
      return;
    }

    // Check if the board was cleared
    const wasCleared = Object.values(board).every((v) => v === "") &&
      !Object.values(prevBoardRef.current).every((v) => v === "");

    if (wasCleared) {
      playSynthSound("reset");
    } else {
      // Find the cell that changed
      let changedCell = null;
      let symbol = null;
      let isSteal = false;
      for (const cell in board) {
        const prevVal = prevBoardRef.current[cell];
        const currentVal = board[cell];
        if (currentVal !== prevVal && currentVal !== "") {
          changedCell = cell;
          symbol = currentVal;
          if (prevVal !== "") {
            isSteal = true;
          }
          break;
        }
      }

      if (changedCell && symbol) {
        if (isSteal) {
          playSynthSound("steal");
        } else {
          playSynthSound(symbol);
        }
      }
    }

    // Check if a winner was declared
    if (winner && winner !== prevWinnerRef.current) {
      if (winner === "draw") {
        playSynthSound("draw");
      } else {
        playSynthSound("win");
      }
    }

    prevBoardRef.current = board;
    prevWinnerRef.current = winner;
  }, [board, winner, soundEnabled]);

  // Cells grid definition (3x3 mapping)
  const cellGrid = [
    ["top_left", "top_center", "top_right"],
    ["mid_left", "center", "mid_right"],
    ["bottom_left", "bottom_center", "bottom_right"]
  ];

  const handleCellClick = (cellName, row, col) => {
    if (winner) return;
    if (board[cellName] === current_player) return;

    // Calculate simulated screen click coordinate in meters based on board configuration
    const bw = config.board_width;
    const bh = config.board_height;
    const bx = config.board_x;
    const by = config.board_y;

    const cellW = bw / 3;
    const cellH = bh / 3;

    const cx = bx + (col + 0.5) * cellW;
    const cy = by + (2 - row + 0.5) * cellH; // Y increases upwards

    onSimulateTouch(cx, cy);
  };

  return (
    <div className="gameplay-only-view">
      {/* Background neon grids */}
      <div className="gameplay-bg-grid"></div>
      <div className="gameplay-bg-radial"></div>

      {/* Floating connection indicator */}
      <div className={`gameplay-conn-status ${socketStatus}`}>
        {socketStatus === "connected" ? "Sync OK" : "Offline"}
      </div>

      <div className={`gameplay-viewport ${showHeader ? "with-hud" : "no-hud"}`}>
        {showHeader && (
          <div className="gameplay-status-hud">
            {winner ? (
              <div className={`hud-alert winner-glow-${winner}`}>
                {winner === "draw" ? (
                  <h1 className="hud-title draw-text">¡EMPATE TÉCNICO!</h1>
                ) : (
                  <h1 className="hud-title winner-text">
                    ¡JUGADOR {winner} VICTORIOSO!
                  </h1>
                )}
                <p className="hud-subtitle">Partida terminada</p>
              </div>
            ) : (
              <div className="hud-turn">
                <p className="turn-label">TURNO ACTUAL</p>
                <div className="turn-indicator">
                  <span className={`turn-badge ${current_player}`}>
                    JUGADOR {current_player}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Central Game Board */}
        <div className={`gameplay-grid-container ${winner ? "game-finished" : ""}`}>
          <div className="gameplay-board-wrapper">
            {cellGrid.map((rowArr, rowIndex) => (
              <div className="gameplay-board-row" key={rowIndex}>
                {rowArr.map((cellName, colIndex) => {
                  const val = board[cellName] || "";
                  const winningLine = gameState.winning_line || [];
                  const isWinningCell = winningLine.includes(cellName);
                  return (
                    <button
                      key={cellName}
                      className={`gameplay-board-cell ${val} ${winner ? "disabled" : ""} ${isWinningCell ? "winning-cell" : ""}`}
                      onClick={() => handleCellClick(cellName, rowIndex, colIndex)}
                      disabled={board[cellName] === current_player || !!winner}
                    >
                      {val === "X" && <XSymbolSvg />}
                      {val === "O" && <OSymbolSvg />}
                      
                      {/* Sub-label for OBS setup or reference */}
                      <span className="gameplay-cell-index">
                        {rowIndex * 3 + colIndex + 1}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Collapsible Futuristic Floating Menu */}
      <div className={`gameplay-floating-menu ${menuOpen ? "expanded" : ""}`}>
        <button
          className="floating-menu-trigger"
          onClick={() => setMenuOpen(!menuOpen)}
          title="Configuraciones de Visualización"
        >
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>

        {menuOpen && (
          <div className="floating-menu-content">
            <h4 className="menu-title">Control Gameplay</h4>
            
            <button className="menu-btn btn-reset" onClick={onReset}>
              Reiniciar Juego
            </button>

            <button className="menu-btn" onClick={toggleFullscreen}>
              {isFullscreen ? "Pantalla Normal" : "Pantalla Completa"}
            </button>

            <label className="menu-toggle">
              <input
                type="checkbox"
                checked={soundEnabled}
                onChange={(e) => setSoundEnabled(e.target.checked)}
              />
              <span>Efectos de Sonido</span>
            </label>

            <label className="menu-toggle">
              <input
                type="checkbox"
                checked={showHeader}
                onChange={(e) => setShowHeader(e.target.checked)}
              />
              <span>Mostrar Encabezado</span>
            </label>

            <button
              className="menu-btn btn-console"
              onClick={() => {
                // Clear query parameters or redirect to root
                window.location.href = window.location.origin;
              }}
            >
              Ir a la Consola
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GameplayBoardOnly;
