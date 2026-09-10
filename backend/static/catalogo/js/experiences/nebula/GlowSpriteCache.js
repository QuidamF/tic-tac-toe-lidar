/**
 * @file GlowSpriteCache.js
 * @description Pre-renderizador de sprites de estrellas y destellos celestiales en canvas invisibles de memoria.
 * Permite dibujar estrellas con halos difusos (blur) a 60 FPS mediante aceleración por GPU (drawImage).
 */

export class GlowSpriteCache {
    constructor() {
        this.cache = new Map();
        this._initGlowSprites();
    }

    /**
     * Pre-renderiza los sprites radiales de luz difusa para distintos colores y tamaños.
     * @private
     */
    _initGlowSprites() {
        const colors = [
            { id: 'blue', r: 59, g: 130, b: 246 },
            { id: 'indigo', r: 129, g: 140, b: 248 },
            { id: 'purple', r: 168, g: 85, b: 247 },
            { id: 'magenta', r: 236, g: 72, b: 153 },
            { id: 'turquoise', r: 34, g: 211, b: 238 },
            { id: 'white', r: 255, g: 255, b: 255 }
        ];

        const sizes = [16, 32, 48]; // Tamaños de textura en píxeles

        for (let i = 0; i < colors.length; i++) {
            const col = colors[i];
            for (let j = 0; j < sizes.length; j++) {
                const size = sizes[j];
                const key = `${col.id}_${size}`;
                this.cache.set(key, this._createGlowCanvas(col.r, col.g, col.b, size));
            }
        }
    }

    /**
     * Crea un canvas de textura radial suave.
     * @private
     */
    _createGlowCanvas(r, g, b, size) {
        const offCanvas = document.createElement('canvas');
        offCanvas.width = size;
        offCanvas.height = size;
        const ctx = offCanvas.getContext('2d');

        const center = size * 0.5;
        const radius = size * 0.5;

        const grad = ctx.createRadialGradient(center, center, 0, center, center, radius);
        grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, 1.0)`);
        grad.addColorStop(0.25, `rgba(${r}, ${g}, ${b}, 0.6)`);
        grad.addColorStop(0.60, `rgba(${r}, ${g}, ${b}, 0.18)`);
        grad.addColorStop(1.0, `rgba(${r}, ${g}, ${b}, 0.0)`);

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(center, center, radius, 0, Math.PI * 2);
        ctx.fill();

        return offCanvas;
    }

    /**
     * Obtiene el canvas pre-renderizado correspondiente.
     * @param {string} colorId 
     * @param {number} size 
     * @returns {HTMLCanvasElement}
     */
    getSprite(colorId, size) {
        let sizeKey = 32;
        if (size <= 2.0) sizeKey = 16;
        else if (size > 3.2) sizeKey = 48;

        const key = `${colorId}_${sizeKey}`;
        return this.cache.get(key) || this.cache.get('blue_32');
    }
}
