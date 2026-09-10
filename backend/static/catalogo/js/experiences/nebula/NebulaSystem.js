/**
 * @file NebulaSystem.js
 * @description Gestor de la simulación de 4,500+ partículas cósmicas ocupando pantalla completa (88%+),
 * con Agujero Negro, Ondas de Choque por Tap y renderizado de estrellas luminosas mediante GlowSpriteCache.
 */

import { Particle } from './Particle.js';
import { Palette } from './Palette.js';
import { Physics } from './Physics.js';
import { NoiseField } from './NoiseField.js';
import { GlowSpriteCache } from './GlowSpriteCache.js';

export class NebulaSystem {
    /**
     * @param {number} width 
     * @param {number} height 
     * @param {number} [particleCount=4500] 
     */
    constructor(width, height, particleCount = 4500) {
        this.width = width;
        this.height = height;
        this.particleCount = particleCount;

        this.palette = new Palette();
        this.physics = new Physics();
        this.noiseField = new NoiseField();
        this.spriteCache = new GlowSpriteCache();

        this.particles = [];
        this.activePointers = new Map();

        this._initNebulaCloud();
    }

    /**
     * Inicializa la distribución de la masa cósmica ocupando casi la totalidad de la pantalla (88%+).
     * @private
     */
    _initNebulaCloud() {
        this.particles = [];
        const centerX = this.width * 0.5;
        const centerY = this.height * 0.5;
        
        // Cobertura expandida al 88%+ del área total del viewport
        const radiusX = this.width * 0.46;
        const radiusY = this.height * 0.46;

        for (let i = 0; i < this.particleCount; i++) {
            // Distribución estelar elíptica con espirales orgánicas
            const rFactor = Math.pow(Math.random(), 0.55);
            const angle = Math.random() * Math.PI * 2;

            const x = centerX + Math.cos(angle) * radiusX * rFactor;
            const y = centerY + Math.sin(angle) * radiusY * rFactor;

            const color = this.palette.getRandomColor();
            this.particles.push(new Particle(x, y, color));
        }
    }

    /**
     * Registra o actualiza la interacción de un puntero (Mouse, Touch o LiDAR).
     * Distingue entre Toque Breve (Tap) y Mantener Presionado (Agujero Negro).
     * @param {Object} inputEvent 
     */
    updatePointer(inputEvent) {
        const id = inputEvent.id;
        const now = performance.now();

        if (inputEvent.type === 'pointerdown') {
            this.activePointers.set(id, {
                x: inputEvent.x,
                y: inputEvent.y,
                startX: inputEvent.x,
                startY: inputEvent.y,
                vx: 0,
                vy: 0,
                speed: 0,
                startTime: now,
                lastTime: now,
                isHold: false,
                radius: 220
            });
        } else if (inputEvent.type === 'pointermove' || inputEvent.type === 'external') {
            if (this.activePointers.has(id)) {
                const ptr = this.activePointers.get(id);
                const pressDuration = now - ptr.startTime;

                ptr.vx = (inputEvent.x - ptr.x) * 0.65;
                ptr.vy = (inputEvent.y - ptr.y) * 0.65;
                ptr.speed = Math.sqrt(ptr.vx * ptr.vx + ptr.vy * ptr.vy);

                ptr.x = inputEvent.x;
                ptr.y = inputEvent.y;
                ptr.lastTime = now;

                // Si se mantiene presionado (>220ms) o se arrastra -> MODO AGUJERO NEGRO QUE ATRAE LA MATERIA
                if (pressDuration > 220 || ptr.speed > 2.0) {
                    ptr.isHold = true;
                }
            } else {
                // Para LiDAR o mouse move inicial
                this.activePointers.set(id, {
                    x: inputEvent.x,
                    y: inputEvent.y,
                    startX: inputEvent.x,
                    startY: inputEvent.y,
                    vx: 0,
                    vy: 0,
                    speed: 0,
                    startTime: now,
                    lastTime: now,
                    isHold: true,
                    radius: 220
                });
            }
        }
    }

