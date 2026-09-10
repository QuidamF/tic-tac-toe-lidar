/**
 * @file BirdsExperience.js
 * @description Controlador de la experiencia "Bandada de Aves 3D" (Three.js WebGL/WebGPU Boids Flocking).
 */

import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';
import { BoidsSimulation } from './BoidsSimulation.js';

export class BirdsExperience {
    /**
     * @param {HTMLCanvasElement} canvas 
     * @param {InputManager} inputManager 
     */
    constructor(canvas, inputManager) {
        this.canvas = canvas;
        this.inputManager = inputManager;

        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.boidsSim = null;

        this.activePointers = new Map();
        this.audioCtx = null;

        this.isRunning = false;
        this.animFrameId = null;

        this._onInputEvent = this._onInputEvent.bind(this);
        this._loop = this._loop.bind(this);
    }

    init() {
        this._initThreeScene();
        this._initAudio();
        this.resize();

        if (this.inputManager) {
            this.inputManager.offInput(this._onInputEvent);
            this.inputManager.onInput(this._onInputEvent);
        }
    }

    /**
     * Inicializa la escena, iluminación y renderizador de Three.js.
     * @private
     */
    _initThreeScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x040814);
        this.scene.fog = new THREE.FogExp2(0x040814, 0.015);

        const width = this.canvas.clientWidth || window.innerWidth;
        const height = this.canvas.clientHeight || window.innerHeight;

        this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
        this.camera.position.z = 40;

        // Iluminación ambiental y direccional brillante
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0x00F0FF, 1.2);
        dirLight.position.set(20, 40, 30);
        this.scene.add(dirLight);

        const backLight = new THREE.DirectionalLight(0xc026d3, 0.8);
        backLight.position.set(-20, -20, -20);
        this.scene.add(backLight);

        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            alpha: false,
            powerPreference: 'high-performance'
        });

        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        // Inicializar simulación de 350 aves Boids
        this.boidsSim = new BoidsSimulation(this.scene, 350);
    }

    /**
     * Sintetizador de audio ambiental de viento y aleteo.
     * @private
     */
    _initAudio() {
        try {
            const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
            if (AudioCtxClass) {
                this.audioCtx = new AudioCtxClass();
            }
        } catch (e) {
            console.warn('AudioContext no disponible:', e);
        }
    }

    _playFlockSound(normY) {
        if (!this.audioCtx) return;
        try {
            if (this.audioCtx.state === 'suspended') {
                this.audioCtx.resume();
            }
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();

            osc.connect(gain);
            gain.connect(this.audioCtx.destination);

            const freq = 180 + (1 - normY) * 520;
            const now = this.audioCtx.currentTime;

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now);
            osc.frequency.linearRampToValueAtTime(freq * 0.7, now + 0.25);

            gain.gain.setValueAtTime(0.06, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

            osc.start(now);
            osc.stop(now + 0.25);
        } catch (e) {
            // Ignorar políticas de audio
        }
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
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
        if (this.boidsSim) {
            this.boidsSim.dispose();
            this.boidsSim = null;
        }
        if (this.renderer) {
            this.renderer.dispose();
        }
    }

    resize() {
        if (!this.canvas || !this.renderer || !this.camera) return;

        const width = this.canvas.clientWidth || window.innerWidth;
        const height = this.canvas.clientHeight || window.innerHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(width, height);
    }

    _screenToWorld3D(normX, normY) {
        const ndcX = (normX * 2) - 1;
        const ndcY = -(normY * 2) + 1;

        const depth = this.camera.position.z;
        const vFOV = THREE.MathUtils.degToRad(this.camera.fov);
        const visibleHeight = 2 * Math.tan(vFOV / 2) * depth;
        const visibleWidth = visibleHeight * this.camera.aspect;

        return {
            x: ndcX * (visibleWidth / 2),
            y: ndcY * (visibleHeight / 2),
            z: 0
        };
    }

    _onInputEvent(event) {
        if (!this.isRunning) return;

        const id = event.id || 'lidar';
        const world3D = this._screenToWorld3D(event.normX, event.normY);

        if (event.type === 'pointerdown' || event.type === 'external') {
            this.activePointers.set(id, {
                x: world3D.x,
                y: world3D.y,
                z: world3D.z,
                startTime: performance.now(),
                lastSoundTime: performance.now(),
                isHold: false
            });
            this._playFlockSound(event.normY);

        } else if (event.type === 'pointermove') {
            const now = performance.now();
            if (this.activePointers.has(id)) {
                const ptr = this.activePointers.get(id);
                ptr.x = world3D.x;
                ptr.y = world3D.y;

                if (!ptr.lastSoundTime || now - ptr.lastSoundTime > 100) {
                    ptr.lastSoundTime = now;
                    this._playFlockSound(event.normY);
                }

                if (now - ptr.startTime > 180) {
                    ptr.isHold = true;
                }
            } else {
                this.activePointers.set(id, {
                    x: world3D.x,
                    y: world3D.y,
                    z: world3D.z,
                    startTime: now,
                    lastSoundTime: now,
                    isHold: true
                });
                this._playFlockSound(event.normY);
            }

        } else if (event.type === 'pointerup' || event.type === 'pointercancel') {
            this.activePointers.delete(id);
        }
    }

    _loop(timestamp) {
        if (!this.isRunning) return;

        const active3DList = Array.from(this.activePointers.values());

        if (this.boidsSim) {
            this.boidsSim.update(timestamp, active3DList);
        }

        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }

        this.animFrameId = requestAnimationFrame(this._loop);
    }

    triggerWave(x, y) {
        if (this.inputManager) {
            this.inputManager.triggerExternal(x, y, 'lidar_birds_api');
        }
    }

    toggleMute() {
        if (this.audioCtx) {
            if (this.audioCtx.state === 'running') {
                this.audioCtx.suspend();
                return true;
            } else {
                this.audioCtx.resume();
                return false;
            }
        }
        return false;
    }
}
