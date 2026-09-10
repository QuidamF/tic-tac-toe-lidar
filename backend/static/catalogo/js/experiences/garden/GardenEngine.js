/**
 * @file GardenEngine.js
 * @description Motor del Jardín Vivo y físicas de Viento para la experiencia de 7 especies botánicas.
 */

import { ProceduralFlower } from './ProceduralFlower.js';

export class GardenEngine {
    constructor() {
        this.blooms = [];
        this.detachedPetals = [];
        this.bloomCounter = 0;

        this.windVx = 0;
        this.windVy = 0;
    }

    spawnBloom(x, y, normY, audioHandle) {
        const bloomId = ++this.bloomCounter;

        let foundNearby = false;
        for (let i = 0; i < this.blooms.length; i++) {
            const b = this.blooms[i];
            const dx = b.x - x;
            const dy = b.y - y;
            if (dx * dx + dy * dy < 1600) {
                b.addHoldGrowth();
                foundNearby = true;
                break;
            }
        }

        if (!foundNearby) {
            const flower = new ProceduralFlower(bloomId, x, y, normY, audioHandle);
            this.blooms.push(flower);
        }
    }

    applyWindSwipe(vx, vy) {
        this.windVx += vx * 0.45;
        this.windVy += vy * 0.45;
    }

    update(timestamp) {
        this.windVx *= 0.94;
        this.windVy *= 0.94;

        for (let i = this.blooms.length - 1; i >= 0; i--) {
            const flower = this.blooms[i];
            const newDetached = flower.update(timestamp);

            if (newDetached && Array.isArray(newDetached)) {
                this.detachedPetals.push(...newDetached);
            }

            if (flower.isDead) {
                this.blooms.splice(i, 1);
            }
        }

        for (let i = this.detachedPetals.length - 1; i >= 0; i--) {
            const p = this.detachedPetals[i];
            p.life -= p.decay;

            if (p.life <= 0) {
                this.detachedPetals.splice(i, 1);
                continue;
            }

            p.vx += this.windVx * 0.12;
            p.vy += this.windVy * 0.12;

            if (p.behavior === 'float_wind') {
                p.vy -= 0.08;
                p.vx += Math.sin(timestamp * 0.003 + p.y) * 0.15;
            } else if (p.behavior === 'fall') {
                p.vy += 0.15;
                p.vx += Math.sin(timestamp * 0.004 + p.y) * 0.25;
            }

            p.vx *= 0.95;
            p.vy *= 0.95;

            p.x += p.vx;
            p.y += p.vy;
        }
    }

    draw(ctx) {
        ctx.save();

        for (let i = 0; i < this.blooms.length; i++) {
            this.blooms[i].draw(ctx);
        }

        ctx.globalCompositeOperation = 'lighter';

        for (let i = 0; i < this.detachedPetals.length; i++) {
            const p = this.detachedPetals[i];
            if (p.life <= 0) continue;

            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.life * 0.85;

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * (0.6 + 0.4 * p.life), 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }
}
