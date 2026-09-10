/**
 * @file ProceduralFlower.js
 * @description Representa una flor procedural en el Jardín Vivo (7 especies botánicas).
 */

import { SpeciesGenerator } from './SpeciesGenerator.js';
import { FlowerSpecies } from './FlowerSpecies.js';

export class ProceduralFlower {
    constructor(id, x, y, normY, audioHandle) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.normY = normY;
        this.audioHandle = audioHandle;

        const speciesGen = new SpeciesGenerator();
        this.config = speciesGen.generateSpecies(normY);

        this.startTime = performance.now();
        this.duration = 12000 + Math.random() * 16000;
        this.isDead = false;

        this.growthProgress = 0;
        this.holdScale = 1.0;
        this.isHolding = false;
        this.overallOpacity = 1.0;

        this.hasDetachedPetals = false;
    }

    addHoldGrowth() {
        this.isHolding = true;
        this.holdScale = Math.min(1.8, this.holdScale + 0.015);
    }

    releaseHold() {
        this.isHolding = false;
    }

    update(currentTime) {
        const now = performance.now();
        const elapsed = Math.max(0, now - this.startTime);
        const progress = Math.min(1.0, elapsed / this.duration);

        if (progress >= 1.0) {
            this.isDead = true;
            this.overallOpacity = 0;
            return null;
        }

        this.growthProgress = Math.min(1.0, elapsed / this.config.growthDuration);

        let opacity = 1.0;
        if (progress > 0.80) {
            const fadeProgress = (progress - 0.80) / 0.20;
            opacity = Math.max(0, Math.pow(1 - fadeProgress, 1.6));
        }

        this.overallOpacity = opacity;

        let newSpawn = null;
        if (progress > 0.65 && !this.hasDetachedPetals) {
            this.hasDetachedPetals = true;
            newSpawn = this._generateDetachedElements();
        }

        if (this.audioHandle && this.audioHandle.updateFromOpacity) {
            this.audioHandle.updateFromOpacity(opacity);
        }

        return newSpawn;
    }

    _generateDetachedElements() {
        const elements = [];
        const count = 4 + Math.floor(Math.random() * 6);

        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 15 + Math.random() * 25;

            elements.push({
                x: this.x + Math.cos(angle) * dist,
                y: this.y + Math.sin(angle) * dist,
                vx: (Math.random() - 0.5) * 0.8,
                vy: this.config.detachBehavior === 'float_wind' ? -0.8 - Math.random() * 0.6 : 0.4 + Math.random() * 0.8,
                color: this.config.colorPrimary,
                size: this.config.type === 'dandelion' ? 2.5 : 4.0 + Math.random() * 3.0,
                behavior: this.config.detachBehavior,
                life: 1.0,
                decay: 0.002 + Math.random() * 0.003
            });
        }

        return elements;
    }

    draw(ctx) {
        if (this.overallOpacity <= 0.001) return;

        FlowerSpecies.draw(
            ctx,
            this.x,
            this.y,
            this.config,
            this.growthProgress,
            this.holdScale,
            this.overallOpacity
        );
    }
}
