/**
 * @file Wave.js
 * @description Representa un conjunto de ondas circulares concéntricas generadas desde un punto de origen.
 * Implementa movimiento orgánico con easing, desvanecimiento de opacidad, afinamiento de trazo
 * y emisión de resplandor difuso (glow) teamLab-style.
 */

export class Wave {
    /**
     * @param {number} x - Posición X de origen en píxeles.
     * @param {number} y - Posición Y de origen en píxeles.
     * @param {Object} color - Objeto de color generado por ColorPalette.
     * @param {Object} [audioHandle=null] - Referencia opcional al sonido asociado para sincronización.
     */
    constructor(x, y, color, audioHandle = null) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.audioHandle = audioHandle;

        this.startTime = performance.now();
        this.duration = 1400; // Duración optimizada (1.4s) para alta fluidez a 60 FPS
        this.isDead = false;

        // Crear 3 anillos concéntricos escalonados para cada toque
        const numRings = 3;
        this.rings = [];

        for (let i = 0; i < numRings; i++) {
            this.rings.push({
                delay: i * 100, // Desfase entre anillos concéntricos
                maxRadius: 150 + i * 70, // Radio máximo en píxeles
                initialStrokeWidth: 3.5 - i * 0.7,
                minStrokeWidth: 1.0,
                radius: 0,
                alpha: 1.0,
                strokeWidth: 3.0
            });
        }
    }

    /**
     * Función de suavizado Easing Out Cubic: movimiento suave que desacelera de forma orgánica.
     * @private
     */
    _easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    /**
     * Actualiza la física y estado de desvanecimiento del grupo de ondas.
     * @param {number} currentTime - Marca de tiempo actual de performance.now()
     */
    update(currentTime) {
        const elapsed = currentTime - this.startTime;
        let activeRingsCount = 0;

        for (let i = 0; i < this.rings.length; i++) {
            const ring = this.rings[i];
            const ringElapsed = elapsed - ring.delay;

            if (ringElapsed < 0) {
                activeRingsCount++;
                continue;
            }

            const progress = Math.min(1.0, ringElapsed / this.duration);

            if (progress < 1.0) {
                activeRingsCount++;

                const easeFactor = this._easeOutCubic(progress);
                ring.radius = ring.maxRadius * easeFactor;
                ring.alpha = Math.pow(1 - progress, 1.8);
                ring.strokeWidth = ring.initialStrokeWidth * (1 - progress * 0.65);
                ring.strokeWidth = Math.max(ring.minStrokeWidth, ring.strokeWidth);
            } else {
                ring.alpha = 0;
            }
        }

        if (activeRingsCount === 0 || elapsed > (this.duration + 200)) {
            this.isDead = true;
        }

        if (this.audioHandle && this.rings[0]) {
            this.audioHandle.updateVolumeFromOpacity(this.rings[0].alpha);
        }
    }

    /**
     * Renderiza la onda sobre el contexto Canvas 2D.
     * @param {CanvasRenderingContext2D} ctx 
     */
    draw(ctx) {
        if (this.isDead) return;

        ctx.save();

        for (let i = 0; i < this.rings.length; i++) {
            const ring = this.rings[i];
            if (ring.radius <= 0 || ring.alpha <= 0.001) continue;

            // Trazo principal de la onda
            ctx.beginPath();
            ctx.arc(this.x, this.y, ring.radius, 0, Math.PI * 2);
            ctx.strokeStyle = this.color.getRgba(ring.alpha);
            ctx.lineWidth = ring.strokeWidth;
            ctx.stroke();

            // Dibujar un segundo anillo suave interno para potenciar el resplandor sin usar el costoso shadowBlur
            if (ring.alpha > 0.25) {
                ctx.beginPath();
                ctx.arc(this.x, this.y, ring.radius, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(255, 255, 255, ${(ring.alpha * 0.4).toFixed(3)})`;
                ctx.lineWidth = ring.strokeWidth * 0.5;
                ctx.stroke();
            }
        }

        ctx.restore();
    }
}
