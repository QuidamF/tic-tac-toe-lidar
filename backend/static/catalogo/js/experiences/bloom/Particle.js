/**
 * @file Particle.js
 * @description Representa una partícula individual en la simulación de floración.
 * Optimizada para reciclaje de objetos (Object Pooling).
 */

export class Particle {
    constructor() {
        this.inPool = true;
        this.reset(0, 0, 0, 0, null, null);
    }

    /**
     * Reinicializa el estado de la partícula para su reutilización en el Object Pool.
     * @param {number} x - Origen X del núcleo
     * @param {number} y - Origen Y del núcleo
     * @param {number} angle - Ángulo inicial de brote
     * @param {number} speed - Velocidad de expansión inicial
     * @param {Object} color - Objeto de color de la paleta
     * @param {string|number} bloomId - ID de la floración a la que pertenece
     */
    reset(x, y, angle, speed, color, bloomId) {
        this.x = x;
        this.y = y;
        this.originX = x;
        this.originY = y;
        
        this.angle = angle;
        this.speed = speed;
        this.color = color || {
            r: 192, g: 132, b: 252,
            getRgba: (a = 1.0) => `rgba(192, 132, 252, ${a})`
        };
        this.bloomId = bloomId;

        // Propiedades de masa y dinamismo único por partícula
        this.baseSize = 1.8 + Math.random() * 2.6;
        this.currentSize = this.baseSize;
        this.alpha = 0;
        this.brightness = 0.8 + Math.random() * 0.4;

        // Desfases de ruido Simplex para movimiento orgánico fluctuante
        this.noiseOffsetX = Math.random() * 1000;
        this.noiseOffsetY = Math.random() * 1000;

        // Micro-oscilación (respiración)
        this.oscSpeed = 0.002 + Math.random() * 0.003;
        this.oscOffset = Math.random() * Math.PI * 2;

        this.isAlive = true;
        this.inPool = false;
        this.exchanged = false; // Indica si la partícula emigró a otra floración cercana
    }
}
