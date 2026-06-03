import React, { useState } from "react";
import BluetoothAudioPanel from "./BluetoothAudioPanel";

const ConfigPanel = ({ config, onConfigChange, onSave, onCalibrate, lidarConnected }) => {
  const [activeTab, setActiveTab] = useState("lidar");
  
  const handleChange = (key, val) => {
    let parsedVal = val;
    // Cast strings representing numbers to floats/ints
    if (val !== "" && !isNaN(val)) {
      parsedVal = parseFloat(val);
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
    <div className="config-panel">
      <div className="panel-section header-section">
        <h2>Panel de Configuración</h2>
        <div className="status-container">
          <span className={`status-badge ${lidarConnected ? "connected" : "simulated"}`}>
            {lidarConnected ? "LiDAR Físico Activo" : "Modo Simulación (Mock)"}
          </span>
        </div>
      </div>

      {/* Tabs de navegación */}
      <div className="config-tabs">
        <button
          className={`tab-btn ${activeTab === "lidar" ? "active" : ""}`}
          onClick={() => setActiveTab("lidar")}
        >
          🎯 LiDAR y Juego
        </button>
        <button
          className={`tab-btn ${activeTab === "audio" ? "active" : ""}`}
          onClick={() => setActiveTab("audio")}
        >
          🔊 Conectividad y Audio
        </button>
      </div>

      {activeTab === "lidar" ? (
        <>
          {/* Sección LiDAR */}
          <div className="panel-section">
            <h3>1. Posición y Calibración del LiDAR</h3>
            
            <div className="input-group">
              <label>LiDAR X (Posición horizontal: {config.lidar_x} m)</label>
              <input
                type="range"
                min="0"
                max={config.wall_width || 3.5}
                step="0.05"
                value={config.lidar_x || 0}
                onChange={(e) => handleChange("lidar_x", e.target.value)}
              />
            </div>

            <div className="input-group">
              <label>LiDAR Y (Altura: {config.lidar_y} m)</label>
              <input
                type="range"
                min="0"
                max={config.wall_height || 3.5}
                step="0.05"
                value={config.lidar_y || 0}
                onChange={(e) => handleChange("lidar_y", e.target.value)}
              />
            </div>

            <div className="input-group">
              <label>Rotación del LiDAR ({config.lidar_rotation}°)</label>
              <input
                type="range"
                min="0"
                max="360"
                step="1"
                value={config.lidar_rotation || 0}
                onChange={(e) => handleChange("lidar_rotation", e.target.value)}
              />
            </div>

            <div className="input-row">
              <div className="input-group">
                <label>Ángulo Mín ({config.observation_angle_min}°)</label>
                <input
                  type="number"
                  value={config.observation_angle_min || 0}
                  onChange={(e) => handleChange("observation_angle_min", e.target.value)}
                />
              </div>
              <div className="input-group">
                <label>Ángulo Máx ({config.observation_angle_max}°)</label>
                <input
                  type="number"
                  value={config.observation_angle_max || 0}
                  onChange={(e) => handleChange("observation_angle_max", e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Sección Tablero */}
          <div className="panel-section">
            <h3>2. Dimensiones de Muro y Tablero</h3>

            <div className="input-row">
              <div className="input-group">
                <label>Ancho Muro (m)</label>
                <input
                  type="number"
                  step="0.1"
                  value={config.wall_width || 3.0}
                  onChange={(e) => handleChange("wall_width", e.target.value)}
                />
              </div>
              <div className="input-group">
                <label>Alto Muro (m)</label>
                <input
                  type="number"
                  step="0.1"
                  value={config.wall_height || 3.0}
                  onChange={(e) => handleChange("wall_height", e.target.value)}
                />
              </div>
            </div>
            
            <div className="input-row">
              <div className="input-group">
                <label>Posición X Tablero</label>
                <input
                  type="number"
                  step="0.01"
                  value={config.board_x || 0}
                  onChange={(e) => handleChange("board_x", e.target.value)}
                />
              </div>
              <div className="input-group">
                <label>Posición Y Tablero</label>
                <input
                  type="number"
                  step="0.01"
                  value={config.board_y || 0}
                  onChange={(e) => handleChange("board_y", e.target.value)}
                />
              </div>
            </div>

            <div className="input-row">
              <div className="input-group">
                <label>Ancho Tablero (m)</label>
                <input
                  type="number"
                  step="0.01"
                  value={config.board_width || 0}
                  onChange={(e) => handleChange("board_width", e.target.value)}
                />
              </div>
              <div className="input-group">
                <label>Alto Tablero (m)</label>
                <input
                  type="number"
                  step="0.01"
                  value={config.board_height || 0}
                  onChange={(e) => handleChange("board_height", e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Filtros de Cluster */}
          <div className="panel-section">
            <h3>3. Filtros del Balón (Clustering)</h3>
            
            <div className="input-row">
              <div className="input-group">
                <label>Puntos Mínimos</label>
                <input
                  type="number"
                  value={config.cluster_min_points || 0}
                  onChange={(e) => handleChange("cluster_min_points", e.target.value)}
                />
              </div>
              <div className="input-group">
                <label>Puntos Máximos</label>
                <input
                  type="number"
                  value={config.cluster_max_points || 0}
                  onChange={(e) => handleChange("cluster_max_points", e.target.value)}
                />
              </div>
            </div>

            <div className="input-row">
              <div className="input-group">
                <label>Radio Esperado (m)</label>
                <input
                  type="number"
                  step="0.01"
                  value={config.expected_cluster_radius || 0}
                  onChange={(e) => handleChange("expected_cluster_radius", e.target.value)}
                />
              </div>
              <div className="input-group">
                <label>Distancia Máx (m)</label>
                <input
                  type="number"
                  step="0.01"
                  value={config.cluster_max_dist || 0}
                  onChange={(e) => handleChange("cluster_max_dist", e.target.value)}
                />
              </div>
            </div>

            <div className="input-group">
              <label>Cooldown Antirrebote (ms)</label>
              <input
                type="number"
                step="50"
                value={config.cooldown_ms || 0}
                onChange={(e) => handleChange("cooldown_ms", e.target.value)}
              />
            </div>
          </div>

          {/* Servidores MQTT */}
          <div className="panel-section">
            <h3>4. Comunicación MQTT (ESP32)</h3>
            <div className="input-row">
              <div className="input-group-70">
                <label>Broker IP / Host</label>
                <input
                  type="text"
                  value={config.mqtt_broker || ""}
                  onChange={(e) => handleChange("mqtt_broker", e.target.value)}
                />
              </div>
              <div className="input-group-30">
                <label>Puerto</label>
                <input
                  type="number"
                  value={config.mqtt_port || 0}
                  onChange={(e) => handleChange("mqtt_port", e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Mapeos GPIO */}
          <div className="panel-section">
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
          </div>

          {/* Acciones del Panel */}
          <div className="panel-actions">
            <button className="btn btn-secondary" onClick={onCalibrate}>
              Calibrar Muro
            </button>
            <button className="btn btn-primary" onClick={onSave}>
              Guardar Cambios
            </button>
          </div>
        </>
      ) : (
        <BluetoothAudioPanel />
      )}
    </div>
  );
};

export default ConfigPanel;
