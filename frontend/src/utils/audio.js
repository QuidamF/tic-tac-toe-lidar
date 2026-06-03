class AudioService {
  constructor() {
    this.ctx = null;
  }

  init() {
    if (!this.ctx) {
      // Crear AudioContext. Algunos navegadores requieren interacción del usuario para activarlo.
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  playTone(freq, type, duration, startTimeOffset = 0) {
    this.init();
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type; // 'sine', 'square', 'sawtooth', 'triangle'
    osc.frequency.setValueAtTime(freq, ctx.currentTime + startTimeOffset);

    // Envolvente de volumen (Fade-out para evitar chasquidos)
    gain.gain.setValueAtTime(0.15, ctx.currentTime + startTimeOffset);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + startTimeOffset + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime + startTimeOffset);
    osc.stop(ctx.currentTime + startTimeOffset + duration);
  }

  playStartSound() {
    try {
      this.init();
      // Melodía corta ascendente de 3 notas
      this.playTone(330, "square", 0.15, 0); // E4
      this.playTone(440, "square", 0.15, 0.12); // A4
      this.playTone(554, "square", 0.25, 0.24); // C#5
    } catch (e) {
      console.warn("Audio Context bloqueado o no soportado:", e);
    }
  }

  playMoveSound(player) {
    try {
      this.init();
      // X tiene un tono ligeramente diferente a O
      const freq = player === "X" ? 523.25 : 392; // C5 o G4
      this.playTone(freq, "triangle", 0.12);
    } catch (e) {
      console.warn("Audio Context bloqueado o no soportado:", e);
    }
  }

  playStealSound() {
    try {
      this.init();
      const ctx = this.ctx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      // Barrido de frecuencia descendente (dramático)
      osc.frequency.exponentialRampToValueAtTime(146.83, ctx.currentTime + 0.35); // D3

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch (e) {
      console.warn("Audio Context bloqueado o no soportado:", e);
    }
  }

  playWinSound() {
    try {
      this.init();
      // Fanfarria triunfal arpegiada rápida
      // C4 (261.63), E4 (329.63), G4 (392.00), C5 (523.25)
      const notes = [261.63, 329.63, 392.00, 523.25];
      notes.forEach((freq, idx) => {
        this.playTone(freq, "triangle", 0.3, idx * 0.12);
      });
      // Nota final sostenida
      this.playTone(523.25, "square", 0.8, 0.48);
    } catch (e) {
      console.warn("Audio Context bloqueado o no soportado:", e);
    }
  }

  playResetSound() {
    try {
      this.init();
      const ctx = this.ctx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      // Barrido descendente suave
      osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.4);

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch (e) {
      console.warn("Audio Context bloqueado o no soportado:", e);
    }
  }
}

export const audioService = new AudioService();
