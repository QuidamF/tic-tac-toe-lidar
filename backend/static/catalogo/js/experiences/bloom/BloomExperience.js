/**
 * @file BloomExperience.js
 * @description Controlador de la experiencia "Particle Bloom" (Planta de Luz Bioluminiscente).
 */

import { Palette } from './Palette.js';
import { ParticleSystem } from './ParticleSystem.js';
import { AudioManager } from './AudioManager.js';
import { BackgroundSporeField } from './BackgroundSporeField.js';

export class BloomExperience {
    /**
     * @param {HTMLCanvasElement} canvas 
     * @param {InputManager} inputManager 
     */
    constructor(canvas, inputManager) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d', { alpha: false });
        this.inputManager = inputManager;

        this.palette = new Palette();
        this.particleSystem = new ParticleSystem();
        this.audioManager = new AudioManager();
        this.sporeField = new BackgroundSporeField(window.innerWidth, window.innerHeight, 150);

        this.isRunning = false;
        this.animFrameId = null;

        this._onInputEvent = this._onInputEvent.bind(this);
        this._loop = this._loop.bind(this);
    }

    init() {
        this.resize();
        if (this.inputManager) {
            this.inputManager.offInput(this._onInputEvent);
            this.inputManager.onInput(this._onInputEvent);
        }
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.audioManager.init();
        this.animFrameId = requestAnimationFrame(this._loop);
    }

    stop() {
        this.isRunning = false;
        if (this.animFrameId) {
            cancelAnimationFrame(this.animFrameId);
            this.animFrameId = null;
        }
        if (this.inputManager) {
            this.inputManager.offInput(this._onInputEvent);
        }
    }

    resize() {
        if (!this.canvas) return;

        const dpr = window.devicePixelRatio || 1;
        const width = this.canvas.clientWidth || window.innerWidth;
        const height = this.canvas.clientHeight || window.innerHeight;

        this.canvas.width = width * dpr;
        this.canvas.height = height * dpr;

        this.dpr = dpr;
        this.width = width;
        this.height = height;

        if (this.sporeField) {
            this.sporeField.resize(width, height);
        }
    }

    _onInputEvent(event) {
        if (!this.isRunning) return;

        const now = performance.now();

        if (event.type === 'pointerdown' || event.type === 'external') {
            this.lastInputTime = now;
            this.lastInputX = event.x;
            this.lastInputY = event.y;

            const normY = event.y / (this.height || 1);
            const color = this.palette.getColorAt(normY);
            const audioHandle = this.audioManager.playChime(normY);

            this.particleSystem.spawnBloom(event.x, event.y, normY, color, audioHandle);
        } else if (event.type === 'pointermove') {
            const timeDiff = now - (this.lastInputTime || 0);
            const dx = event.x - (this.lastInputX || 0);
            const dy = event.y - (this.lastInputY || 0);
            const distSq = dx * dx + dy * dy;

            if (timeDiff >= 50 || distSq >= 900) {
                this.lastInputTime = now;
                this.lastInputX = event.x;
                this.lastInputY = event.y;

                const normY = event.y / (this.height || 1);
                const color = this.palette.getColorAt(normY);
                const audioHandle = this.audioManager.playChime(normY);

                this.particleSystem.spawnBloom(event.x, event.y, normY, color, audioHandle);
            }
        }
    }

    _loop(timestamp) {
        if (!this.isRunning) return;

        try {
            this._render(timestamp);
        } catch (err) {
            console.error('Error en renderizado de Particle Bloom:', err);
        }

        this.animFrameId = requestAnimationFrame(this._loop);
    }

    _render(timestamp) {
        const ctx = this.ctx;
        const dpr = this.dpr || 1;

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        // Fondo negro profundo (#000000)
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, this.width, this.height);

        // 1. Renderizar luciérnagas/esporas verdes flotando al fondo
        this.sporeField.update(timestamp);
        this.sporeField.draw(ctx, timestamp);

        // 2. Renderizar plantas de luz bioluminiscentes
        this.particleSystem.update(timestamp);
        this.particleSystem.draw(ctx);
    }

    triggerWave(x, y) {
        this.inputManager.triggerExternal(x, y, 'lidar_bloom_api');
    }

    toggleMute() {
        return this.audioManager.toggleMute();
    }
}
