import React, { useState, useEffect } from "react";

const HOSTNAME = window.location.hostname || "localhost";
const API_BASE_URL = `http://${HOSTNAME}:8000`;

const BluetoothAudioPanel = () => {
  const [devices, setDevices] = useState([]);
  const [sinks, setSinks] = useState([]);
  const [currentSink, setCurrentSink] = useState("");
  const [volume, setVolume] = useState(100);
  
  const [scanning, setScanning] = useState(false);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [loadingSinks, setLoadingSinks] = useState(false);
  const [actionDevice, setActionDevice] = useState(null); // MAC en proceso
  
  const [feedbackMessage, setFeedbackMessage] = useState({ text: "", type: "" }); // type: 'success' | 'error' | 'info'

  // Cargar todos los datos al montar
  useEffect(() => {
    fetchDevices();
    fetchSinks();
    fetchVolume();
  }, []);

  const showFeedback = (text, type = "info") => {
    setFeedbackMessage({ text, type });
    // Autolimpiar feedback después de 5 segundos si no es un error largo
    if (type !== "error") {
      setTimeout(() => {
        setFeedbackMessage((prev) => (prev.text === text ? { text: "", type: "" } : prev));
      }, 5000);
    }
  };

  const fetchDevices = async () => {
    setLoadingDevices(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/bluetooth/devices`);
      if (res.ok) {
        const data = await res.json();
        setDevices(data);
      } else {
        showFeedback("Error al obtener dispositivos Bluetooth.", "error");
      }
    } catch (err) {
      console.error(err);
      showFeedback("No se pudo comunicar con el servidor Bluetooth.", "error");
    } finally {
      setLoadingDevices(false);
    }
  };

  const fetchSinks = async () => {
    setLoadingSinks(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/audio/sinks`);
      if (res.ok) {
        const data = await res.json();
        setSinks(data.sinks || []);
        setCurrentSink(data.default_sink || "");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSinks(false);
    }
  };

  const fetchVolume = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/audio/volume`);
      if (res.ok) {
        const data = await res.json();
        setVolume(data.level);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleScan = async () => {
    setScanning(true);
    showFeedback("Escaneando periféricos Bluetooth (3 segundos)...", "info");
    try {
      const res = await fetch(`${API_BASE_URL}/api/bluetooth/scan`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setDevices(data);
        showFeedback("Escaneo finalizado correctamente.", "success");
      } else {
        showFeedback("Error durante el escaneo.", "error");
      }
    } catch (err) {
      console.error(err);
      showFeedback("No se pudo iniciar el escaneo.", "error");
    } finally {
      setScanning(false);
    }
  };

  const handleConnect = async (mac, name) => {
    setActionDevice(mac);
    showFeedback(`Estableciendo enlace y conectando a ${name || mac}...`, "info");
    try {
      const res = await fetch(`${API_BASE_URL}/api/bluetooth/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mac }),
      });
      const data = await res.json();
      if (res.ok) {
        showFeedback(`Conectado con éxito a ${name || mac}.`, "success");
        // Refrescar dispositivos y sinks de audio tras la conexión
        await fetchDevices();
        await fetchSinks();
      } else {
        showFeedback(`Fallo al conectar: ${data.detail || "Error desconocido"}`, "error");
      }
    } catch (err) {
      console.error(err);
      showFeedback("Error de red al intentar conectar.", "error");
    } finally {
      setActionDevice(null);
    }
  };

  const handleDisconnect = async (mac, name) => {
    setActionDevice(mac);
    showFeedback(`Desconectando de ${name || mac}...`, "info");
    try {
      const res = await fetch(`${API_BASE_URL}/api/bluetooth/disconnect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mac }),
      });
      const data = await res.json();
      if (res.ok) {
        showFeedback(`Desconectado correctamente de ${name || mac}.`, "success");
        await fetchDevices();
        await fetchSinks();
      } else {
        showFeedback(`Fallo al desconectar: ${data.detail || "Error desconocido"}`, "error");
      }
    } catch (err) {
      console.error(err);
      showFeedback("Error de red al intentar desconectar.", "error");
    } finally {
      setActionDevice(null);
    }
  };

  const handleRemove = async (mac, name) => {
    if (!window.confirm(`¿Estás seguro de que deseas olvidar el periférico "${name || mac}"?`)) {
      return;
    }
    setActionDevice(mac);
    showFeedback(`Olvidando periférico ${name || mac}...`, "info");
    try {
      const res = await fetch(`${API_BASE_URL}/api/bluetooth/remove`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mac }),
      });
      const data = await res.json();
      if (res.ok) {
        showFeedback(`Dispositivo olvidado con éxito.`, "success");
        await fetchDevices();
        await fetchSinks();
      } else {
        showFeedback(`Fallo al olvidar: ${data.detail || "Error desconocido"}`, "error");
      }
    } catch (err) {
      console.error(err);
      showFeedback("Error de red al intentar desvincular.", "error");
    } finally {
      setActionDevice(null);
    }
  };

  const handleSinkChange = async (sinkName) => {
    setCurrentSink(sinkName);
    showFeedback("Cambiando la salida de audio predeterminada...", "info");
    try {
      const res = await fetch(`${API_BASE_URL}/api/audio/default-sink`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sink_name: sinkName }),
      });
      const data = await res.json();
      if (res.ok) {
        showFeedback("Salida de audio guardada y aplicada con éxito.", "success");
        await fetchSinks();
      } else {
        showFeedback(`Fallo al cambiar salida: ${data.detail || "Error desconocido"}`, "error");
      }
    } catch (err) {
      console.error(err);
      showFeedback("Error de red al cambiar salida de audio.", "error");
    }
  };

  const handleVolumeChange = async (val) => {
    const level = parseInt(val);
    setVolume(level);
    try {
      await fetch(`${API_BASE_URL}/api/audio/volume`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level }),
      });
    } catch (err) {
      console.error("Error al guardar volumen:", err);
    }
  };

  const handleTestSound = async () => {
    showFeedback("Enviando tono de prueba...", "info");
    try {
      const res = await fetch(`${API_BASE_URL}/api/audio/test-sound`, { method: "POST" });
      if (res.ok) {
        showFeedback("Sonido de prueba emitido.", "success");
      } else {
        showFeedback("Error al emitir el sonido en la bocina.", "error");
      }
    } catch (err) {
      console.error(err);
      showFeedback("Error al comunicar con la salida de audio.", "error");
    }
  };

  return (
    <div className="bluetooth-audio-panel">
      {/* Mensaje de Feedback */}
      {feedbackMessage.text && (
        <div className={`feedback-alert ${feedbackMessage.type}`}>
          {feedbackMessage.text}
        </div>
      )}

      {/* Control de Audio y Volumen */}
      <div className="panel-section">
        <h3>Ajustes de Audio General</h3>
        
        <div className="audio-controls-row">
          <div className="input-group" style={{ flex: 1 }}>
            <label>Salida de Audio Principal</label>
            <select
              value={currentSink}
              onChange={(e) => handleSinkChange(e.target.value)}
              disabled={loadingSinks}
              className="select-neon"
            >
              {sinks.length === 0 ? (
                <option value="">No se encontraron salidas de audio</option>
              ) : (
                sinks.map((s) => (
                  <option key={s.name} value={s.name}>
                    {s.display_name} {s.is_default ? "★" : ""}
                  </option>
                ))
              )}
            </select>
          </div>
          
          <button
            onClick={handleTestSound}
            className="btn btn-secondary btn-test-audio"
            title="Reproduce un tono de prueba por la salida activa"
          >
            🔊 Probar Audio
          </button>
        </div>

        <div className="input-group slider-group">
          <label>Volumen del Sistema ({volume}%)</label>
          <div className="slider-wrapper">
            <span className="slider-icon">🔈</span>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={volume}
              onChange={(e) => handleVolumeChange(e.target.value)}
              className="neon-slider"
            />
            <span className="slider-icon">🔊</span>
          </div>
        </div>
      </div>

      {/* Control de Periféricos Bluetooth */}
      <div className="panel-section">
        <div className="section-header-row">
          <h3>Periféricos Bluetooth</h3>
          <button
            onClick={handleScan}
            disabled={scanning}
            className={`btn btn-primary ${scanning ? "loading" : ""}`}
          >
            {scanning ? "Buscando..." : "🔍 Escanear Dispositivos"}
          </button>
        </div>

        {loadingDevices && <p className="loading-text">Cargando periféricos Bluetooth...</p>}

        {!loadingDevices && devices.length === 0 && (
          <p className="no-devices-text">No hay dispositivos Bluetooth vinculados ni detectados.</p>
        )}

        {devices.length > 0 && (
          <div className="device-cards-container">
            {devices.map((dev) => {
              const isConnecting = actionDevice === dev.mac;
              return (
                <div
                  key={dev.mac}
                  className={`device-card ${dev.connected ? "connected" : ""} ${dev.is_audio ? "audio-device" : ""}`}
                >
                  <div className="device-info">
                    <div className="device-title">
                      <span className="device-name">{dev.name || "Dispositivo sin nombre"}</span>
                      {dev.is_audio && <span className="device-badge-audio">Audio</span>}
                    </div>
                    <span className="device-mac">{dev.mac}</span>
                    <div className="device-badges">
                      {dev.connected ? (
                        <span className="status-badge connected">Conectado</span>
                      ) : dev.paired ? (
                        <span className="status-badge paired">Vinculado</span>
                      ) : (
                        <span className="status-badge discovered">Disponible</span>
                      )}
                    </div>
                  </div>

                  <div className="device-actions">
                    {dev.connected ? (
                      <button
                        onClick={() => handleDisconnect(dev.mac, dev.name)}
                        disabled={isConnecting}
                        className="btn btn-danger btn-sm"
                      >
                        {isConnecting ? "Procesando..." : "Desconectar"}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleConnect(dev.mac, dev.name)}
                        disabled={isConnecting}
                        className="btn btn-success btn-sm"
                      >
                        {isConnecting ? "Conectando..." : dev.paired ? "Conectar" : "Vincular"}
                      </button>
                    )}
                    {dev.paired && (
                      <button
                        onClick={() => handleRemove(dev.mac, dev.name)}
                        disabled={isConnecting}
                        className="btn btn-secondary btn-sm"
                        title="Olvidar dispositivo"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default BluetoothAudioPanel;
