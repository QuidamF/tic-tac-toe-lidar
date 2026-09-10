/**
 * @file Bloom.js
 * @description Gestor de la Planta de Luz Bioluminiscente (L-System / Crecimiento orgánico).
 * Coordina la germinación de semillas, crecimiento Bézier de ramas, brote de polen/luciérnagas en las puntas
 * y la desintegración etérea en un periodo de 5.0 segundos.
 */

import { Branch } from './Branch.js';

export class Bloom {
    /**
     * @param {string|number} id - Identificador único de la planta
     * @param {number} x - Posición X de la semilla
     * @param {number} y - Posición Y de la semilla
     * @param {number} normY - Posición Y normalizada (0.0 a 1.0)
     * @param {Object} color - Objeto de color de la paleta
     * @param {Object} audioHandle - Handle del sintetizador sonoro
     * @param {Array<Particle>} poolParticles - Partículas obtenidas del Object Pool
     */
    constructor(id, x, y, normY, color, audioHandle, poolParticles) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.normY = normY;
        this.color = color || {
            r: 192, g: 132, b: 252,
            getRgba: (a = 1.0) => `rgba(192, 132, 252, ${a})`
        };
        this.audioHandle = audioHandle;
        
        this.particles = poolParticles || [];
        this.poolParticles = poolParticles || [];

        this.startTime = performance.now();
        this.duration = 5200; // 5.2s tiempo de vida total por planta
        this.isDead = false;
        this.overallOpacity = 1.0;

        this.branches = [];
        this.tipParticles = [];

        this._generatePlantStructure();
    }

    /**
     * Construye el árbol orgánico de ramas con radio acotado (~110px máx).
     * @private
     */
    _generatePlantStructure() {
        const numMainStems = 4 + Math.floor(Math.random() * 2); // 4 a 5 ramas principales
        const angleStep = (Math.PI * 2) / numMainStems;
        const baseAngle = Math.random() * Math.PI * 2;

        for (let i = 0; i < numMainStems; i++) {
            const angle = baseAngle + i * angleStep + (Math.random() * 0.2 - 0.1);
            const mainLength = 48 + Math.random() * 22; // Radio acotado
            const delay = i * 70;

            const mainBranch = new Branch(this.x, this.y, angle, mainLength, 0, delay, this.color);
            this.branches.push(mainBranch);

            // Sub-ramas primarias (Profundidad 1)
            const numSub = 2;
            for (let j = 0; j < numSub; j++) {
                const subAngle = angle + (j === 0 ? -1 : 1) * (0.35 + Math.random() * 0.25);
                const subLength = mainLength * (0.55 + Math.random() * 0.2);
                const subDelay = delay + 300 + j * 90;

                const subBranch = new Branch(mainBranch.endX, mainBranch.endY, subAngle, subLength, 1, subDelay, this.color);
                this.branches.push(subBranch);

                // Ramificaciones secundarias finales (Profundidad 2)
                const twigAngle = subAngle + (Math.random() * 0.4 - 0.2);
                const twigLength = subLength * 0.55;
                const twigDelay = subDelay + 250;

                const twig = new Branch(subBranch.endX, subBranch.endY, twigAngle, twigLength, 2, twigDelay, this.color);
                this.branches.push(twig);
            }
        }

        // Asignar partículas del pool a las puntas de las ramas
        if (this.particles.length > 0 && this.branches.length > 0) {
            const particlesPerTip = Math.max(1, Math.floor(this.particles.length / this.branches.length));
            let pIndex = 0;

            for (let i = 0; i < this.branches.length; i++) {
                const branch = this.branches[i];
                const endX = branch.endX;
                const endY = branch.endY;

                for (let k = 0; k < particlesPerTip && pIndex < this.particles.length; k++) {
                    const p = this.particles[pIndex++];
                    const pAngle = Math.random() * Math.PI * 2;
                    const pSpeed = 0.15 + Math.random() * 0.3;
                    p.reset(endX, endY, pAngle, pSpeed, this.color, this.id);
                    p.branchRef = branch;
                    this.tipParticles.push(p);
                }
            }
        }
    }

    /**
     * Actualiza el crecimiento de las ramas y brotes de luciérnagas.
     * @param {number} currentTime 
     * @param {SimplexNoise} noiseGen 
     */
    update(currentTime, noiseGen) {
        const now = performance.now();
        const elapsed = Math.max(0, now - this.startTime);
        const progress = Math.min(1.0, elapsed / this.duration);

        if (progress >= 1.0) {
            this.isDead = true;
            this.overallOpacity = 0;
            for (let i = 0; i < this.tipParticles.length; i++) {
                this.tipParticles[i].isAlive = false;
                this.tipParticles[i].alpha = 0;
            }
            return;
        }

        // Etapa 4: Desintegración etérea progresiva
        let overallOpacity = 1.0;
        if (progress > 0.82) {
            const fadeProgress = (progress - 0.82) / 0.18;
            overallOpacity = Math.max(0, Math.pow(1 - fadeProgress, 1.8));
        }

        this.overallOpacity = overallOpacity;

        // 1. Actualizar ramas
        for (let i = 0; i < this.branches.length; i++) {
            this.branches[i].update(elapsed);
        }

        // 2. Actualizar partículas de polen y luciérnagas
        const timeSec = elapsed * 0.001;

        for (let i = 0; i < this.tipParticles.length; i++) {
            const p = this.tipParticles[i];
            const branch = p.branchRef;

            if (branch && branch.currentProgress > 0.15) {
                const tip = branch.getCurrentTip();

                const nX = noiseGen.noise2D(p.noiseOffsetX + timeSec * 0.25, timeSec * 0.2);
                const nY = noiseGen.noise2D(p.noiseOffsetY + timeSec * 0.25, timeSec * 0.2);
                const breathing = Math.sin(timeSec * 2.5 + p.oscOffset) * 4.0;

                const targetX = tip.x + Math.cos(p.angle) * (8 + breathing) + nX * 10.0;
                const targetY = tip.y + Math.sin(p.angle) * (8 + breathing) + nY * 10.0;

                p.x += (targetX - p.x) * 0.09;
                p.y += (targetY - p.y) * 0.09;

                p.alpha = overallOpacity * branch.currentProgress * p.brightness;
                p.currentSize = p.baseSize * branch.currentProgress;
            } else {
                p.alpha = 0;
            }
        }

        if (this.audioHandle && this.audioHandle.updateFromOpacity) {
            this.audioHandle.updateFromOpacity(overallOpacity);
        }
    }

    /**
     * Dibuja la estructura bioluminiscente de la planta.
     * @param {CanvasRenderingContext2D} ctx 
     */
    draw(ctx) {
        if (this.overallOpacity <= 0.001) return;

        ctx.save();
        ctx.shadowColor = this.color.getRgba(this.overallOpacity);
        ctx.shadowBlur = 18 * this.overallOpacity;
        ctx.fillStyle = `rgba(255, 255, 255, ${(this.overallOpacity * 0.9).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 5.0 * this.overallOpacity, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        for (let i = 0; i < this.branches.length; i++) {
            this.branches[i].draw(ctx, this.overallOpacity);
        }
    }
}
