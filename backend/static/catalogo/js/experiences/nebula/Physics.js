/**
 * @file Physics.js
 * @description Motor de físicas avanzadas para "Cosmic Nebula".
 * Implementa atracción de Agujero Negro, remolinos de vórtice, ondas de choque por toque breve (Tap),
 * turbulencias residuales al soltar (3-6s) y retorno elástico de gravedad interna (3-8s).
 */

export class Physics {
    constructor() {
        this.damping = 0.925; // Amortiguación fluida estilo tinta en agua
        this.returnStrength = 0.0016; // Gravedad de retorno elástico suave (3-8s)
        this.shockwaves = []; // Ondas de choque activas por toques breves
        this.turbulences = []; // Remolinos residuales de turbulencia
    }

    /**
     * Dispara una onda de choque radial suave por toque breve (Tap).
     * @param {number} x - Origen X del impacto
     * @param {number} y - Origen Y del impacto
     */
    triggerShockwave(x, y) {
        this.shockwaves.push({
            x: x,
            y: y,
            radius: 10,
            maxRadius: 240,
            speed: 6.5,
            strength: 18.0,
            startTime: performance.now()
        });
    }

    /**
     * Añade un remolino de turbulencia residual al soltar el toque.
     * @param {number} x 
     * @param {number} y 
     * @param {number} vx 
     * @param {number} vy 
     */
    addTurbulence(x, y, vx, vy) {
        this.turbulences.push({
            x: x,
            y: y,
            vx: vx * 0.5,
            vy: vy * 0.5,
            radius: 140,
            life: 1.0, // Decae de 1.0 a 0.0 en 3.5 a 6s
            decay: 0.004
        });
    }

    /**
     * Actualiza las ondas de choque y turbulencias residuales.
     */
    updateGlobalPhysics() {
        // Actualizar ondas de choque radiales
        for (let i = this.shockwaves.length - 1; i >= 0; i--) {
            const sw = this.shockwaves[i];
            sw.radius += sw.speed;
            sw.strength *= 0.94;

            if (sw.radius >= sw.maxRadius || sw.strength < 0.1) {
                this.shockwaves.splice(i, 1);
            }
        }

        // Actualizar turbulencias residuales al soltar
        for (let i = this.turbulences.length - 1; i >= 0; i--) {
            const tb = this.turbulences[i];
            tb.x += tb.vx;
            tb.y += tb.vy;
            tb.vx *= 0.96;
            tb.vy *= 0.96;
            tb.life -= tb.decay;

            if (tb.life <= 0) {
                this.turbulences.splice(i, 1);
            }
        }
    }

    /**
     * Aplica todas las leyes físicas (Agujero Negro, Vórtice, Ruido Simplex y Ondas de Choque) a una partícula.
     * @param {Particle} p - Instancia de partícula
     * @param {Array<Object>} pointers - Lista de punteros activos { x, y, vx, vy, speed, isHold }
     * @param {NoiseField} noiseField - Instancia del generador de ruido Simplex
     * @param {number} timeSec - Tiempo en segundos
     */
    applyForces(p, pointers, noiseField, timeSec) {
        // 1. Deriva orgánica Simplex 2D de la nube en reposo (Respiración sin gravedad)
        const driftSpeed = 0.07;
        const noiseX = noiseField.noise2D(p.noiseOffsetX + timeSec * driftSpeed, timeSec * driftSpeed * 0.7);
        const noiseY = noiseField.noise2D(p.noiseOffsetY + timeSec * driftSpeed, timeSec * driftSpeed * 0.7);

        const currentHomeX = p.homeX + noiseX * 22.0;
        const currentHomeY = p.homeY + noiseY * 22.0;

        // 2. Gravedad Interna / Retorno Elástico hacia el hogar orgánico (3 a 8s)
        const dxHome = currentHomeX - p.x;
        const dyHome = currentHomeY - p.y;
        
        p.ax += dxHome * this.returnStrength / p.mass;
        p.ay += dyHome * this.returnStrength / p.mass;

        // 3. Efectos de Punteros Activos (Agujero Negro & Vórtice de Remolinos)
        for (let i = 0; i < pointers.length; i++) {
            const ptr = pointers[i];
            const dx = ptr.x - p.x; // Vector hacia el puntero
            const dy = ptr.y - p.y;
            const distSq = dx * dx + dy * dy;
            const radius = ptr.radius || 220;
            const radiusSq = radius * radius;

            if (distSq < radiusSq && distSq > 0.1) {
                const dist = Math.sqrt(distSq);
                const normDist = dist / radius;
                const influence = Math.pow(1 - normDist, 2.0);

                if (ptr.isHold) {
                    // MANTENER PRESIONADO -> AGUJERO NEGRO QUE ATRAE LA MATERIA
                    const attractForce = (1.5 + ptr.speed * 0.08) * influence / p.mass;
                    p.ax += (dx / dist) * attractForce * 1.8;
                    p.ay += (dy / dist) * attractForce * 1.8;

                    // Componente de Vórtice / Remolino Espiral (Rotación tangencial)
                    const vortexSpeed = 0.8 * influence / p.mass;
                    p.ax += (-dy / dist) * vortexSpeed;
                    p.ay += (dx / dist) * vortexSpeed;

                    // Arrastre suave por el movimiento del dedo
                    p.ax += ptr.vx * influence * 0.18 / p.mass;
                    p.ay += ptr.vy * influence * 0.18 / p.mass;
                } else {
                    // DESPLAZAMIENTO SUAVE / SWIPE DE GAS
                    const pushForce = (1 - normDist) * (1.1 + ptr.speed * 0.06) / p.mass;
                    p.ax += (dx / dist) * pushForce * 0.6;
                    p.ay += (dy / dist) * pushForce * 0.6;
                    p.ax += ptr.vx * influence * 0.12 / p.mass;
                    p.ay += ptr.vy * influence * 0.12 / p.mass;
                }
            }
        }

        // 4. Ondas de Choque Radiales (Toque Breve / Tap)
        for (let i = 0; i < this.shockwaves.length; i++) {
            const sw = this.shockwaves[i];
            const dx = p.x - sw.x;
            const dy = p.y - sw.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const ringDist = Math.abs(dist - sw.radius);

            if (ringDist < 45 && dist > 0) {
                const ringFactor = (1 - ringDist / 45) * (sw.strength / (dist * 0.08 + 1));
                p.ax += (dx / dist) * ringFactor * 0.8;
                p.ay += (dy / dist) * ringFactor * 0.8;
            }
        }

        // 5. Turbulencias Residuales al Soltar (3s a 6s)
        for (let i = 0; i < this.turbulences.length; i++) {
            const tb = this.turbulences[i];
            const dx = p.x - tb.x;
            const dy = p.y - tb.y;
            const distSq = dx * dx + dy * dy;

            if (distSq < tb.radius * tb.radius && distSq > 0) {
                const dist = Math.sqrt(distSq);
                const infl = (1 - dist / tb.radius) * tb.life;
                p.ax += tb.vx * infl * 0.15;
                p.ay += tb.vy * infl * 0.15;
            }
        }

        // 6. Integración de Euler con viscosidad fluida
        p.vx = (p.vx + p.ax) * this.damping;
        p.vy = (p.vy + p.ay) * this.damping;

        p.x += p.vx;
        p.y += p.vy;

        p.ax = 0;
        p.ay = 0;
    }
}
