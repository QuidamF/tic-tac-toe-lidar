import React, { useState, useEffect } from "react";
import GameplayBoardOnly from "./GameplayBoardOnly";
import GameCatalog from "./GameCatalog";

const ProjectorView = ({ config, gameState, cluster, onReset, onSimulateTouch, socketStatus, socket }) => {
  const [currentApp, setCurrentApp] = useState("waiting"); // 'waiting', 'gato', 'catalog'

  useEffect(() => {
    if (!socket) return;
    
    const handleSetApp = (app_name) => {
      console.log("[ProjectorView] Recibida orden de cambiar app a:", app_name);
      setCurrentApp(app_name);
    };

    socket.on("set_projector_app", handleSetApp);

    return () => {
      socket.off("set_projector_app", handleSetApp);
    };
  }, [socket]);

  const requestFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    }
  };

  if (currentApp === "gato") {
    return (
      <div className="fullscreen-container" onClick={requestFullscreen}>
        <GameplayBoardOnly 
          gameState={gameState}
          onReset={onReset}
          config={config}
          onSimulateTouch={onSimulateTouch}
          socketStatus={socketStatus}
        />
      </div>
    );
  }

  if (["catalog", "waves", "bloom", "nebula", "garden", "sprites", "birds", "linkedparticles", "ghosts"].includes(currentApp)) {
    return (
      <div className="fullscreen-container" onClick={requestFullscreen}>
        <GameCatalog 
          autoLaunch={currentApp === "catalog" ? null : currentApp} 
          cluster={cluster}
          config={config}
        />
      </div>
    );
  }

  // Vista de espera
  return (
    <div 
      className="projector-waiting-screen" 
      onClick={requestFullscreen}
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0a0a0f',
        color: '#00F0FF',
        fontFamily: 'Outfit, sans-serif'
      }}
    >
      <svg className="floating-cube-svg" width="120" height="120" viewBox="0 0 100 100" style={{ animation: 'float 4s ease-in-out infinite' }}>
        <path d="M50 10 L90 30 L90 70 L50 90 L10 70 L10 30 Z" fill="none" stroke="#00F0FF" strokeWidth="2" />
        <path d="M50 10 L50 50 M10 30 L50 50 M90 30 L50 50 M50 90 L50 50" stroke="#00F0FF" strokeWidth="2" opacity="0.5" />
      </svg>
      
      <h1 style={{ marginTop: '30px', fontSize: '2.5rem', letterSpacing: '2px', textShadow: '0 0 10px rgba(0,240,255,0.5)' }}>
        SISTEMA EN ESPERA
      </h1>
      <p style={{ marginTop: '10px', fontSize: '1.2rem', color: '#888' }}>
        Esperando comando desde el panel de control...
      </p>
      
      <p style={{ position: 'absolute', bottom: '20px', fontSize: '0.9rem', color: '#444' }}>
        Click en cualquier parte de la pantalla para entrar en pantalla completa
      </p>
      
      <style>{`
        @keyframes float {
          0% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(5deg); }
          100% { transform: translateY(0px) rotate(0deg); }
        }
      `}</style>
    </div>
  );
};

export default ProjectorView;
