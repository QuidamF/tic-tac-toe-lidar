/**
 * @file ParticleSystem.js
 * @description Gestor del motor de partículas para Particle Bloom (Planta de Luz Bioluminiscente).
 */

import { Particle } from './Particle.js';
import { Bloom } from './Bloom.js';
import { SimplexNoise } from './SimplexNoise.js';

export class ParticleSystem {
    /**
     * @param {number} [maxPoolSize=2500] 
     */
    constructor(maxPoolSize = 2500) {
        this.maxPoolSize = maxPoolSize;
        this.particlePool = [];
        this.activeParticles = [];
        this.blooms = [];
        this.bloomCounter = 0;

        this.noiseGen = new SimplexNoise();

        this._initPool();
    }

    _initPool() {
        for (let i = 0; i < this.maxPoolSize; i++) {
            const p = new Particle();
            p.inPool = true;
            this.particlePool.push(p);
        }
    }

    spawnBloom(x, y, normY, color, audioHandle) {
        const bloomId = ++this.bloomCounter;
        const numParticles = 36 + Math.floor(Math.random() * 14);

        const assignedParticles = [];

        for (let i = 0; i < numParticles; i++) {
            let p = this.particlePool.pop();
            if (!p) {
                p = new Particle();
            }

            p.inPool = false;

            const angle = (Math.PI * 2 * i) / numParticles + (Math.random() * 0.4 - 0.2);
            const speed = 0.3 + Math.random() * 0.4;

            p.reset(x, y, angle, speed, color, bloomId);
            this.activeParticles.push(p);
            assignedParticles.push(p);
        }

        const bloom = new Bloom(bloomId, x, y, normY, color, audioHandle, assignedParticles);
        this.blooms.push(bloom);
    }

    update(currentTime) {
        for (let i = this.blooms.length - 1; i >= 0; i--) {
            const bloom = this.blooms[i];
            bloom.update(currentTime, this.noiseGen);

            if (bloom.isDead) {
                const bParticles = bloom.particles || bloom.poolParticles || [];
                for (let j = 0; j < bParticles.length; j++) {
                    const p = bParticles[j];
                    if (p) {
                        p.isAlive = false;
                        p.alpha = 0;
                    }
                }
                this.blooms.splice(i, 1);
            }
        }

        for (let i = this.activeParticles.length - 1; i >= 0; i--) {
            const p = this.activeParticles[i];
            if (!p.isAlive) {
                this.activeParticles.splice(i, 1);
                if (!p.inPool) {
                    p.inPool = true;
                    this.particlePool.push(p);
                }
            }
        }
    }

    draw(ctx) {
        ctx.save();

        for (let i = 0; i < this.blooms.length; i++) {
            this.blooms[i].draw(ctx);
        }

        const activeCount = this.activeParticles.length;
        if (activeCount === 0) {
            ctx.restore();
            return;
        }

        const maxConnDist = 45;
        const maxConnDistSq = maxConnDist * maxConnDist;

        ctx.lineWidth = 0.75;

        for (let i = 0; i < activeCount; i++) {
            const p1 = this.activeParticles[i];
            if (p1.alpha < 0.08) continue;

            const checkLimit = Math.min(activeCount, i + 30);
            for (let j = i + 1; j < checkLimit; j++) {
                const p2 = this.activeParticles[j];
                if (p2.alpha < 0.08) continue;

                const dx = p2.x - p1.x;
                const dy = p2.y - p1.y;
                const distSq = dx * dx + dy * dy;

                if (distSq < maxConnDistSq) {
                    const dist = Math.sqrt(distSq);
                    const connAlpha = (1 - dist / maxConnDist) * Math.min(p1.alpha, p2.alpha) * 0.28;

                    if (connAlpha > 0.01) {
                        ctx.strokeStyle = p1.color.getRgba(connAlpha);
                        ctx.beginPath();
                        ctx.moveTo(p1.x, p1.y);
                        ctx.lineTo(p2.x, p2.y);
                        ctx.stroke();
                    }
                }
            }
        }

        ctx.globalCompositeOperation = 'lighter';

        for (let i = 0; i < activeCount; i++) {
            const p = this.activeParticles[i];
            if (p.alpha <= 0.001) continue;

            // Halo suave sin el costoso shadowBlur por software
            ctx.fillStyle = p.color.getRgba(p.alpha * 0.35);
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.currentSize * 2.2, 0, Math.PI * 2);
            ctx.fill();

            // Núcleo brillante
            ctx.fillStyle = p.color.getRgba(p.alpha);
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.currentSize, 0, Math.PI * 2);
            ctx.fill();

            if (p.alpha > 0.35) {
                ctx.fillStyle = `rgba(255, 255, 255, ${(p.alpha * 0.75).toFixed(3)})`;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.currentSize * 0.45, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        ctx.restore();
    }
}
