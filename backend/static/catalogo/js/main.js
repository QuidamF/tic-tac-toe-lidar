/**
 * @file main.js
 * @description Punto de entrada principal de la aplicación Catálogo de Experiencias Interactivas.
 * Gestiona el enrutamiento del catálogo, pantalla completa, HUD y la integración del InputManager.
 */

import { InputManager } from './core/InputManager.js';
import { WaveExperience } from './experiences/waves/WaveExperience.js';
import { BloomExperience } from './experiences/bloom/BloomExperience.js';
import { NebulaExperience } from './experiences/nebula/NebulaExperience.js';
import { GardenExperience } from './experiences/garden/GardenExperience.js';
import { SpritesExperience } from './experiences/sprites/SpritesExperience.js';
import { BirdsExperience } from './experiences/birds/BirdsExperience.js';
import { LinkedParticlesExperience } from './experiences/linkedparticles/LinkedParticlesExperience.js';
import { GhostsExperience } from './experiences/ghosts/GhostsExperience.js';

class CatalogApp {
    constructor() {
        this.catalogView = document.getElementById('catalog-view');
        this.experienceContainer = document.getElementById('experience-container');
        this.canvas = document.getElementById('experience-canvas');
        this.touchHint = document.getElementById('touch-hint');
        this.hudTitle = document.getElementById('hud-experience-title');

        // HUD Elements
        this.btnBack = document.getElementById('btn-back');
        this.btnAudioToggle = document.getElementById('btn-audio-toggle');
        this.btnFullscreen = document.getElementById('btn-fullscreen');
        this.btnLidarSim = document.getElementById('btn-lidar-sim');
        this.iconAudioOn = document.getElementById('icon-audio-on');
        this.iconAudioOff = document.getElementById('icon-audio-off');

        this.inputManager = null;
        this.currentExperience = null;
        this.hasInteracted = false;

        this._initListeners();
    }

