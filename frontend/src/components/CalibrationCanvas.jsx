import React, { useRef, useState, useEffect } from "react";

const CalibrationCanvas = ({ config, points, cluster, activeCell, onConfigChange, showBoard = false }) => {
  const canvasRef = useRef(null);
  const [dragState, setDragState] = useState({
    isDragging: false,
    type: null, // "move", "corner_tl", "corner_tr", "corner_bl", "corner_br"
    startX: 0,
    startY: 0,
    startBoardX: 0,
    startBoardY: 0,
    startWidth: 0,
    startHeight: 0,
  });

  // Dimensiones dinámicas para el muro de renderizado en metros
  const WALL_W = config.wall_width || 3.5;
  const WALL_H = config.wall_height || 3.5;
  const PADDING = 40; // píxeles

  // Obtener escala de metros a píxeles
  const getCanvasScale = (canvas) => {
    const drawWidth = canvas.width - 2 * PADDING;
    const drawHeight = canvas.height - 2 * PADDING;
    const scaleX = drawWidth / WALL_W;
    const scaleY = drawHeight / WALL_H;
    return Math.min(scaleX, scaleY);
  };

  // Convertir coordenadas del muro (metros) a coordenadas del Canvas (píxeles)
  const toCanvasCoords = (mx, my, canvas, scale) => {
    const cx = PADDING + mx * scale;
    const cy = canvas.height - PADDING - my * scale;
    return { x: cx, y: cy };
  };

  // Convertir coordenadas del Canvas (píxeles) a coordenadas del muro (metros)
  const toWallCoords = (cx, cy, canvas, scale) => {
    const mx = (cx - PADDING) / scale;
    const my = (canvas.height - PADDING - cy) / scale;
    return { x: mx, y: my };
  };

  // Dibujar todo en el Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const scale = getCanvasScale(canvas);

    // Limpiar canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Dibujar rejilla de fondo (muro)
    ctx.strokeStyle = "#2A2E35";
    ctx.lineWidth = 1;
    for (let i = 0; i <= WALL_W; i += 0.5) {
      const p1 = toCanvasCoords(i, 0, canvas, scale);
      const p2 = toCanvasCoords(i, WALL_H, canvas, scale);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }
    for (let j = 0; j <= WALL_H; j += 0.5) {
      const p1 = toCanvasCoords(0, j, canvas, scale);
      const p2 = toCanvasCoords(WALL_W, j, canvas, scale);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }

    // Suelo
    const sueloP1 = toCanvasCoords(0, 0, canvas, scale);
    const sueloP2 = toCanvasCoords(WALL_W, 0, canvas, scale);
    ctx.strokeStyle = "#5E6E82";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(sueloP1.x, sueloP1.y);
    ctx.lineTo(sueloP2.x, sueloP2.y);
    ctx.stroke();

    // 2. Dibujar el LiDAR
    const lx = config.lidar_x;
    const ly = config.lidar_y;
    const lPos = toCanvasCoords(lx, ly, canvas, scale);
    
    // Cono de escaneo
    ctx.fillStyle = "rgba(0, 240, 255, 0.04)";
    ctx.strokeStyle = "rgba(0, 240, 255, 0.15)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(lPos.x, lPos.y);
    
    if (points && points.length > 0) {
      // Ordenar puntos por ángulo relativo al LiDAR para trazar un abanico limpio sin cruces
      const sortedPoints = [...points].sort((a, b) => {
        const angleA = Math.atan2(a.y - config.lidar_y, a.x - config.lidar_x);
        const angleB = Math.atan2(b.y - config.lidar_y, b.x - config.lidar_x);
        return angleA - angleB;
      });
      
      sortedPoints.forEach((pt) => {
        const p = toCanvasCoords(pt.x, pt.y, canvas, scale);
        ctx.lineTo(p.x, p.y);
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      // Fallback teórico si no hay lecturas activas
      const angleRadMin = ((config.observation_angle_min - 90 - config.lidar_rotation) * Math.PI) / 180;
      const angleRadMax = ((config.observation_angle_max - 90 - config.lidar_rotation) * Math.PI) / 180;
      ctx.arc(lPos.x, lPos.y, WALL_H * scale, angleRadMin, angleRadMax, false);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // LiDAR físico
    ctx.fillStyle = "#FFB800";
    ctx.beginPath();
    ctx.arc(lPos.x, lPos.y, 10, 0, 2 * Math.PI);
    ctx.fill();
    ctx.fillStyle = "#1E2229";
    ctx.beginPath();
    ctx.arc(lPos.x, lPos.y, 6, 0, 2 * Math.PI);
    ctx.fill();
    ctx.fillStyle = "#FFB800";
    ctx.beginPath();
    // Línea indicadora de rotación del Lidar
    const rotRad = ((config.lidar_rotation - 90) * Math.PI) / 180;
    ctx.moveTo(lPos.x, lPos.y);
    ctx.lineTo(lPos.x + 12 * Math.cos(rotRad), lPos.y + 12 * Math.sin(rotRad));
    ctx.stroke();

    // 3. Dibujar el Tablero (Gato) si está habilitado
    let bx = 0, by = 0, bw = 0, bh = 0, bTL, bBR;
    if (showBoard) {
      bx = config.board_x;
      by = config.board_y;
      bw = config.board_width;
      bh = config.board_height;
      bTL = toCanvasCoords(bx, by + bh, canvas, scale);
      bBR = toCanvasCoords(bx + bw, by, canvas, scale);
    }

    if (showBoard) {
      // Resaltar la celda activa (interacción)
      if (activeCell) {
        ctx.fillStyle = "rgba(0, 255, 128, 0.15)";
        
        const grid = [
          ["top_left", "top_center", "top_right"],
          ["mid_left", "center", "mid_right"],
          ["bottom_left", "bottom_center", "bottom_right"]
        ];
        
        let activeRow = -1, activeCol = -1;
        for (let r = 0; r < 3; r++) {
          for (let c = 0; c < 3; c++) {
            if (grid[r][c] === activeCell) {
              activeRow = r;
              activeCol = c;
            }
          }
        }
        if (activeRow !== -1 && activeCol !== -1) {
          const cellW = bw / 3;
          const cellH = bh / 3;
          const cellX = bx + activeCol * cellW;
          const cellY = by + (2 - activeRow) * cellH; // Y aumenta hacia arriba
          
          const c1 = toCanvasCoords(cellX, cellY + cellH, canvas, scale);
          ctx.fillRect(c1.x, c1.y, (cellW * scale), (cellH * scale));
        }
      }

      // Líneas externas del tablero
      ctx.strokeStyle = activeCell ? "#00FF80" : "#00F0FF";
      ctx.lineWidth = activeCell ? 3 : 2;
      ctx.strokeRect(bTL.x, bTL.y, bw * scale, bh * scale);

      // Líneas internas del tablero (cuadrícula 3x3)
      ctx.strokeStyle = "rgba(0, 240, 255, 0.4)";
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      
      // Divisiones verticales
      for (let i = 1; i < 3; i++) {
        const xVal = bx + (bw / 3) * i;
        const t1 = toCanvasCoords(xVal, by, canvas, scale);
        const t2 = toCanvasCoords(xVal, by + bh, canvas, scale);
        ctx.beginPath();
        ctx.moveTo(t1.x, t1.y);
        ctx.lineTo(t2.x, t2.y);
        ctx.stroke();
      }
      // Divisiones horizontales
      for (let j = 1; j < 3; j++) {
        const yVal = by + (bh / 3) * j;
        const t1 = toCanvasCoords(bx, yVal, canvas, scale);
        const t2 = toCanvasCoords(bx + bw, yVal, canvas, scale);
        ctx.beginPath();
        ctx.moveTo(t1.x, t1.y);
        ctx.lineTo(t2.x, t2.y);
        ctx.stroke();
      }
      ctx.setLineDash([]); // Reset

      // Dibujar textos descriptivos en cada celda
      ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
      ctx.font = "11px Outfit, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const cellW = bw / 3;
      const cellH = bh / 3;
      const cellNames = [
        ["1 (TL)", "2 (TC)", "3 (TR)"],
        ["4 (ML)", "5 (C)",  "6 (MR)"],
        ["7 (BL)", "8 (BC)", "9 (BR)"]
      ];
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          const cx = bx + c * cellW + cellW / 2;
          const cy = by + (2 - r) * cellH + cellH / 2;
          const screenPos = toCanvasCoords(cx, cy, canvas, scale);
          ctx.fillText(cellNames[r][c], screenPos.x, screenPos.y);
        }
      }

      // Dibujar manijas (Handles) en las esquinas para reescalar
      ctx.fillStyle = "#00F0FF";
      const corners = [
        toCanvasCoords(bx, by + bh, canvas, scale), // TL
        toCanvasCoords(bx + bw, by + bh, canvas, scale), // TR
        toCanvasCoords(bx, by, canvas, scale), // BL
        toCanvasCoords(bx + bw, by, canvas, scale), // BR
      ];
      corners.forEach((corner) => {
        ctx.beginPath();
        ctx.arc(corner.x, corner.y, 6, 0, 2 * Math.PI);
        ctx.fill();
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });
    }

    // 4. Dibujar puntos de la cortina (LiDAR scan)
    if (points && points.length > 0) {
      ctx.fillStyle = "rgba(100, 150, 255, 0.6)";
      points.forEach((pt) => {
        const p = toCanvasCoords(pt.x, pt.y, canvas, scale);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, 2 * Math.PI);
        ctx.fill();
      });
    }

    // 5. Dibujar cluster activo
    if (cluster && cluster.centroid) {
      const cx = cluster.centroid.x;
      const cy = cluster.centroid.y;
      const cPos = toCanvasCoords(cx, cy, canvas, scale);

      // Dibujar radio del cluster
      ctx.strokeStyle = "rgba(255, 75, 75, 0.5)";
      ctx.fillStyle = "rgba(255, 75, 75, 0.15)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cPos.x, cPos.y, cluster.radius * scale, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();

      // Dibujar centroide (mira)
      ctx.strokeStyle = "#FF4B4B";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cPos.x - 12, cPos.y);
      ctx.lineTo(cPos.x + 12, cPos.y);
      ctx.moveTo(cPos.x, cPos.y - 12);
      ctx.lineTo(cPos.x, cPos.y + 12);
      ctx.stroke();
      
      ctx.fillStyle = "#FF4B4B";
      ctx.beginPath();
      ctx.arc(cPos.x, cPos.y, 4, 0, 2 * Math.PI);
      ctx.fill();
    }
  }, [config, points, cluster, activeCell]);

  // Manejador del evento Mouse Down
  const handleMouseDown = (e) => {
    if (!showBoard) return; // Disable dragging if board is not shown
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    
    const scale = getCanvasScale(canvas);
    const wallMouse = toWallCoords(cx, cy, canvas, scale);
    
    const bx = config.board_x;
    const by = config.board_y;
    const bw = config.board_width;
    const bh = config.board_height;

    // Distancia de tolerancia para hacer click en las manijas
    const tolerance = 0.15; // 15 cm

    // Verificar si hizo click en alguna de las esquinas
    const distTL = Math.sqrt((wallMouse.x - bx)**2 + (wallMouse.y - (by + bh))**2);
    const distTR = Math.sqrt((wallMouse.x - (bx + bw))**2 + (wallMouse.y - (by + bh))**2);
    const distBL = Math.sqrt((wallMouse.x - bx)**2 + (wallMouse.y - by)**2);
    const distBR = Math.sqrt((wallMouse.x - (bx + bw))**2 + (wallMouse.y - by)**2);

    if (distTL <= tolerance) {
      setDragState({
        isDragging: true,
        type: "corner_tl",
        startX: wallMouse.x,
        startY: wallMouse.y,
        startBoardX: bx,
        startBoardY: by,
        startWidth: bw,
        startHeight: bh,
      });
    } else if (distTR <= tolerance) {
      setDragState({
        isDragging: true,
        type: "corner_tr",
        startX: wallMouse.x,
        startY: wallMouse.y,
        startBoardX: bx,
        startBoardY: by,
        startWidth: bw,
        startHeight: bh,
      });
    } else if (distBL <= tolerance) {
      setDragState({
        isDragging: true,
        type: "corner_bl",
        startX: wallMouse.x,
        startY: wallMouse.y,
        startBoardX: bx,
        startBoardY: by,
        startWidth: bw,
        startHeight: bh,
      });
    } else if (distBR <= tolerance) {
      setDragState({
        isDragging: true,
        type: "corner_br",
        startX: wallMouse.x,
        startY: wallMouse.y,
        startBoardX: bx,
        startBoardY: by,
        startWidth: bw,
        startHeight: bh,
      });
    } else if (wallMouse.x >= bx && wallMouse.x <= bx + bw && wallMouse.y >= by && wallMouse.y <= by + bh) {
      // Arrastrar el tablero completo
      setDragState({
        isDragging: true,
        type: "move",
        startX: wallMouse.x,
        startY: wallMouse.y,
        startBoardX: bx,
        startBoardY: by,
        startWidth: bw,
        startHeight: bh,
      });
    }
  };

  // Manejador del evento Mouse Move
  const handleMouseMove = (e) => {
    if (!dragState.isDragging) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    
    const scale = getCanvasScale(canvas);
    const wallMouse = toWallCoords(cx, cy, canvas, scale);
    
    const dx = wallMouse.x - dragState.startX;
    const dy = wallMouse.y - dragState.startY;

    const newConfig = { ...config };

    if (dragState.type === "move") {
      newConfig.board_x = Math.max(0, Math.min(dragState.startBoardX + dx, WALL_W - config.board_width));
      newConfig.board_y = Math.max(0, Math.min(dragState.startBoardY + dy, WALL_H - config.board_height));
    } else if (dragState.type === "corner_tr") {
      // Top-Right: modifica ancho y alto
      newConfig.board_width = Math.max(0.5, Math.min(dragState.startWidth + dx, WALL_W - config.board_x));
      newConfig.board_height = Math.max(0.5, Math.min(dragState.startHeight + dy, WALL_H - config.board_y));
    } else if (dragState.type === "corner_tl") {
      // Top-Left: modifica x, ancho y alto
      const newX = Math.max(0, Math.min(dragState.startBoardX + dx, dragState.startBoardX + dragState.startWidth - 0.5));
      newConfig.board_width = dragState.startWidth + (dragState.startBoardX - newX);
      newConfig.board_x = newX;
      newConfig.board_height = Math.max(0.5, Math.min(dragState.startHeight + dy, WALL_H - config.board_y));
    } else if (dragState.type === "corner_br") {
      // Bottom-Right: modifica y, ancho y alto
      newConfig.board_width = Math.max(0.5, Math.min(dragState.startWidth + dx, WALL_W - config.board_x));
      const newY = Math.max(0, Math.min(dragState.startBoardY + dy, dragState.startBoardY + dragState.startHeight - 0.5));
      newConfig.board_height = dragState.startHeight + (dragState.startBoardY - newY);
      newConfig.board_y = newY;
    } else if (dragState.type === "corner_bl") {
      // Bottom-Left: modifica x, y, ancho y alto
      const newX = Math.max(0, Math.min(dragState.startBoardX + dx, dragState.startBoardX + dragState.startWidth - 0.5));
      const newY = Math.max(0, Math.min(dragState.startBoardY + dy, dragState.startBoardY + dragState.startHeight - 0.5));
      newConfig.board_width = dragState.startWidth + (dragState.startBoardX - newX);
      newConfig.board_height = dragState.startHeight + (dragState.startBoardY - newY);
      newConfig.board_x = newX;
      newConfig.board_y = newY;
    }

    // Redondear a 2 decimales para evitar spam numérico
    newConfig.board_x = parseFloat(newConfig.board_x.toFixed(2));
    newConfig.board_y = parseFloat(newConfig.board_y.toFixed(2));
    newConfig.board_width = parseFloat(newConfig.board_width.toFixed(2));
    newConfig.board_height = parseFloat(newConfig.board_height.toFixed(2));

    onConfigChange(newConfig);
  };

  const handleMouseUp = () => {
    setDragState((prev) => ({ ...prev, isDragging: false }));
  };

  return (
    <div className="canvas-container">
      <div className="canvas-header">
        <h3>Vista en Planta del Muro ({WALL_W.toFixed(1)}m x {WALL_H.toFixed(1)}m)</h3>
        {showBoard && <p className="canvas-tip">Arrastra el interior del tablero para moverlo, o sus esquinas para redimensionarlo.</p>}
      </div>
      <canvas
        ref={canvasRef}
        width={580}
        height={580}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          background: "#12141A",
          border: "2px solid #22252F",
          borderRadius: "16px",
          cursor: dragState.isDragging ? "grabbing" : "grab",
        }}
      />
    </div>
  );
};

export default CalibrationCanvas;
