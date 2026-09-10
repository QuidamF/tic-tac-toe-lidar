import React, { useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import CalibrationCanvas from "./components/CalibrationCanvas";
import ConfigPanel from "./components/ConfigPanel";
import GameBoard from "./components/GameBoard";
import GameplayBoardOnly from "./components/GameplayBoardOnly";
import GameCatalog from "./components/GameCatalog";
import GatoConfigPanel from "./components/GatoConfigPanel";
import ProjectorView from "./components/ProjectorView";
import "./App.css";

// Determinar las URLs basadas en el host de acceso
const HOSTNAME = window.location.hostname || "localhost";
const API_BASE_URL = `http://${HOSTNAME}:8000`;

function App() {
  const socketRef = useRef(null);
  const [config, setConfig] = useState(null);
  const [points, setPoints] = useState([]);
  const [cluster, setCluster] = useState(null);
  const [activeCell, setActiveCell] = useState(null);
  const [lidarConnected, setLidarConnected] = useState(false);
  const [socketStatus, setSocketStatus] = useState("disconnected");
  const [showBoard, setShowBoard] = useState(true);

  // Estado del juego local
  const [gameState, setGameState] = useState({
    board: {
      top_left: "", "top_center": "", "top_right": "",
      "mid_left": "", "center": "", "mid_right": "",
      "bottom_left": "", "bottom_center": "", "bottom_right": ""
    },
    current_player: "X",
    winner: null,
    winning_line: null
  });

  const [viewMode, setViewMode] = useState("dashboard"); // 'dashboard', 'catalog', 'gato_fullscreen', 'gato_config'

  const prevGameStateRef = useRef(null);

  // 1. Cargar configuración inicial por HTTP
  const loadConfig = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/config`);
      const data = await res.json();
      setConfig(data);
    } catch (err) {
      console.error("Error al cargar la configuración:", err);
    }
  };

  // 1.5 Cargar estado inicial del juego por HTTP
  const loadGameState = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/game_state`);
      const data = await res.json();
      setGameState(data);
    } catch (err) {
      console.error("Error al cargar el estado del juego:", err);
    }
  };

  useEffect(() => {
    loadConfig();
    loadGameState();

    // 2. Establecer conexión Socket.IO
    console.log(`[Socket.IO] Conectando a: ${API_BASE_URL}`);
    socketRef.current = io(API_BASE_URL);
    const socket = socketRef.current;

    socket.on("connect", () => {
      setSocketStatus("connected");
      console.log("[Socket.IO] Conectado exitosamente.");
      // Asegurarnos de sincronizar el modo actual al reconectar
      socket.emit("set_active_mode", viewMode);
    });

    socket.on("disconnect", () => {
      setSocketStatus("disconnected");
      setPoints([]);
      setCluster(null);
    });

    // Escuchar escaneos del LiDAR
    socket.on("lidar_scan", (data) => {
      if (data && data.points) {
        setPoints(data.points);
      }
    });

    // Escuchar clusters
    socket.on("lidar_cluster", (data) => {
      setCluster(data);
    });

    // Escuchar eventos de gameplay (toques)
    socket.on("gameplay_event", (data) => {
      if (data) {
        if (data.event === "press") {
          setActiveCell(data.cell);
        } else if (data.event === "release") {
          setActiveCell(null);
          setCluster(null);
        }
      }
    });

    // Escuchar cambios en el estado de la partida
    socket.on("game_state", (data) => {
      if (data) {
        setGameState(data);
      }
    });

    // Limpieza al desmontar
    return () => {
      socket.disconnect();
    };
  }, []);

  // Escuchar mensajes desde el iframe del catálogo
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data && event.data.type === 'LAUNCH_GATO') {
        setViewMode('gato_fullscreen');
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Sincronizar el modo de interacción activo con el backend
  useEffect(() => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit("set_active_mode", viewMode);
    }
  }, [viewMode, socketStatus]);

  // 2.5 Actualizar configuración temporalmente via Socket.IO para tiempo real
  const handleConfigChange = (newConfig) => {
    setConfig(newConfig);
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit("update_config_temp", newConfig);
    }
  };

  // 3. Guardar cambios de configuración en la base de datos
  const handleSaveConfig = async () => {
    if (!config) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const updatedData = await res.json();
      setConfig(updatedData);
      alert("¡Configuración guardada y persistida en SQLite con éxito!");
    } catch (err) {
      console.error("Error al guardar la configuración:", err);
      alert("Error al intentar guardar en el servidor.");
    }
  };

  // 4. Calibrar Muro
  const handleCalibrate = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/calibrate`, { method: "POST" });
      const data = await res.json();
      setLidarConnected(data.lidar_active);
      alert(`Calibración ejecutada. Modo LiDAR: ${data.mode.toUpperCase()}`);
    } catch (err) {
      console.error("Error en calibración:", err);
    }
  };

  // 5. Reiniciar Partida del Gato
  const handleResetGame = async () => {
    try {
      await fetch(`${API_BASE_URL}/api/reset`, { method: "POST" });
    } catch (err) {
      console.error("Error al reiniciar juego:", err);
    }
  };

  // 6. Inyectar toque simulado por click en celdas
  const handleSimulateTouch = async (x, y) => {
    try {
      await fetch(`${API_BASE_URL}/api/mock_touch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ x, y }),
      });
    } catch (err) {
      console.error("Error al enviar toque simulado:", err);
    }
  };

  if (!config) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Cargando Consola Gato LiDAR...</p>
      </div>
    );
  }

  const isBoardOnly = window.location.pathname === "/board" || window.location.search.includes("view=board");

  if (isBoardOnly) {
    return (
      <GameplayBoardOnly
        gameState={gameState}
        onReset={handleResetGame}
        config={config}
        onSimulateTouch={handleSimulateTouch}
        socketStatus={socketStatus}
      />
    );
  }

  if (viewMode === 'catalog') {
    return (
      <GameCatalog 
        cluster={cluster} 
        config={config} 
        onBackToDashboard={() => setViewMode('dashboard')} 
      />
    );
  }

  if (viewMode === 'gato_fullscreen') {
    return (
      <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
        <GameplayBoardOnly
          gameState={gameState}
          onReset={handleResetGame}
          config={config}
          onSimulateTouch={handleSimulateTouch}
          socketStatus={socketStatus}
        />
        <button 
          onClick={() => setViewMode('catalog')}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            padding: '10px 20px',
            background: 'rgba(0,0,0,0.6)',
            color: '#00F0FF',
            border: '1px solid #00F0FF',
            borderRadius: '8px',
            cursor: 'pointer',
            zIndex: 1000
          }}
        >
          Volver al Catálogo
        </button>
      </div>
    );
  }

  // --- MODO PROYECTOR ---
  if (window.location.pathname === "/projector") {
    return (
      <ProjectorView
        config={config}
        gameState={gameState}
        cluster={cluster}
        onReset={handleResetGame}
        onSimulateTouch={handleSimulateTouch}
        socketStatus={socketStatus}
        socket={socketRef.current}
      />
    );
  }

  if (viewMode === 'gato_config') {
    return (
      <GatoConfigPanel 
        config={config} 
        onConfigChange={handleConfigChange} 
        onSave={handleSaveConfig} 
        onBack={() => setViewMode('dashboard')}
        points={points}
        cluster={cluster}
        activeCell={activeCell}
      />
    );
  }

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="header-title">
          <h1>Gato LiDAR</h1>
          <p className="subtitle">Consola de Control, Calibración y Juego Táctil</p>
        </div>
        <div className="header-status">
          <div className="status-item">
            <span className="status-label">Servidor Websocket:</span>
            <span className={`status-indicator ${socketStatus}`}>
              {socketStatus === "connected" ? "Conectado" : "Desconectado"}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)', padding: '5px', borderRadius: '8px', border: '1px solid #333' }}>
            <span style={{ color: '#888', fontSize: '0.8rem', marginRight: '10px', marginLeft: '5px' }}>Proyector:</span>
            <button 
              className="btn-launch-catalog"
              onClick={() => {
                if (socketRef.current) socketRef.current.emit("launch_projector_app", "gato");
              }}
              style={{
                padding: '6px 12px',
                background: '#00F0FF',
                color: '#000',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 'bold',
                cursor: 'pointer',
                marginRight: '5px'
              }}
              title="Manda el Gato a la computadora del proyector"
            >
              📺 Gato
            </button>
            <select 
              onChange={(e) => {
                if (e.target.value && socketRef.current) {
                  socketRef.current.emit("launch_projector_app", e.target.value);
                  e.target.value = ""; // Reset after send
                }
              }}
              style={{
                padding: '6px 12px',
                background: '#D900FF',
                color: '#FFF',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 'bold',
                cursor: 'pointer',
                outline: 'none'
              }}
              title="Selecciona una experiencia para lanzarla al proyector"
            >
              <option value="">🚀 Lanzar al Proyector...</option>
              <option value="catalog">Catálogo Principal (Menú)</option>
              <option disabled>──────────</option>
              <option value="waves">Ondas Interactivas</option>
              <option value="bloom">Particle Bloom</option>
              <option value="nebula">Nebulosa Cósmica</option>
              <option value="garden">Jardín Vivo Procedural</option>
              <option value="sprites">Sprites Instanciados 3D</option>
              <option value="birds">Bandada de Aves 3D</option>
              <option value="linkedparticles">Partículas Vinculadas 3D</option>
              <option value="ghosts">👻 Caza Fantasmas (Mansión Embrujada)</option>
            </select>
          </div>

          <button 
            className="btn-launch-catalog"
            onClick={() => setViewMode('gato_config')}
            style={{
              marginLeft: '20px',
              padding: '8px 16px',
              background: '#333',
              color: '#FFF',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            ⚙️ Configurar Gato
          </button>
        </div>
      </header>

      {/* Grid Principal */}
      <main className="dashboard-grid">
        {/* Panel Izquierdo: Configuración */}
        <ConfigPanel
          config={config}
          onConfigChange={handleConfigChange}
          onSave={handleSaveConfig}
          onCalibrate={handleCalibrate}
          lidarConnected={lidarConnected}
          showBoard={showBoard}
          onToggleShowBoard={setShowBoard}
        />

        {/* Panel Central/Derecho: Canvas de Calibración (ocupa el resto del espacio) */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <CalibrationCanvas
            config={config}
            points={points}
            cluster={cluster}
            activeCell={activeCell}
            onConfigChange={handleConfigChange}
            showBoard={showBoard}
          />
        </div>
      </main>
    </div>
  );
}

export default App;
