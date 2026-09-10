/**
 * @file Particle.js
 * @description Representa una partícula de materia cósmica viva.
 * Almacena posición, velocidad, masa, aceleración, posición de reposo orgánico y atributos de brillo.
 */

export class Particle {
    /**
     * @param {number} x - Posición X inicial
     * @param {number} y - Posición Y inicial
     * @param {Object} color - Objeto de color de la paleta
     */
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.homeX = x;
        this.homeY = y;
        
        this.vx = 0;
        this.vy = 0;
        this.ax = 0;
        this.ay = 0;

        this.color = color;

        // Distribución de tamaño para dar profundidad volumétrica (0.8px a 3.5px)
        const randSize = Math.random();
        if (randSize > 0.94) {
            this.size = 2.8 + Math.random() * 1.6; // Partículas brillantes en primer plano
            this.brightness = 0.85 + Math.random() * 0.15;
        } else if (randSize > 0.60) {
            this.size = 1.4 + Math.random() * 1.0;
            this.brightness = 0.5 + Math.random() * 0.3;
        } else {
            this.size = 0.7 + Math.random() * 0.7; // Polvo estelar tenue de fondo
            this.brightness = 0.15 + Math.random() * 0.3;
        }

        this.mass = 0.6 + Math.random() * 0.8;
        this.noiseOffsetX = Math.random() * 5000;
        this.noiseOffsetY = Math.random() * 5000;
    }
}
