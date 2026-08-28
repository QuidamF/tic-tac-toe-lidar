import React, { useState } from "react";
import CalibrationCanvas from "./CalibrationCanvas";

const GatoConfigPanel = ({ 
  config, 
  onConfigChange, 
  onSave, 
  onBack,
  points,
  cluster,
  activeCell 
}) => {
  const [activeTab, setActiveTab] = useState("board");
  
  const handleChange = (key, val) => {
    let parsedVal = val;
    if (typeof val === "string") {
      if (val === "true") parsedVal = true;
      else if (val === "false") parsedVal = false;
      else if (val !== "" && !isNaN(val)) {
        parsedVal = parseFloat(val);
      }
    }
    onConfigChange({ ...config, [key]: parsedVal });
  };

  const cellsList = [
    { name: "top_left", label: "Top-Left (1)" },
    { name: "top_center", label: "Top-Center (2)" },
    { name: "top_right", label: "Top-Right (3)" },
    { name: "mid_left", label: "Mid-Left (4)" },
    { name: "center", label: "Center (5)" },
    { name: "mid_right", label: "Mid-Right (6)" },
    { name: "bottom_left", label: "Bottom-Left (7)" },
    { name: "bottom_center", label: "Bottom-Center (8)" },
    { name: "bottom_right", label: "Bottom-Right (9)" }
  ];

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-title">
          <h1>Configuración del Gato</h1>
          <p className="subtitle">Dimensiones, Reglas y Hardware (GPIO)</p>
        </div>
        <div className="header-status">
          <button 
            className="btn-launch-catalog" 
            onClick={onBack} 
            style={{ padding: '8px 16px', background: '#333', color: '#FFF', border: '1px solid #555', borderRadius: '8px', cursor: 'pointer' }}
          >
            ⬅ Volver al Dashboard
          </button>
        </div>
      </header>
      
      <main className="dashboard-grid">
        {/* Panel Izquierdo: Configuración Específica */}
        <div className="config-panel">
          <div className="config-tabs">
            <button className={`tab-btn ${activeTab === "board" ? "active" : ""}`} onClick={() => setActiveTab("board")}>
              📏 Tablero
            </button>
            <button className={`tab-btn ${activeTab === "gameplay" ? "active" : ""}`} onClick={() => setActiveTab("gameplay")}>
              🎮 Reglas
            </button>
            <button className={`tab-btn ${activeTab === "gpio" ? "active" : ""}`} onClick={() => setActiveTab("gpio")}>
              🔌 GPIO
            </button>
          </div>

          {activeTab === "board" && (
            <div className="panel-section">
              <h3>Dimensiones y Posición del Tablero</h3>
              <div className="input-row">
                <div className="input-group">
                  <label>Posición X Tablero</label>
                  <input type="number" step="0.01" value={config.board_x || 0} onChange={(e) => handleChange("board_x", e.target.value)} />
                </div>
                <div className="input-group">
                  <label>Posición Y Tablero</label>
                  <input type="number" step="0.01" value={config.board_y || 0} onChange={(e) => handleChange("board_y", e.target.value)} />
                </div>
              </div>
              <div className="input-row">
                <div className="input-group">
                  <label>Ancho Tablero (m)</label>
                  <input type="number" step="0.01" value={config.board_width || 0} onChange={(e) => handleChange("board_width", e.target.value)} />
                </div>
                <div className="input-group">
                  <label>Alto Tablero (m)</label>
                  <input type="number" step="0.01" value={config.board_height || 0} onChange={(e) => handleChange("board_height", e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {activeTab === "gameplay" && (
            <div className="panel-section">
              <h3>🎮 Reglas y Modos de Juego</h3>
              
              <div className="input-group">
                <label>Modo de Juego</label>
                <select
                  value={config.game_mode || "pvp"}
                  onChange={(e) => handleChange("game_mode", e.target.value)}
                >
                  <option value="pvp">👥 Jugador vs Jugador (PVP)</option>
                  <option value="pvcpu">🤖 Jugador vs CPU (PVCPU)</option>
                </select>
                <p className="help-text">
                  Define si juegan dos personas físicamente o si la máquina controla al Jugador O.
                </p>
              </div>

              <div className="input-group checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={config.time_limit_enabled === true || config.time_limit_enabled === "true"}
                    onChange={(e) => handleChange("time_limit_enabled", e.target.checked)}
                  />
                  <span>⏱️ Límite de Tiempo de Partida</span>
                </label>
                <p className="help-text">
                  Si se activa, la partida expira automáticamente tras agotarse el tiempo global de juego.
                </p>
              </div>

              {(config.time_limit_enabled === true || config.time_limit_enabled === "true") && (
                <div className="input-group animate-fade-in">
                  <label>Tiempo de Juego ({config.time_limit_seconds || 120} s)</label>
                  <input
                    type="range"
                    min="10"
                    max="300"
                    step="10"
                    value={config.time_limit_seconds || 120}
                    onChange={(e) => handleChange("time_limit_seconds", e.target.value)}
                  />
                </div>
              )}

              <div className="input-group">
                <label>Re-inicio Automático ({config.auto_reset_seconds || 10} s)</label>
                <input
                  type="range"
                  min="3"
                  max="30"
                  step="1"
                  value={config.auto_reset_seconds || 10}
                  onChange={(e) => handleChange("auto_reset_seconds", e.target.value)}
                />
                <p className="help-text">
                  Segundos de espera tras finalizar el juego (por victoria o empate) antes de reiniciar la partida automáticamente.
                </p>
              </div>

              <div className="input-group">
                <label>Intento por Turno</label>
                <select
                  value={config.single_attempt_mode === true || config.single_attempt_mode === "true" ? "true" : "false"}
                  onChange={(e) => handleChange("single_attempt_mode", e.target.value === "true")}
                >
                  <option value="false">🔄 Cambio de turno hasta conseguir casilla (libre)</option>
                  <option value="true">🎯 Solo 1 intento por turno (tiro fallido cambia turno)</option>
                </select>
                <p className="help-text">
                  En modo "Solo 1 intento", si se lanza a una celda no válida (ej. ocupada o ya ganada), se pierde el intento y cambia el turno.
                </p>
              </div>

              <div className="input-group checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={config.steal_enabled === undefined ? true : (config.steal_enabled === true || config.steal_enabled === "true")}
                    onChange={(e) => handleChange("steal_enabled", e.target.checked)}
                  />
                  <span>⚔️ Permitir Robar Casilla</span>
                </label>
                <p className="help-text">
                  Permite a los jugadores robar casillas que ya pertenecen al oponente.
                </p>
              </div>
            </div>
          )}

          {activeTab === "gpio" && (
            <div className="panel-section" style={{ overflowY: 'auto', maxHeight: '500px' }}>
              <h3>5. Mapeos de Pines GPIO (Leds Físicos)</h3>
              <table className="gpio-table">
                <thead>
                  <tr>
                    <th>Casilla</th>
                    <th>Toque</th>
                    <th>Ficha X</th>
                    <th>Ficha O</th>
                  </tr>
                </thead>
                <tbody>
                  {cellsList.map((item) => (
                    <tr key={item.name}>
                      <td style={{ fontWeight: 500 }}>{item.label}</td>
                      <td>
                        <input
                          type="number"
                          value={config[`gpio_${item.name}`] !== undefined ? config[`gpio_${item.name}`] : -1}
                          onChange={(e) => handleChange(`gpio_${item.name}`, e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={config[`gpio_${item.name}_x`] !== undefined ? config[`gpio_${item.name}_x`] : -1}
                          onChange={(e) => handleChange(`gpio_${item.name}_x`, e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={config[`gpio_${item.name}_o`] !== undefined ? config[`gpio_${item.name}_o`] : -1}
                          onChange={(e) => handleChange(`gpio_${item.name}_o`, e.target.value)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {/* Mapeos GPIO de Turno */}
              <div className="gpio-turn-container" style={{ marginTop: '15px', display: 'flex', gap: '20px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', fontWeight: 500 }}>
                    GPIO Turno X
                  </label>
                  <input
                    type="number"
                    value={config.gpio_turn_x !== undefined ? config.gpio_turn_x : -1}
                    onChange={(e) => handleChange('gpio_turn_x', e.target.value)}
                    style={{ width: '100%', padding: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '4px' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', fontWeight: 500 }}>
                    GPIO Turno O
                  </label>
                  <input
                    type="number"
                    value={config.gpio_turn_o !== undefined ? config.gpio_turn_o : -1}
                    onChange={(e) => handleChange('gpio_turn_o', e.target.value)}
                    style={{ width: '100%', padding: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '4px' }}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="panel-actions">
            <button className="btn btn-primary" onClick={onSave}>Guardar Cambios</button>
          </div>
        </div>

        {/* Panel Central/Derecho: Canvas de Calibración */}
        {/* Aquí ocupamos el resto del espacio del grid para ver cómo está quedando el tablero */}
        <div style={{ gridColumn: 'span 2' }}>
          <CalibrationCanvas 
             config={config} 
             points={points}
             cluster={cluster}
             activeCell={activeCell}
             onConfigChange={onConfigChange}
             showBoard={true}
          />
        </div>
      </main>
    </div>
  );
};

export default GatoConfigPanel;
