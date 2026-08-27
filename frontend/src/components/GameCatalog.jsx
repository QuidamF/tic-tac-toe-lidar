import React, { useRef, useEffect } from "react";

const GameCatalog = ({ cluster, config, onBackToDashboard }) => {
  const iframeRef = useRef(null);
  const lastTriggerTime = useRef(0);
  const lastTriggerPos = useRef({ x: 0, y: 0 });

  // Enviar eventos de LiDAR al iframe
  useEffect(() => {
    if (cluster && cluster.centroid && config && iframeRef.current) {
      const iframe = iframeRef.current;
      const iframeWin = iframe.contentWindow;
      
      if (iframeWin && iframeWin.CatalogApp && iframeWin.CatalogApp.triggerInput) {
        const now = Date.now();
        
        // Calcular la distancia euclidiana en metros desde el último toque
        const dist = Math.sqrt(
          Math.pow(cluster.centroid.x - lastTriggerPos.current.x, 2) + 
          Math.pow(cluster.centroid.y - lastTriggerPos.current.y, 2)
        );

        // THROTTLING: Solo disparamos la interacción si han pasado más de 300ms 
        // O si el toque se movió más de 15 centímetros (0.15m) respecto al anterior.
        // Esto evita que las 60 tramas por segundo saturen la memoria y Web Audio API del navegador.
        if (now - lastTriggerTime.current > 300 || dist > 0.15) {
          lastTriggerTime.current = now;
          lastTriggerPos.current = { x: cluster.centroid.x, y: cluster.centroid.y };

          // Obtenemos dimensiones del iframe
          const width = iframe.clientWidth || window.innerWidth;
          const height = iframe.clientHeight || window.innerHeight;

          // Mapeamos de coordenadas del muro (metros) a píxeles de pantalla
          let px = (cluster.centroid.x / config.wall_width) * width;
          let py = height - ((cluster.centroid.y / config.wall_height) * height);

          // Disparamos la entrada simulando un toque
          iframeWin.CatalogApp.triggerInput(px, py);
        }
      }
    }
  }, [cluster, config]);

  return (
    <div className="game-catalog-wrapper" style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <iframe
        ref={iframeRef}
        src="/catalogo/index.html"
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
    </div>
  );
};

export default GameCatalog;
