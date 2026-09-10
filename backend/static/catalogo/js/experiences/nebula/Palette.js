/**
 * @file Palette.js
 * @description Paleta de tonos cósmicos iluminados desde el interior para "Cosmic Nebula".
 * Selecciona e interpola entre Azules Profundos, Morados, Magentas, Turquesas y Destellos Blancos Estelares.
 */

export class Palette {
    constructor() {
        this.colors = [
            { r: 30,  g: 58,  b: 138, weight: 0.25 }, // Azul Espacio Profundo (#1e3a8a)
            { r: 79,  g: 70,  b: 229, weight: 0.20 }, // Indigo Cósmico (#4f46e5)
            { r: 109, g: 40,  b: 217, weight: 0.20 }, // Morado Nebulosa (#6d28d9)
            { r: 192, g: 38,  b: 211, weight: 0.15 }, // Magenta Estelar (#c026d3)
            { r: 6,   g: 182, b: 212, weight: 0.15 }, // Turquesa Aurora (#06b6d4)
            { r: 255, g: 255, b: 255, weight: 0.05 }  // Destello Blanco Polvo Estelar (#ffffff)
        ];
    }

    /**
     * Retorna un color aleatorio ponderado de la nebulosa con variación armónica.
     * @returns {Object} { r, g, b, getRgba(alpha) }
     */
    getRandomColor() {
        const rand = Math.random();
        let cumulative = 0;

        for (let i = 0; i < this.colors.length; i++) {
            cumulative += this.colors[i].weight;
            if (rand <= cumulative) {
                const base = this.colors[i];
                // Sutil variación cromática armónica por partícula
                const varR = Math.max(0, Math.min(255, base.r + Math.floor(Math.random() * 24 - 12)));
                const varG = Math.max(0, Math.min(255, base.g + Math.floor(Math.random() * 24 - 12)));
                const varB = Math.max(0, Math.min(255, base.b + Math.floor(Math.random() * 24 - 12)));

                return {
                    r: varR, g: varG, b: varB,
                    getRgba: (alpha = 1.0) => `rgba(${varR}, ${varG}, ${varB}, ${alpha.toFixed(3)})`
                };
            }
        }

        return {
            r: 79, g: 70, b: 229,
            getRgba: (alpha = 1.0) => `rgba(79, 70, 229, ${alpha.toFixed(3)})`
        };
    }
}