    /**
     * Vincula los botones de la interfaz de usuario y eventos globales.
     * @private
     */
    _initListeners() {
        // Botón Iniciar "Gato LiDAR"
        const btnLaunchGato = document.getElementById('btn-launch-gato');
        if (btnLaunchGato) {
            btnLaunchGato.addEventListener('click', (e) => {
                e.stopPropagation();
                this.launchExperience('gato');
            });
        }

        const gatoCard = document.querySelector('.experience-card[data-experience="gato"]');
        if (gatoCard) {
            gatoCard.addEventListener('click', () => {
                this.launchExperience('gato');
            });
        }

        // Botón Iniciar "Ondas Interactivas"
        const btnLaunchWaves = document.getElementById('btn-launch-waves');
        if (btnLaunchWaves) {
            btnLaunchWaves.addEventListener('click', (e) => {
                e.stopPropagation();
                this.launchExperience('waves');
            });
        }

        const wavesCard = document.querySelector('.experience-card[data-experience="waves"]');
        if (wavesCard) {
            wavesCard.addEventListener('click', () => {
                this.launchExperience('waves');
            });
        }

        // Botón Iniciar "Particle Bloom"
        const btnLaunchBloom = document.getElementById('btn-launch-bloom');
        if (btnLaunchBloom) {
            btnLaunchBloom.addEventListener('click', (e) => {
                e.stopPropagation();
                this.launchExperience('bloom');
            });
        }

        const bloomCard = document.querySelector('.experience-card[data-experience="bloom"]');
        if (bloomCard) {
            bloomCard.addEventListener('click', () => {
                this.launchExperience('bloom');
            });
        }

        // Botón Iniciar "Nebulosa Cósmica"
        const btnLaunchNebula = document.getElementById('btn-launch-nebula');
        if (btnLaunchNebula) {
            btnLaunchNebula.addEventListener('click', (e) => {
                e.stopPropagation();
                this.launchExperience('nebula');
            });
        }

        const nebulaCard = document.querySelector('.experience-card[data-experience="nebula"]');
        if (nebulaCard) {
            nebulaCard.addEventListener('click', () => {
                this.launchExperience('nebula');
            });
        }

        // Botón Iniciar "Jardín Vivo Procedural"
        const btnLaunchGarden = document.getElementById('btn-launch-garden');
        if (btnLaunchGarden) {
            btnLaunchGarden.addEventListener('click', (e) => {
                e.stopPropagation();
                this.launchExperience('garden');
            });
        }

        const gardenCard = document.querySelector('.experience-card[data-experience="garden"]');
        if (gardenCard) {
            gardenCard.addEventListener('click', () => {
                this.launchExperience('garden');
            });
        }

        // Botón Iniciar "Sprites Instanciados 3D"
        const btnLaunchSprites = document.getElementById('btn-launch-sprites');
        if (btnLaunchSprites) {
            btnLaunchSprites.addEventListener('click', (e) => {
                e.stopPropagation();
                this.launchExperience('sprites');
            });
        }

        const spritesCard = document.querySelector('.experience-card[data-experience="sprites"]');
        if (spritesCard) {
            spritesCard.addEventListener('click', () => {
                this.launchExperience('sprites');
            });
        }

        // Botón Iniciar "Bandada de Aves 3D"
        const btnLaunchBirds = document.getElementById('btn-launch-birds');
        if (btnLaunchBirds) {
            btnLaunchBirds.addEventListener('click', (e) => {
                e.stopPropagation();
                this.launchExperience('birds');
            });
        }

        const birdsCard = document.querySelector('.experience-card[data-experience="birds"]');
        if (birdsCard) {
            birdsCard.addEventListener('click', () => {
                this.launchExperience('birds');
            });
        }

        // Botón Iniciar "Partículas Vinculadas 3D"
        const btnLaunchLinked = document.getElementById('btn-launch-linkedparticles');
        if (btnLaunchLinked) {
            btnLaunchLinked.addEventListener('click', (e) => {
                e.stopPropagation();
                this.launchExperience('linkedparticles');
            });
        }

        const linkedCard = document.querySelector('.experience-card[data-experience="linkedparticles"]');
        if (linkedCard) {
            linkedCard.addEventListener('click', () => {
                this.launchExperience('linkedparticles');
            });
        }

        // Botón Iniciar "Caza Fantasmas: Mansión Embrujada"
        const btnLaunchGhosts = document.getElementById('btn-launch-ghosts');
        if (btnLaunchGhosts) {
            btnLaunchGhosts.addEventListener('click', (e) => {
                e.stopPropagation();
                this.launchExperience('ghosts');
            });
        }

        const ghostsCard = document.querySelector('.experience-card[data-experience="ghosts"]');
        if (ghostsCard) {
            ghostsCard.addEventListener('click', () => {
                this.launchExperience('ghosts');
            });
        }

        // Regresar al Catálogo
        if (this.btnBack) {
            this.btnBack.addEventListener('click', () => {
                this.closeExperience();
            });
        }

        // Alternar Audio (Mute / Unmute)
        if (this.btnAudioToggle) {
            this.btnAudioToggle.addEventListener('click', () => {
                if (this.currentExperience && this.currentExperience.toggleMute) {
                    const isMuted = this.currentExperience.toggleMute();
                    this.iconAudioOn.classList.toggle('hidden', isMuted);
                    this.iconAudioOff.classList.toggle('hidden', !isMuted);
                }
            });
        }

        // Pantalla Completa
        if (this.btnFullscreen) {
            this.btnFullscreen.addEventListener('click', () => {
                this.toggleFullscreen();
            });
        }

        // Simular entrada LiDAR aleatoria
        if (this.btnLidarSim) {
            this.btnLidarSim.addEventListener('click', () => {
                this.simulateLidarInput();
            });
        }

        // Redimensionamiento de pantalla
        window.addEventListener('resize', () => {
            if (this.currentExperience && this.currentExperience.resize) {
                this.currentExperience.resize();
            }
        });
    }

