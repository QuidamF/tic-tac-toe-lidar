/**
 * @file BackgroundSporeField.js
 * @description Generador de esporas y luciérnagas verdes bioluminiscentes flotando en el fondo.
 * Aporta un ambiente de jardín nocturno encantado (estilo teamLab) sobre el fondo negro.
 */

export class BackgroundSporeField {
    /**
     * @param {number} width 
     * @param {number} height 
     * @param {number} [count=140] 
     */
    constructor(width, height, count = 140) {
        this.width = width;
        this.height = height;
        this.count = count;
        this.spores = [];

        this._initSpores();
    }

    /**
     * Inicializa las esporas verdes en el espacio de trabajo.
     * @private
     */
    _initSpores() {
        this.spores = [];
        const greens = [
            { r: 52,  g: 211, b: 153 }, // Menta bioluminiscente (#34d399)
            { r: 16,  g: 185, b: 129 }, // Esmeralda vivo (#10b981)
            { r: 110, g: 231, b: 183 }, // Verde pastel (#6ee7b7)
            { r: 5,   g: 150, b: 105 }  // Esmeralda profundo (#059669)
        ];

        for (let i = 0; i < this.count; i++) {
            const color = greens[Math.floor(Math.random() * greens.length)];
            this.spores.push({
                x: Math.random() * (this.width || 1000),
                y: Math.random() * (this.height || 800),
                baseSize: 1.2 + Math.random() * 2.4,
                vx: (Math.random() - 0.5) * 0.35,
                vy: -0.15 - Math.random() * 0.45, // Ascenso flotante suave
                color: color,
                pulseSpeed: 0.0015 + Math.random() * 0.0025,
                pulseOffset: Math.random() * Math.PI * 2,
                baseAlpha: 0.18 + Math.random() * 0.45
            });
        }
    }

    /**
     * Redimensiona y ajusta la distribución de esporas.
     */
    resize(width, height) {
        const scaleX = width / (this.width || 1);
        const scaleY = height / (this.height || 1);

        this.width = width;
        this.height = height;

        for (let i = 0; i < this.spores.length; i++) {
            const s = this.spores[i];
            s.x *= scaleX;
            s.y *= scaleY;
        }
    }

    /**
     * Actualiza la flotación y pulsación de respiración de las esporas.
     * @param {number} timestamp 
     * @param {number} [windVx=0] 
     * @param {number} [windVy=0] 
     */
    update(timestamp, windVx = 0, windVy = 0) {
        for (let i = 0; i < this.spores.length; i++) {
            const s = this.spores[i];

            s.x += s.vx + windVx * 0.1;
            s.y += s.vy + windVy * 0.1;

            // Micro-oscilación lateral
            s.x += Math.sin(timestamp * 0.0012 + s.pulseOffset) * 0.25;

            // Reciclaje al salir de la pantalla
            if (s.y < -20) {
                s.y = this.height + 20;
                s.x = Math.random() * this.width;
            }
            if (s.x < -20) s.x = this.width + 20;
            if (s.x > this.width + 20) s.x = -20;
        }
    }

    /**
     * Renderiza las luciérnagas verdes bioluminiscentes de fondo.
     * @param {CanvasRenderingContext2D} ctx 
     * @param {number} timestamp 
     */
    draw(ctx, timestamp) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        for (let i = 0; i < this.spores.length; i++) {
            const s = this.spores[i];

            // Respiración de brillo
            const pulse = Math.sin(timestamp * s.pulseSpeed + s.pulseOffset);
            const alpha = Math.max(0.05, Math.min(0.8, s.baseAlpha + pulse * 0.22));

            ctx.shadowColor = `rgba(${s.color.r}, ${s.color.g}, ${s.color.b}, ${(alpha * 0.8).toFixed(3)})`;
            ctx.shadowBlur = 12 * alpha;

            ctx.fillStyle = `rgba(${s.color.r}, ${s.color.g}, ${s.color.b}, ${alpha.toFixed(3)})`;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.baseSize, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }
}
