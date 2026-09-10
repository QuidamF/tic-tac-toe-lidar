/**
 * @file AudioManager.js
 * @description Sintetizador de audio en tiempo real usando Web Audio API.
 * Mapea la posición vertical (Y) a frecuencias armónicas en escala pentatónica.
 * Maneja el volumen y fade-out sincronizados dinámicamente con la opacidad de las ondas.
 */

export class AudioManager {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.isMuted = false;
        this.initialized = false;

        this.lastNoteTime = 0;
        // Frecuencias en escala pentatónica armónica (Do Mayor / La Menor Pentatónica)
        // Rango optimizado para altavoces de laptops, pantallas táctiles y proyectores
        // (De 220 Hz [A3] a 1760 Hz [A6])
        this.scaleFrequencies = [
            220.00, 246.94, 261.63, 293.66, 329.63, // Octava 3 (Graves cálidos y audibles)
            392.00, 440.00, 493.88, 523.25, 587.33, // Octava 4 (Medios-graves)
            659.25, 783.99, 880.00, 987.77, 1046.50, // Octava 5 (Medios-agudos)
            1174.66, 1318.51, 1567.98, 1760.00, 1975.53 // Octava 6 (Agudos cristalinos)
        ];
    }

    /**
     * Inicializa el AudioContext en el primer gesto del usuario.
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
     * Asegura que el contexto de audio esté en estado 'running' (desbloqueo de autoplay policy).
     */
    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    /**
     * Reproduce una nota sintetizada según la posición vertical Y normalizada (0.0 = arriba, 1.0 = abajo).
     * @param {number} normY - Posición Y (0.0 a 1.0)
     * @param {number} durationSec - Duración estimada en segundos para el fade out sincronizado
     * @returns {Object|null} Objeto manipulador del nodo de audio para sincronización continua de volumen
     */
    playNote(normY, durationSec = 1.4) {
        if (this.isMuted) return null;
        if (!this.initialized) this.init();
        this.resume();

        if (!this.ctx) return null;

        const now = this.ctx.currentTime;
        if (now - this.lastNoteTime < 0.09) {
            return null; // Evitar saturación de osciladores
        }
        this.lastNoteTime = now;

        // Mapear normY (0.0 = arriba = notas agudas; 1.0 = abajo = notas graves)
        const invertedY = 1.0 - Math.max(0, Math.min(1, normY));
        const index = Math.floor(invertedY * (this.scaleFrequencies.length - 1));
        const freq = this.scaleFrequencies[index];

        // Compensación de volumen para ecualización perceptual (las notas graves necesitan ligeramente más amplitud)
        const volumeCompensation = 0.35 + (1.0 - invertedY) * 0.25;

        // Oscilador Principal (Senoidal pura)
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);

        // Oscilador Armónico Superior (Triangular para riqueza y nitidez en altavoces de pantallas)
        const harmonicOsc = this.ctx.createOscillator();
        harmonicOsc.type = 'triangle';
        harmonicOsc.frequency.setValueAtTime(freq * 2.0, now); // 1ª octava armónica

        // Control de Ganancia / Envolvente ADSR
        const noteGain = this.ctx.createGain();
        const harmonicGain = this.ctx.createGain();

        // Envolvente rápida de Ataque (5ms)
        const attackTime = 0.006;
        const peakGain = volumeCompensation;
        
        noteGain.gain.setValueAtTime(0, now);
        noteGain.gain.linearRampToValueAtTime(peakGain, now + attackTime);

        harmonicGain.gain.setValueAtTime(0, now);
        harmonicGain.gain.linearRampToValueAtTime(peakGain * 0.35, now + attackTime);

        // Decay suave y release exponencial sincronizado con la duración de la onda
        const releaseTime = Math.max(0.6, durationSec);
        noteGain.gain.exponentialRampToValueAtTime(0.0001, now + releaseTime);
        harmonicGain.gain.exponentialRampToValueAtTime(0.0001, now + releaseTime);

        // Conexiones de nodos
        osc.connect(noteGain);
        harmonicOsc.connect(harmonicGain);

        noteGain.connect(this.masterGain);
        harmonicGain.connect(this.masterGain);

        // Iniciar osciladores
        osc.start(now);
        harmonicOsc.start(now);

        // Detener y desconectar nodos
        const stopTime = now + releaseTime + 0.1;
        osc.stop(stopTime);
        harmonicOsc.stop(stopTime);

        setTimeout(() => {
            try {
                osc.disconnect();
                harmonicOsc.disconnect();
                noteGain.disconnect();
                harmonicGain.disconnect();
            } catch (e) {
                // Nodos ya desasociados
            }
        }, (releaseTime + 0.2) * 1000);

        return {
            noteGain,
            harmonicGain,
            startTime: now,
            duration: releaseTime,

            /**
             * Permite actualizar el volumen en tiempo real basado en la opacidad actual de la onda.
             * @param {number} opacity - Valor de opacidad actual (0.0 a 1.0)
             */
            updateVolumeFromOpacity: (opacity) => {
                if (!this.ctx) return;
                const currentTime = this.ctx.currentTime;
                const clampedOpacity = Math.max(0.0001, Math.min(1, opacity));
                noteGain.gain.cancelScheduledValues(currentTime);
                noteGain.gain.setValueAtTime(clampedOpacity * peakGain, currentTime);
            }
        };
    }

    /**
     * Alterna estado de silencio (Mute/Unmute).
     * @returns {boolean} Estado mutado resultante
     */
    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.masterGain && this.ctx) {
            this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.35, this.ctx.currentTime);
        }
        return this.isMuted;
    }
}
