import React, { useRef, useEffect } from "react";

const GameCatalog = ({ cluster, config, onBackToDashboard, autoLaunch }) => {
  const iframeRef = useRef(null);
  
  const iframeSrc = autoLaunch ? `/catalogo/index.html?launch=${autoLaunch}` : "/catalogo/index.html";
  const lastTriggerTime = useRef(0);
  const lastTriggerPos = useRef({ x: 0, y: 0 });

  const wasActive = useRef(false);

  const [debugPos, setDebugPos] = React.useState(null);

  const lastPx = useRef(0);
  const lastPy = useRef(0);

  // Enviar eventos de LiDAR al iframe
  useEffect(() => {
    const iframeWin = iframeRef.current?.contentWindow;
    if (!iframeWin || !iframeWin.CatalogApp) return;

    if (cluster && cluster.centroid && config) {
      // Obtenemos dimensiones del iframe (que equivale a la pantalla del proyector)
      const width = iframeRef.current.clientWidth || window.innerWidth;
      const height = iframeRef.current.clientHeight || window.innerHeight;

      // Mapeamos de coordenadas del tablero (metros) a píxeles de pantalla.
      // Asumimos que el proyector ilumina exactamente el área definida por el tablero.
      let px = ((cluster.centroid.x - config.board_x) / config.board_width) * width;
      let py = height - (((cluster.centroid.y - config.board_y) / config.board_height) * height);
      
      // Si cae en los extremos absolutos de la esquina superior izquierda (0,0), ignorar como fantasma de borde
      if (px <= 10 && py <= 10) {
        setDebugPos(null);
        if (wasActive.current && iframeWin.CatalogApp.triggerEvent) {
          wasActive.current = false;
          iframeWin.CatalogApp.triggerEvent('pointerup', lastPx.current, lastPy.current);
        }
        return;
      }

      lastPx.current = px;
      lastPy.current = py;
      
      console.log(`[React] LiDAR event: raw_x=${cluster.centroid.x.toFixed(2)}, raw_y=${cluster.centroid.y.toFixed(2)} -> mapped px=${px.toFixed(0)}, py=${py.toFixed(0)}`);
      
      setDebugPos({ x: px, y: py });

      // Usar la nueva API de eventos continuos si está disponible
      if (iframeWin.CatalogApp.triggerEvent) {
        if (!wasActive.current) {
          wasActive.current = true;
          iframeWin.CatalogApp.triggerEvent('pointerdown', px, py);
        } else {
          // Ya hay un toque activo, es un arrastre
          iframeWin.CatalogApp.triggerEvent('pointermove', px, py);
        }
      } else {
        // Fallback a API antigua
        const now = Date.now();
        const dist = Math.sqrt(
          Math.pow(cluster.centroid.x - lastTriggerPos.current.x, 2) + 
          Math.pow(cluster.centroid.y - lastTriggerPos.current.y, 2)
        );
        if (now - lastTriggerTime.current > 300 || dist > 0.15) {
          lastTriggerTime.current = now;
          lastTriggerPos.current = { x: cluster.centroid.x, y: cluster.centroid.y };
          iframeWin.CatalogApp.triggerInput(px, py);
        }
      }
    } else {
      setDebugPos(null);
      // No hay cluster (se levantó el dedo/objeto)
      if (wasActive.current && iframeWin.CatalogApp.triggerEvent) {
        wasActive.current = false;
        iframeWin.CatalogApp.triggerEvent('pointerup', lastPx.current, lastPy.current);
      }
    }
  }, [cluster, config]);

  return (
    <div className="game-catalog-wrapper" style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <iframe
        key={autoLaunch || 'catalog'}
        ref={iframeRef}
        src={iframeSrc}
        title="Catálogo de Experiencias"
        style={{ width: '100%', height: '100%', border: 'none' }}
      />
      {/* Botón flotante para regresar a la consola de administración */}
      <button 
        onClick={onBackToDashboard}
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
        Consola LiDAR
      </button>

      {/* Indicador visual de depuración de toque */}
      {debugPos && (
        <div style={{
          position: 'absolute',
          left: debugPos.x - 10,
          top: debugPos.y - 10,
          width: '20px',
          height: '20px',
          backgroundColor: 'red',
          borderRadius: '50%',
          pointerEvents: 'none',
          zIndex: 9999,
          boxShadow: '0 0 10px red'
        }} />
      )}
    </div>
  );
};

export default GameCatalog;
