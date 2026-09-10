/**
 * @file AudioManager.js
 * @description Sintetizador de textura sonora cósmica con Web Audio API.
 * Genera un dron de fondo etéreo y armonías dinámicas dependientes de la velocidad del swipe.
 */

export class AudioManager {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.droneGain = null;
        this.interactiveGain = null;
        this.biquadFilter = null;
        this.isMuted = false;
        this.initialized = false;

        this.targetVolume = 0;
        this.currentVolume = 0;
        this.targetCutoff = 220;
        this.currentCutoff = 220;
    }

    /**
     * Inicializa el AudioContext y los osciladores del dron cósmico.
     */
    init() {
        if (this.initialized) return;

        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioCtx();

            const now = this.ctx.currentTime;

            // Ganancia Master
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.setValueAtTime(0.4, now);
            this.masterGain.connect(this.ctx.destination);

            // Filtro Pasa-Bajo Dinámico Principal
            this.biquadFilter = this.ctx.createBiquadFilter();
            this.biquadFilter.type = 'lowpass';
            this.biquadFilter.frequency.setValueAtTime(250, now);
            this.biquadFilter.Q.setValueAtTime(1.5, now);
            this.biquadFilter.connect(this.masterGain);

            // Dron Ambiental Cósmico (55Hz / A1 senoidal + sub-triangular)
            const droneOsc1 = this.ctx.createOscillator();
            droneOsc1.type = 'sine';
            droneOsc1.frequency.setValueAtTime(55.0, now);

            const droneOsc2 = this.ctx.createOscillator();
            droneOsc2.type = 'triangle';
            droneOsc2.frequency.setValueAtTime(110.0, now);

            this.droneGain = this.ctx.createGain();
            this.droneGain.gain.setValueAtTime(0.12, now);

            droneOsc1.connect(this.droneGain);
            droneOsc2.connect(this.droneGain);
            this.droneGain.connect(this.biquadFilter);

            droneOsc1.start(now);
            droneOsc2.start(now);

            // Ganancia para textura de swipe interactivo
            this.interactiveGain = this.ctx.createGain();
            this.interactiveGain.gain.setValueAtTime(0, now);
            this.interactiveGain.connect(this.biquadFilter);

            // Osciladores interactivos (Agudos cristalinos y graves)
            this.intOscBass = this.ctx.createOscillator();
            this.intOscBass.type = 'sine';
            this.intOscBass.frequency.setValueAtTime(130.81, now);

            this.intOscHigh = this.ctx.createOscillator();
            this.intOscHigh.type = 'triangle';
            this.intOscHigh.frequency.setValueAtTime(523.25, now);

            this.intOscBass.connect(this.interactiveGain);
            this.intOscHigh.connect(this.interactiveGain);

            this.intOscBass.start(now);
            this.intOscHigh.start(now);

            this.initialized = true;
        } catch (e) {
            console.warn('Web Audio API no soportada.', e);
        }
    }

    /**
     * Reanuda el contexto.
     */
    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    /**
     * Modula la textura sonora en tiempo real basada en la velocidad del swipe.
     * @param {number} maxSpeed - Velocidad máxima de deslizamiento de los punteros en px/frame
     * @param {boolean} isInteracting - True si hay toques activos
     */
    updateInteraction(maxSpeed, isInteracting) {
        if (!this.initialized || this.isMuted) return;
        this.resume();

        const now = this.ctx.currentTime;

        if (isInteracting && maxSpeed > 0.5) {
            // Velocidades rápidas -> abrir filtro hacia agudos brillantes (hasta 2400Hz)
            // Velocidades lentas -> mantener frecuencias graves profundas (300Hz)
            const speedFactor = Math.min(1.0, maxSpeed / 35.0);

            const cutoff = 220 + speedFactor * 2200;
            const volume = 0.08 + speedFactor * 0.35;

            this.biquadFilter.frequency.setTargetAtTime(cutoff, now, 0.08);
            this.interactiveGain.gain.setTargetAtTime(volume, now, 0.08);

            // Frecuencia dinámica de armónicos brillantes
            const highFreq = 392.0 + speedFactor * 1174.0;
            const bassFreq = 110.0 + speedFactor * 130.0;

            this.intOscHigh.frequency.setTargetAtTime(highFreq, now, 0.1);
            this.intOscBass.frequency.setTargetAtTime(bassFreq, now, 0.1);
        } else {
            // Disipar suavemente hacia la calma estelar
            this.biquadFilter.frequency.setTargetAtTime(220, now, 0.4);
            this.interactiveGain.gain.setTargetAtTime(0, now, 0.3);
        }
    }

    /**
     * Alterna silencio.
     */
    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.masterGain && this.ctx) {
            this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.4, this.ctx.currentTime);
        }
        return this.isMuted;
    }
}
