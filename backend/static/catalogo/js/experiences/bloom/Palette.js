/**
 * @file Palette.js
 * @description Gestión de paleta cromática pastel con glow para la experiencia "Particle Bloom".
 * Mapea la altura vertical Y a gradientes continuos:
 * - Parte Superior (0.0 - 0.35): Lavanda (#e9d5ff), Violeta (#c084fc), Azul pastel (#93c5fd)
 * - Parte Central (0.35 - 0.65): Aqua (#7dd3fc), Turquesa (#5eead4), Verde agua (#6ee7b7)
 * - Parte Inferior (0.65 - 1.00): Amarillo pastel (#fef08a), Coral (#fda4af), Rosa suave (#f472b6)
 */

export class Palette {
    constructor() {
        this.stops = [
            { pos: 0.00, r: 233, g: 213, b: 255 }, // Lavanda etéreo (#e9d5ff)
            { pos: 0.20, r: 192, g: 132, b: 252 }, // Violeta luminoso (#c084fc)
            { pos: 0.40, r: 125, g: 211, b: 252 }, // Aqua suave (#7dd3fc)
            { pos: 0.55, r: 94,  g: 234, b: 212 }, // Turquesa cristal (#5eead4)
            { pos: 0.70, r: 110, g: 231, b: 183 }, // Verde menta pastel (#6ee7b7)
            { pos: 0.85, r: 254, g: 240, b: 138 }, // Amarillo sol pastel (#fef08a)
            { pos: 0.93, r: 253, g: 164, b: 175 }, // Coral suave (#fda4af)
            { pos: 1.00, r: 244, g: 114, b: 182 }  // Rosa pétalo (#f472b6)
        ];
    }

    /**
     * Retorna el color interpolado para una posición Y normalizada (0.0 = arriba, 1.0 = abajo).
     * @param {number} normY - Posición Y entre 0.0 y 1.0.
     * @returns {Object} { r, g, b, getRgba(alpha), getGlowRgba(alpha) }
     */
    getColorAt(normY) {
        const y = Math.max(0, Math.min(1, normY));

        let start = this.stops[0];
        let end = this.stops[this.stops.length - 1];

        for (let i = 0; i < this.stops.length - 1; i++) {
            if (y >= this.stops[i].pos && y <= this.stops[i + 1].pos) {
                start = this.stops[i];
                end = this.stops[i + 1];
                break;
            }
        }

        const range = end.pos - start.pos;
        const factor = range > 0 ? (y - start.pos) / range : 0;

        const r = Math.round(start.r + (end.r - start.r) * factor);
        const g = Math.round(start.g + (end.g - start.g) * factor);
        const b = Math.round(start.b + (end.b - start.b) * factor);

        return {
            r, g, b,
            getRgba: (alpha = 1.0) => `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(3)})`,
            getGlowRgba: (alpha = 1.0) => `rgba(${r}, ${g}, ${b}, ${(alpha * 0.45).toFixed(3)})`
        };
    }

    /**
     * Alias para compatibilidad de la API de colores.
     */
    getColorByHeight(normY) {
        return this.getColorAt(normY);
    }
}
