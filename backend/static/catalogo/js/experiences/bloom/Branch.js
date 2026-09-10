/**
 * @file Branch.js
 * @description Representa una rama luminosa individual con crecimiento Bézier cuadrático progresivo.
 * Utilizado por el algoritmo de planta de luz bioluminiscente.
 */

export class Branch {
    /**
     * @param {number} startX - Origen X de la rama
     * @param {number} startY - Origen Y de la rama
     * @param {number} angle - Ángulo inicial de crecimiento
     * @param {number} length - Longitud total objetivo
     * @param {number} depth - Nivel de profundidad (0 = tronco principal, 1 = rama primaria, 2 = ramificación)
     * @param {number} delayMs - Tiempo de espera antes de comenzar a germinar
     * @param {Object} color - Objeto de color de la paleta
     */
    constructor(startX, startY, angle, length, depth, delayMs, color) {
        this.startX = startX;
        this.startY = startY;
        this.angle = angle;
        this.length = length;
        this.depth = depth;
        this.delayMs = delayMs;
        this.color = color || {
            r: 192, g: 132, b: 252,
            getRgba: (a = 1.0) => `rgba(192, 132, 252, ${a})`
        };

        // Curvatura orgánica cuadrática
        const curvatureOffset = (Math.random() * 0.4 - 0.2) * length;
        const midDist = length * 0.5;
        const perpAngle = angle + Math.PI * 0.5;

        this.controlX = startX + Math.cos(angle) * midDist + Math.cos(perpAngle) * curvatureOffset;
        this.controlY = startY + Math.sin(angle) * midDist + Math.sin(perpAngle) * curvatureOffset;

        this.endX = startX + Math.cos(angle) * length;
        this.endY = startY + Math.sin(angle) * length;

        // Grosor vívido decreciente según profundidad
        this.maxStrokeWidth = Math.max(1.2, 4.2 - depth * 1.2);
        this.growthProgress = 0.0;
        this.growthDuration = 550 + depth * 220; // Crecimiento fluido en ms
        this.currentProgress = 0;
        this.isFullyGrown = false;
    }

    /**
     * Actualiza el crecimiento progresivo de la rama.
     * @param {number} elapsedMs - Tiempo en ms desde la germinación de la planta
     */
    update(elapsedMs) {
        if (elapsedMs < this.delayMs) {
            this.currentProgress = 0;
            return;
        }

        const branchTime = elapsedMs - this.delayMs;
        this.growthProgress = Math.min(1.0, branchTime / this.growthDuration);

        // Curva de aceleración orgánica easeOutCubic
        const t = this.growthProgress;
        this.currentProgress = 1 - Math.pow(1 - t, 3);

        if (this.growthProgress >= 1.0) {
            this.isFullyGrown = true;
        }
    }

    /**
     * Calcula la posición actual de la punta en crecimiento a lo largo de la curva Bézier cuadrática.
     * @returns {{x: number, y: number}} Coordenadas actuales de la punta
     */
    getCurrentTip() {
        const t = Math.max(0, Math.min(1, this.currentProgress || 0));
        const invT = 1 - t;

        const x = invT * invT * this.startX + 2 * invT * t * this.controlX + t * t * this.endX;
        const y = invT * invT * this.startY + 2 * invT * t * this.controlY + t * t * this.endY;

        return { x, y };
    }

    /**
     * Renderiza la rama de luz en el Canvas 2D.
     * @param {CanvasRenderingContext2D} ctx 
     * @param {number} opacity - Opacidad general de la planta
     */
    draw(ctx, opacity = 1.0) {
        if (this.currentProgress <= 0.001 || opacity <= 0.001) return;

        const t = Math.max(0, Math.min(1, this.currentProgress));
        const invT = 1 - t;

        const currControlX = invT * this.startX + t * this.controlX;
        const currControlY = invT * this.startY + t * this.controlY;
        const tip = this.getCurrentTip();

        ctx.save();

        // Glow difuso bioluminiscente
        ctx.shadowColor = this.color.getRgba(opacity * 0.9);
        ctx.shadowBlur = 14 * opacity;

        // Trazo principal de la rama
        ctx.beginPath();
        ctx.moveTo(this.startX, this.startY);
        ctx.quadraticCurveTo(currControlX, currControlY, tip.x, tip.y);
        
        ctx.strokeStyle = this.color.getRgba(opacity);
        ctx.lineWidth = Math.max(0.8, this.maxStrokeWidth * (0.5 + 0.5 * t));
        ctx.lineCap = 'round';
        ctx.stroke();

        // Destello brillante en la punta mientras crece
        if (t < 0.98) {
            ctx.fillStyle = `rgba(255, 255, 255, ${(opacity * 0.95).toFixed(3)})`;
            ctx.beginPath();
            ctx.arc(tip.x, tip.y, this.maxStrokeWidth * 1.1, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }
}
