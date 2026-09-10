/**
 * @file GardenExperience.js
 * @description Controlador de la experiencia "Jardín Vivo Procedural" (7 especies botánicas).
 */

import { GardenEngine } from './GardenEngine.js';
import { AudioManager } from '../bloom/AudioManager.js';
import { BackgroundSporeField } from '../bloom/BackgroundSporeField.js';

export class GardenExperience {
    /**
     * @param {HTMLCanvasElement} canvas 
     * @param {InputManager} inputManager 
     */
    constructor(canvas, inputManager) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d', { alpha: false });
        this.inputManager = inputManager;

        this.gardenEngine = new GardenEngine();
        this.audioManager = new AudioManager();
        this.sporeField = new BackgroundSporeField(window.innerWidth, window.innerHeight, 160);

        this.isRunning = false;
        this.animFrameId = null;
        this.lastPointerX = 0;
        this.lastPointerY = 0;

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

        const normY = event.y / (this.height || 1);

        if (event.type === 'pointerdown' || event.type === 'external') {
            this.lastPointerX = event.x;
            this.lastPointerY = event.y;

            const audioHandle = this.audioManager.playChime(normY);
            this.gardenEngine.spawnBloom(event.x, event.y, normY, audioHandle);
        } else if (event.type === 'pointermove') {
            const vx = event.x - this.lastPointerX;
            const vy = event.y - this.lastPointerY;

            if (Math.abs(vx) > 2.0 || Math.abs(vy) > 2.0) {
                this.gardenEngine.applyWindSwipe(vx, vy);
            }

            this.lastPointerX = event.x;
            this.lastPointerY = event.y;
        }
    }

    _loop(timestamp) {
        if (!this.isRunning) return;

        try {
            this._render(timestamp);
        } catch (err) {
            console.error('Error en renderizado del Jardín Vivo:', err);
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

        // 1. Renderizar esporas y luciérnagas verdes de fondo
        this.sporeField.update(timestamp, this.gardenEngine.windVx, this.gardenEngine.windVy);
        this.sporeField.draw(ctx, timestamp);

        // 2. Renderizar flores procedurales del Jardín Vivo
        this.gardenEngine.update(timestamp);
        this.gardenEngine.draw(ctx);
    }

    triggerWave(x, y) {
        this.inputManager.triggerExternal(x, y, 'lidar_garden_api');
    }

    toggleMute() {
        return this.audioManager.toggleMute();
    }
}
