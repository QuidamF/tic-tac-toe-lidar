/**
 * @file WaveExperience.js
 * @description Controlador principal de la experiencia "Ondas Interactivas".
 * Orquesta el renderizado a 60 FPS, mezcla aditiva de color, paleta vertical y síntesis de audio.
 */

import { ColorPalette } from './ColorPalette.js';
import { AudioManager } from './AudioManager.js';
import { Wave } from './Wave.js';

export class WaveExperience {
    /**
     * @param {HTMLCanvasElement} canvas - Elemento Canvas sobre el cual renderizar.
     * @param {InputManager} inputManager - Instancia del gestor de entradas.
     */
    constructor(canvas, inputManager) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d', { alpha: false });
        this.inputManager = inputManager;

        this.colorPalette = new ColorPalette();
        this.audioManager = new AudioManager();

        this.waves = [];
        this.isRunning = false;
        this.animFrameId = null;

        this.lastInputTime = 0;
        this.lastInputX = 0;
        this.lastInputY = 0;
        this.maxWaves = 12; // Máximo 12 ondas simultáneas para evitar saturación de CPU y Web Audio

        this._onInputEvent = this._onInputEvent.bind(this);
        this._loop = this._loop.bind(this);
    }

    /**
     * Inicializa la experiencia y conecta eventos.
     */
    init() {
        this.resize();
        if (this.inputManager) {
            this.inputManager.offInput(this._onInputEvent);
            this.inputManager.onInput(this._onInputEvent);
        }
    }

    /**
     * Inicia la animación y activa el contexto.
     */
    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.audioManager.init();
        this.animFrameId = requestAnimationFrame(this._loop);
    }

    /**
     * Detiene el renderizado y limpia recursos.
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
        this.waves = [];
    }

    /**
     * Adapta la resolución interna del Canvas al tamaño del viewport y densidad de píxeles (HiDPI).
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
    }

    /**
     * Recibe eventos de interacción desde InputManager (Touch, Mouse, LiDAR).
     * @private
     */
    _onInputEvent(event) {
        if (!this.isRunning) return;

        // Ignorar eventos de liberación (pointerup/pointercancel)
        if (event.type === 'pointerup' || event.type === 'pointercancel') return;

        const now = performance.now();

        // En arrastres continuos (pointermove), permitir una respuesta fluida a 30 FPS (~30ms)
        if (event.type === 'pointermove') {
            const timeDiff = now - this.lastInputTime;
            const dx = event.x - this.lastInputX;
            const dy = event.y - this.lastInputY;
            const distSq = dx * dx + dy * dy;

            // Disparar si han pasado al menos 30ms O se ha movido más de 10 píxeles
            if (timeDiff < 30 && distSq < 100) {
                return;
            }
        }

        this.lastInputTime = now;
        this.lastInputX = event.x;
        this.lastInputY = event.y;

        // Limitar número máximo de ondas activas para mantener 60 FPS estables
        if (this.waves.length >= this.maxWaves) {
            this.waves.shift(); // Eliminar la más antigua
        }

        // Obtener color dinámico basado en la posición vertical (Y)
        const color = this.colorPalette.getColorAt(event.normY);

        // Reproducir nota sintetizada Web Audio API proporcional a la altura
        const audioHandle = this.audioManager.playNote(event.normY, 1.4);

        // Instanciar nueva onda concéntrica
        const newWave = new Wave(event.x, event.y, color, audioHandle);
        this.waves.push(newWave);
    }

    /**
     * Bucle de renderizado a 60 FPS con requestAnimationFrame.
     * @private
     */
    _loop(timestamp) {
        if (!this.isRunning) return;

        this._render(timestamp);
        this.animFrameId = requestAnimationFrame(this._loop);
    }

    /**
     * Dibuja el cuadro actual.
     * @private
     */
    _render(timestamp) {
        const ctx = this.ctx;
        const dpr = this.dpr || 1;

        // Resetear matriz de transformación en cada cuadro
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        // Limpiar el fondo con negro puro (#000000)
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, this.width, this.height);

        if (this.waves.length === 0) return;

        // Utilizar modo de mezcla aditiva 'lighter' para un resplandor luminoso tipo teamLab
        ctx.globalCompositeOperation = 'lighter';

        // Actualizar y renderizar cada onda activa
        for (let i = this.waves.length - 1; i >= 0; i--) {
            const wave = this.waves[i];
            wave.update(timestamp);
            wave.draw(ctx);

            // Eliminar ondas muertas para evitar fugas de memoria
            if (wave.isDead) {
                this.waves.splice(i, 1);
            }
        }

        // Restaurar modo de composición normal
        ctx.globalCompositeOperation = 'source-over';
    }

    /**
     * Dispara una onda desde coordenadas específicas (útil para LiDAR / Visión Artificial).
     * @param {number} x - Posición X en píxeles.
     * @param {number} y - Posición Y en píxeles.
     */
    triggerWave(x, y) {
        this.inputManager.triggerExternal(x, y, 'lidar_api');
    }

    /**
     * Alterna estado de silencio.
     */
    toggleMute() {
        return this.audioManager.toggleMute();
    }
}