    /**
     * Lanza la experiencia seleccionada en modo pantalla completa.
     * @param {string} expId - Identificador de la experiencia ('waves' | 'bloom' | 'nebula' | 'garden')
     */
    launchExperience(expId) {
        if (expId === 'gato') {
            // Notificar a la app de React (padre) para abrir el juego
            window.parent.postMessage({ type: 'LAUNCH_GATO' }, '*');
            return;
        }

        // Limpiar experiencia previa si existe
        if (this.currentExperience) {
            this.currentExperience.stop();
            this.currentExperience = null;
        }

        // Ocultar vista del catálogo y mostrar contenedor fullscreen
        this.catalogView.classList.add('hidden');
        this.experienceContainer.classList.remove('hidden');

        // Resetear hint
        this.touchHint.classList.remove('fade-out');
        this.hasInteracted = false;

        // Inicializar InputManager si no existe
        if (!this.inputManager) {
            this.inputManager = new InputManager(this.canvas);
            this.inputManager.onInput(() => {
                if (!this.hasInteracted) {
                    this.hasInteracted = true;
                    this.touchHint.classList.add('fade-out');
                }
            });
        }

        // Instanciar la experiencia deseada
        if (expId === 'waves') {
            if (this.hudTitle) this.hudTitle.textContent = 'Ondas Interactivas';
            this.currentExperience = new WaveExperience(this.canvas, this.inputManager);
        } else if (expId === 'bloom') {
            if (this.hudTitle) this.hudTitle.textContent = 'Particle Bloom';
            this.currentExperience = new BloomExperience(this.canvas, this.inputManager);
        } else if (expId === 'nebula') {
            if (this.hudTitle) this.hudTitle.textContent = 'Nebulosa Cósmica';
            this.currentExperience = new NebulaExperience(this.canvas, this.inputManager);
        } else if (expId === 'garden') {
            if (this.hudTitle) this.hudTitle.textContent = 'Jardín Vivo Procedural';
            this.currentExperience = new GardenExperience(this.canvas, this.inputManager);
        } else if (expId === 'sprites') {
            if (this.hudTitle) this.hudTitle.textContent = 'Sprites Instanciados 3D';
            this.currentExperience = new SpritesExperience(this.canvas, this.inputManager);
        } else if (expId === 'birds') {
            if (this.hudTitle) this.hudTitle.textContent = 'Bandada de Aves 3D';
            this.currentExperience = new BirdsExperience(this.canvas, this.inputManager);
        } else if (expId === 'linkedparticles') {
            if (this.hudTitle) this.hudTitle.textContent = 'Partículas Vinculadas 3D';
            this.currentExperience = new LinkedParticlesExperience(this.canvas, this.inputManager);
        } else if (expId === 'ghosts') {
            if (this.hudTitle) this.hudTitle.textContent = 'Caza Fantasmas';
            this.currentExperience = new GhostsExperience(this.canvas, this.inputManager);
        }

        if (this.currentExperience) {
            this.currentExperience.init();
            this.currentExperience.start();
        }
    }

    /**
     * Cierra la experiencia actual y regresa al menú del catálogo.
     */
    closeExperience() {
        if (this.currentExperience) {
            this.currentExperience.stop();
            this.currentExperience = null;
        }

        this.experienceContainer.classList.add('hidden');
        this.catalogView.classList.remove('hidden');
    }

    /**
     * Alterna el modo de pantalla completa nativo del navegador.
     */
    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch((err) => {
                console.log(`Error al activar pantalla completa: ${err.message}`);
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    }

    /**
     * Simula la llegada de coordenadas aleatorias enviadas por un sensor LiDAR o Visión Artificial.
     */
    simulateLidarInput() {
        if (!this.currentExperience || !this.currentExperience.isRunning) return;

        const margin = 100;
        const width = this.canvas.clientWidth || window.innerWidth;
        const height = this.canvas.clientHeight || window.innerHeight;

        const randomX = margin + Math.random() * (width - margin * 2);
        const randomY = margin + Math.random() * (height - margin * 2);

        this.currentExperience.triggerWave(randomX, randomY);
    }
}

// Inicializar la aplicación al cargar la página
window.addEventListener('DOMContentLoaded', () => {
    const app = new CatalogApp();
    
    // Auto-launch si viene parámetro en URL
    const urlParams = new URLSearchParams(window.location.search);
    const autoLaunchExp = urlParams.get('launch');
    if (autoLaunchExp) {
        // Un pequeño retraso para permitir que la interfaz se inicialice bien
        setTimeout(() => {
            app.launchExperience(autoLaunchExp);
        }, 100);
    }
    
    // Desbloquear AudioContext en cualquier interacción del usuario o evento
    const unlockAudio = () => {
        if (app.currentExperience) {
            if (app.currentExperience.audioCtx && app.currentExperience.audioCtx.state === 'suspended') {
                app.currentExperience.audioCtx.resume();
            }
            if (app.currentExperience.audioManager && app.currentExperience.audioManager.ctx && app.currentExperience.audioManager.ctx.state === 'suspended') {
                app.currentExperience.audioManager.ctx.resume();
            }
        }
    };

    window.addEventListener('pointerdown', unlockAudio, { passive: true });
    window.addEventListener('click', unlockAudio, { passive: true });
    window.addEventListener('touchstart', unlockAudio, { passive: true });

    // Exponer API global para pruebas de integraciones externas (LiDAR, WebSockets, Python, TouchOSC)
    window.CatalogApp = {
        triggerInput: (x, y) => {
            unlockAudio();
            if (app.currentExperience && app.currentExperience.triggerWave) {
                app.currentExperience.triggerWave(x, y);
            } else {
                console.warn('Inicia la experiencia "Ondas Interactivas" para probar el disparador LiDAR.');
            }
        },
        triggerEvent: (type, x, y) => {
            unlockAudio();
            if (app.inputManager) {
                app.inputManager.dispatchExternalEvent(type, x, y);
            }
        }
    };
});
