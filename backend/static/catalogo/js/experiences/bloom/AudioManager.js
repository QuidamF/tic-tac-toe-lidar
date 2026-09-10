/**
 * @file AudioManager.js
 * @description Sintetizador de audio ambiental tipo campana/marimba cristalina para "Particle Bloom".
 * Cuenta con un filtro pasabajo dinámico (BiquadFilter) que se suaviza durante el desvanecimiento de la flor.
 */

export class AudioManager {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.isMuted = false;
        this.initialized = false;

        // Frecuencias pentatónicas cristalinas (Pentatónica de Fa# / Mib Menor para timbre etéreo)
        this.scaleFrequencies = [
            185.00, 207.65, 233.08, 277.18, 311.13, // Octava 3 (Campanas cálidas)
            369.99, 415.30, 466.16, 554.37, 622.25, // Octava 4 (Marimba suave)
            739.99, 830.61, 932.33, 1108.73, 1244.51, // Octava 5 (Campanillas brillantes)
            1479.98, 1661.22, 1864.66, 2217.46, 2489.02 // Octava 6 (Destellos de cristal)
        ];
    }

    /**
     * Inicializa el AudioContext en la primera interacción.
     */
    init() {
        if (this.initialized) return;

        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioCtx();

            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.setValueAtTime(0.4, this.ctx.currentTime);
            this.masterGain.connect(this.ctx.destination);

            this.initialized = true;
        } catch (e) {
            console.warn('Web Audio API no soportada en este navegador.', e);
        }
    }

    /**
     * Reanuda el contexto si fue suspendido.
     */
    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    /**
     * Sintetiza el florecimiento sonoro arpegiado (arpegio de campanas/marimba) para la planta de luz.
     * @param {number} normY - Posición Y (0.0 a 1.0)
     * @param {number} durationSec - Duración estimada de la planta en segundos (~6.0s)
     * @returns {Object|null} Handle para modular el filtro y volumen durante el crecimiento y desintegración
     */
    playBloomSound(normY, durationSec = 6.0) {
        if (this.isMuted) return null;
        if (!this.initialized) this.init();
        this.resume();

        if (!this.ctx) return null;

        const now = this.ctx.currentTime;
        const invertedY = 1.0 - Math.max(0, Math.min(1, normY));
        const baseIndex = Math.floor(invertedY * (this.scaleFrequencies.length - 4));

        // Arpegio ascendente de 3 notas pentatónicas (representa el crecimiento de tronco -> ramas -> brotes)
        const arpeggioOffsets = [0, 2, 4];
        const notesGains = [];
        const comp = 0.35 + (1.0 - invertedY) * 0.25;

        // Filtro Pasa-Bajo Dinámico (BiquadFilter)
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2800, now);
        filter.frequency.exponentialRampToValueAtTime(200, now + durationSec);

        const masterNoteGain = this.ctx.createGain();
        masterNoteGain.gain.setValueAtTime(0, now);
        masterNoteGain.gain.linearRampToValueAtTime(comp, now + 0.01);
        masterNoteGain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

        masterNoteGain.connect(filter);
        filter.connect(this.masterGain);

        // Crear nota arpegiada para cada fase de ramificación
        for (let i = 0; i < arpeggioOffsets.length; i++) {
            const noteIndex = Math.min(this.scaleFrequencies.length - 1, baseIndex + arpeggioOffsets[i]);
            const freq = this.scaleFrequencies[noteIndex];
            const noteDelay = i * 0.18; // Desfase entre notas del arpegio (180ms)
            const noteStartTime = now + noteDelay;

            const oscMain = this.ctx.createOscillator();
            oscMain.type = 'sine';
            oscMain.frequency.setValueAtTime(freq, noteStartTime);

            const oscHarmonic = this.ctx.createOscillator();
            oscHarmonic.type = 'triangle';
            oscHarmonic.frequency.setValueAtTime(freq * 2.0, noteStartTime);

            const noteGain = this.ctx.createGain();
            const noteAttack = 0.005;
            const noteRelease = Math.max(1.0, durationSec - noteDelay);

            noteGain.gain.setValueAtTime(0, noteStartTime);
            noteGain.gain.linearRampToValueAtTime(0.35 - i * 0.06, noteStartTime + noteAttack);
            noteGain.gain.exponentialRampToValueAtTime(0.0001, noteStartTime + noteRelease);

            oscMain.connect(noteGain);
            oscHarmonic.connect(noteGain);
            noteGain.connect(masterNoteGain);

            oscMain.start(noteStartTime);
            oscHarmonic.start(noteStartTime);

            const stopTime = noteStartTime + noteRelease + 0.1;
            oscMain.stop(stopTime);
            oscHarmonic.stop(stopTime);

            notesGains.push(noteGain);
        }

        return {
            filter,
            masterNoteGain,
            startTime: now,
            duration: durationSec,
            /**
             * Modula la respuesta de audio en tiempo real basada en la opacidad de la planta.
             */
            updateFromOpacity: (opacity) => {
                if (!this.ctx) return;
                const currentTime = this.ctx.currentTime;
                const clampedOpacity = Math.max(0.0001, Math.min(1, opacity));
                masterNoteGain.gain.cancelScheduledValues(currentTime);
                masterNoteGain.gain.setValueAtTime(clampedOpacity * comp, currentTime);
            }
        };
    }

    /**
     * Alias para compatibilidad de reproductor sonoro.
     */
    playChime(normY, durationSec = 6.0) {
        return this.playBloomSound(normY, durationSec);
    }

    /**
     * Alterna estado de silencio.
     */
    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.masterGain && this.ctx) {
            this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.4, this.ctx.currentTime);
        }
        return this.isMuted;
    }
}
