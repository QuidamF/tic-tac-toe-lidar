/**
 * @file ColorPalette.js
 * @description Gestión de paleta de colores continua dependiente de la posición vertical (Y).
 * Define una gradación fluida estilo pastel/neon suave:
 * - Parte Superior (0.0 - 0.3): Morados, Lilas, Azules
 * - Parte Central (0.3 - 0.7): Turquesas, Verdes suaves
 * - Parte Inferior (0.7 - 1.0): Amarillos, Naranjas, Rosas pastel
 */

export class ColorPalette {
    constructor() {
        // Puntos clave de color en formato RGB (0.0 a 1.0 en Y)
        this.colorStops = [
            { pos: 0.00, r: 162, g: 155, b: 254 }, // Lila elegante (#a29bfe)
            { pos: 0.20, r: 130, g: 170, b: 255 }, // Azul suave (#82aaff)
            { pos: 0.40, r: 80,  g: 227, b: 194 }, // Turquesa luminoso (#50e3c2)
            { pos: 0.60, r: 120, g: 235, b: 175 }, // Menta / Verde suave (#78ebaf)
            { pos: 0.80, r: 255, g: 220, b: 130 }, // Amarillo pastel (#ffdc82)
            { pos: 0.92, r: 255, g: 160, b: 140 }, // Naranja durazno (#ffa08c)
            { pos: 1.00, r: 255, g: 140, b: 190 }  // Rosa neon suave (#ff8ce6)
        ];
    }

    /**
     * Obtiene el color interpolado para una posición vertical Y (0.0 = arriba, 1.0 = abajo).
     * @param {number} normY - Posición Y normalizada entre 0.0 y 1.0.
     * @returns {Object} Objeto de color con { r, g, b, getRgba(alpha) }
     */
    getColorAt(normY) {
        // Clampear valor entre 0 y 1
        const y = Math.max(0, Math.min(1, normY));

        // Encontrar los dos paraderos entre los cuales se encuentra 'y'
        let startStop = this.colorStops[0];
        let endStop = this.colorStops[this.colorStops.length - 1];

        for (let i = 0; i < this.colorStops.length - 1; i++) {
            if (y >= this.colorStops[i].pos && y <= this.colorStops[i + 1].pos) {
                startStop = this.colorStops[i];
                endStop = this.colorStops[i + 1];
                break;
            }
        }

        // Factor de interpolación (0.0 a 1.0) entre startStop y endStop
        const range = endStop.pos - startStop.pos;
        const factor = range > 0 ? (y - startStop.pos) / range : 0;

        // Interpolación lineal (lerp) suave
        const r = Math.round(startStop.r + (endStop.r - startStop.r) * factor);
        const g = Math.round(startStop.g + (endStop.g - startStop.g) * factor);
        const b = Math.round(startStop.b + (endStop.b - startStop.b) * factor);

        return {
            r,
            g,
            b,
            getRgba: (alpha = 1.0) => `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(3)})`,
            getGlowRgba: (alpha = 1.0) => `rgba(${r}, ${g}, ${b}, ${(alpha * 0.4).toFixed(3)})`
        };
    }
}
