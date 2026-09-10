/**
 * @file NebulaExperience.js
 * @description Controlador principal de la experiencia interactiva "Cosmic Nebula".
 * Orquesta el renderizado volumétrico 60 FPS, física fluida, audio etéreo y entradas LiDAR.
 */

import { AudioManager } from './AudioManager.js';
import { NebulaSystem } from './NebulaSystem.js';

export class NebulaExperience {
    /**
     * @param {HTMLCanvasElement} canvas 
     * @param {InputManager} inputManager 
     */
    constructor(canvas, inputManager) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d', { alpha: false });
        this.inputManager = inputManager;

        this.audioManager = new AudioManager();
        this.nebulaSystem = new NebulaSystem(window.innerWidth, window.innerHeight, 4500);

        this.isRunning = false;
        this.animFrameId = null;

        this._onInputEvent = this._onInputEvent.bind(this);
        this._loop = this._loop.bind(this);
    }

    /**
     * Inicializa la experiencia y conecta los listeners de interacción.
     */
    init() {
        this.resize();
        if (this.inputManager) {
            this.inputManager.offInput(this._onInputEvent);
            this.inputManager.onInput(this._onInputEvent);
        }
    }

    /**
     * Inicia el bucle de renderizado y la síntesis de audio.
     */
    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.audioManager.init();
        this.animFrameId = requestAnimationFrame(this._loop);
    }

    /**
     * Detiene la experiencia y limpia recursos.
     */
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

    /**
     * Reajusta la resolución y densidad de píxeles (HiDPI / 4K).
     */
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

        if (this.nebulaSystem) {
            this.nebulaSystem.resize(width, height);
        }
    }

    /**
     * Procesa gestos táctiles, clics y swipes multitáctiles o de LiDAR.
     * @private
     */
    _onInputEvent(event) {
        if (!this.isRunning) return;

        if (event.type === 'pointerdown' || event.type === 'pointermove' || event.type === 'external') {
            this.nebulaSystem.updatePointer(event);
        } else if (event.type === 'pointerup' || event.type === 'pointercancel') {
            this.nebulaSystem.removePointer(event.id);
        }
    }

    /**
     * Bucle a 60 FPS con requestAnimationFrame.
     * @private
     */
    _loop(timestamp) {
        if (!this.isRunning) return;

        try {
            this._render(timestamp);
        } catch (err) {
            console.error('Error en el bucle de renderizado de Nebula:', err);
        }

        this.animFrameId = requestAnimationFrame(this._loop);
    }

    /**
     * Renderizado del cuadro.
     * @private
     */
    _render(timestamp) {
        const ctx = this.ctx;
        const dpr = this.dpr || 1;

        // Resetear matriz de transformación explícitamente en cada cuadro
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        // Fondo negro absoluto (#000000)
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, this.width, this.height);

        // Actualizar física de la materia cósmica
        const metrics = this.nebulaSystem.update(timestamp);

        // Modular textura sonora según velocidad de swipe
        this.audioManager.updateInteraction(metrics.maxSpeed, metrics.isInteracting);

        // Renderizado volumétrico
        this.nebulaSystem.draw(ctx);
    }

    /**
     * Dispara interacción desde coordenadas externas (LiDAR / Visión Artificial).
     * @param {number} x 
     * @param {number} y 
     */
    triggerWave(x, y) {
        this.inputManager.triggerExternal(x, y, 'lidar_nebula_api');
    }

    /**
     * Alterna estado de silencio.
     */
    toggleMute() {
        return this.audioManager.toggleMute();
    }
}