    /**
     * Maneja la liberación del toque (PointerUp).
     * Si fue un toque breve (<220ms) -> Dispara Onda de Choque.
     * Al soltar -> Crea turbulencia residual que se disipa lentamente.
     * @param {string|number} id 
     */
    removePointer(id) {
        if (this.activePointers.has(id)) {
            const ptr = this.activePointers.get(id);
            const pressDuration = performance.now() - ptr.startTime;

            if (pressDuration < 220 && ptr.speed < 4.0) {
                // TOQUE BREVE -> ONDA DE CHOQUE RADIAL (se abre y vuelve a cerrarse)
                this.physics.triggerShockwave(ptr.x, ptr.y);
            } else {
                // AL SOLTAR -> CREAR TURBULENCIA RESIDUAL QUE SE DISIPA LENTAMENTE
                this.physics.addTurbulence(ptr.x, ptr.y, ptr.vx, ptr.vy);
            }

            this.activePointers.delete(id);
        }
    }

    /**
     * Redimensiona y expande la masa estelar para ocupar el 88%+ del viewport.
     */
    resize(width, height) {
        const scaleX = width / (this.width || 1);
        const scaleY = height / (this.height || 1);

        this.width = width;
        this.height = height;

        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            p.homeX *= scaleX;
            p.homeY *= scaleY;
            p.x *= scaleX;
            p.y *= scaleY;
        }
    }

    /**
     * Actualiza la simulación física completa.
     * @param {number} timestamp 
     * @returns {{ maxSpeed: number, isInteracting: boolean, isBlackHole: boolean }}
     */
    update(timestamp) {
        const timeSec = timestamp * 0.001;
        
        // Actualizar ondas de choque y turbulencias residuales
        this.physics.updateGlobalPhysics();

        const pointerList = Array.from(this.activePointers.values());

        let maxSpeed = 0;
        let isBlackHole = false;

        for (let i = 0; i < pointerList.length; i++) {
            const ptr = pointerList[i];
            if (ptr.speed > maxSpeed) {
                maxSpeed = ptr.speed;
            }
            if (ptr.isHold) {
                isBlackHole = true;
            }
            ptr.vx *= 0.88;
            ptr.vy *= 0.88;
            ptr.speed *= 0.88;
        }

        // Aplicar físicas a cada partícula de la nebulosa
        for (let i = 0; i < this.particles.length; i++) {
            this.physics.applyForces(this.particles[i], pointerList, this.noiseField, timeSec);
        }

        return {
            maxSpeed: maxSpeed,
            isInteracting: pointerList.length > 0,
            isBlackHole: isBlackHole
        };
    }

    /**
     * Renderiza la masa volumétrica de gas y las estrellas resplandecientes con Sprites de Luz Difusa (Glow Sprites).
     * @param {CanvasRenderingContext2D} ctx 
     */
    draw(ctx) {
        const particleCount = this.particles.length;
        if (particleCount === 0) return;

        ctx.save();

        // 1. Mezcla aditiva para dar densidad volumétrica de gas transparente iluminado desde el interior
        ctx.globalCompositeOperation = 'lighter';

        for (let i = 0; i < particleCount; i++) {
            const p = this.particles[i];

            const speedSq = p.vx * p.vx + p.vy * p.vy;
            const dynamicAlpha = Math.min(1.0, p.brightness + speedSq * 0.1);

            // Si la partícula es una estrella brillante principal, dibujar usando el Sprite de Resplandor pre-renderizado (High FPS Glow)
            if (p.size > 2.2) {
                const sprite = this.spriteCache.getSprite('magenta', p.size * 9.0);
                if (sprite) {
                    const spriteSize = p.size * 8.0;
                    ctx.globalAlpha = dynamicAlpha * 0.85;
                    ctx.drawImage(sprite, p.x - spriteSize * 0.5, p.y - spriteSize * 0.5, spriteSize, spriteSize);
                }
            }

            // Dibujar núcleo estelar principal
            ctx.globalAlpha = dynamicAlpha;
            ctx.fillStyle = p.color.getRgba(dynamicAlpha);
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }

        // 2. Dibujar indicador visual del Agujero Negro / Centro Gravitacional si está activo
        for (const ptr of this.activePointers.values()) {
            if (ptr.isHold) {
                ctx.globalAlpha = 0.4;
                ctx.fillStyle = 'rgba(15, 10, 30, 0.8)';
                ctx.beginPath();
                ctx.arc(ptr.x, ptr.y, 22, 0, Math.PI * 2);
                ctx.fill();

                ctx.globalAlpha = 0.6;
                ctx.strokeStyle = 'rgba(192, 38, 211, 0.7)';
                ctx.lineWidth = 2.0;
                ctx.beginPath();
                ctx.arc(ptr.x, ptr.y, 35, 0, Math.PI * 2);
                ctx.stroke();
            }
        }

        ctx.restore();
    }
}
