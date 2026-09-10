/**
 * @file GhostsExperience.js
 * @description Controlador y renderizador Canvas 2D para "Caza Fantasmas: Mansión Embrujada".
 * Renderiza la fachada gótica, ventanas, sprites procedimentales de fantasmas, explosiones y sintetizador de sonido.
 */

import { GhostEngine } from './GhostEngine.js';

export class GhostsExperience {
    /**
     * @param {HTMLCanvasElement} canvas 
     * @param {InputManager} inputManager 
     */
    constructor(canvas, inputManager) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d', { alpha: false });
        this.inputManager = inputManager;

        this.engine = new GhostEngine();
        this.audioCtx = null;

        this.isRunning = false;
        this.animFrameId = null;
        this.lastTimestamp = 0;

        this._onInputEvent = this._onInputEvent.bind(this);
        this._loop = this._loop.bind(this);
    }

    init() {
        this._initAudio();
        this.resize();

        if (this.inputManager) {
            this.inputManager.offInput(this._onInputEvent);
            this.inputManager.onInput(this._onInputEvent);
        }
    }

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

    _resumeAudio() {
        if (this.audioCtx && this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
    }

    _playSound(type) {
        this._resumeAudio();
        if (!this.audioCtx) return;

        try {
            const now = this.audioCtx.currentTime;
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();

            osc.connect(gain);
            gain.connect(this.audioCtx.destination);

            if (type === 'hit_normal') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(520, now);
                osc.frequency.exponentialRampToValueAtTime(1040, now + 0.15);
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
                osc.start(now);
                osc.stop(now + 0.18);
            } else if (type === 'hit_speed') {
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(800, now);
                osc.frequency.exponentialRampToValueAtTime(1600, now + 0.2);
                gain.gain.setValueAtTime(0.25, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
                osc.start(now);
                osc.stop(now + 0.22);
            } else if (type === 'hit_golden') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(600, now);
                osc.frequency.linearRampToValueAtTime(1200, now + 0.1);
                osc.frequency.linearRampToValueAtTime(1800, now + 0.35);
                gain.gain.setValueAtTime(0.3, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
                osc.start(now);
                osc.stop(now + 0.35);
            } else if (type === 'hit_trick') {
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(300, now);
                osc.frequency.exponentialRampToValueAtTime(120, now + 0.25);
                gain.gain.setValueAtTime(0.25, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
                osc.start(now);
                osc.stop(now + 0.25);
            } else if (type === 'start') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(220, now);
                osc.frequency.exponentialRampToValueAtTime(880, now + 0.4);
                gain.gain.setValueAtTime(0.3, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
                osc.start(now);
                osc.stop(now + 0.4);
            }
        } catch (e) {
            // Ignorar errores de audio
        }
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.lastTimestamp = performance.now();
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
        const width = this.canvas.clientWidth || window.innerWidth;
        const height = this.canvas.clientHeight || window.innerHeight;
        this.canvas.width = width;
        this.canvas.height = height;
    }

    _onInputEvent(event) {
        if (!this.isRunning) return;

        if (event.type === 'pointerdown' || event.type === 'external') {
            // Si está en pantalla de inicio o Game Over, cualquier toque inicia la partida
            if (this.engine.gameState === 'START' || this.engine.gameState === 'GAMEOVER') {
                this.engine.startGame();
                this._playSound('start');
                return;
            }

            // Registrar hit en las ventanas
            const hitResult = this.engine.registerHit(event.normX, event.normY);
            if (hitResult) {
                this._playSound(hitResult.soundType);
            }
        }
    }

    _loop(timestamp) {
        if (!this.isRunning) return;

        const deltaSec = Math.min(0.1, (timestamp - this.lastTimestamp) / 1000);
        this.lastTimestamp = timestamp;

        this.engine.update(deltaSec);
        this._render();

        this.animFrameId = requestAnimationFrame(this._loop);
    }

    _render() {
        const width = this.canvas.width;
        const height = this.canvas.height;
        const ctx = this.ctx;

        // 1. Cielo Nocturno Espeluznante
        const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
        skyGrad.addColorStop(0, '#040510');
        skyGrad.addColorStop(0.5, '#0B0F28');
        skyGrad.addColorStop(1, '#1A1838');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, width, height);

        // 2. Luna Llena Brillante
        const moonX = width * 0.22;
        const moonY = height * 0.18;
        const moonR = height * 0.08;

        const moonGlow = ctx.createRadialGradient(moonX, moonY, moonR * 0.8, moonX, moonY, moonR * 2.5);
        moonGlow.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
        moonGlow.addColorStop(0.4, 'rgba(0, 240, 255, 0.3)');
        moonGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = moonGlow;
        ctx.beginPath();
        ctx.arc(moonX, moonY, moonR * 2.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#E2E8F0';
        ctx.beginPath();
        ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
        ctx.fill();

        // 3. Fachada de la Mansión Gótica
        this._drawMansionFacade(width, height);

        // 4. Ventanas Interactivas y Fantasmas
        this._drawWindowsAndGhosts(width, height);

        // 5. Árboles, Tumbas y Cerca del Primer Plano
        this._drawForegroundDetails(width, height);

        // 6. Partículas de Impacto
        this._drawParticles(width, height);

        // 7. Textos Flotantes de Puntos
        this._drawFloatingTexts(width, height);

        // 8. Interfaz HUD (Puntos, Temporizador, Combos, Pantallas)
        this._drawHUD(width, height);
    }

    _drawMansionFacade(w, h) {
        const ctx = this.ctx;

        // Sombra / Silueta base de la mansión
        ctx.fillStyle = '#0F1224';
        
        // Cuerpo Principal
        ctx.fillRect(w * 0.25, h * 0.25, w * 0.50, h * 0.45);
        
        // Torrecilla Central
        ctx.beginPath();
        ctx.moveTo(w * 0.44, h * 0.25);
        ctx.lineTo(w * 0.50, h * 0.08);
        ctx.lineTo(w * 0.56, h * 0.25);
        ctx.fill();

        // Techos laterales inclinados
        ctx.beginPath();
        ctx.moveTo(w * 0.24, h * 0.30);
        ctx.lineTo(w * 0.36, h * 0.25);
        ctx.lineTo(w * 0.36, h * 0.40);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(w * 0.76, h * 0.30);
        ctx.lineTo(w * 0.64, h * 0.25);
        ctx.lineTo(w * 0.64, h * 0.40);
        ctx.fill();

        // Moldura y textura de ladrillos oscuros
        ctx.strokeStyle = '#1E2342';
        ctx.lineWidth = 3;
        ctx.strokeRect(w * 0.25, h * 0.25, w * 0.50, h * 0.45);
    }

    _drawWindowsAndGhosts(w, h) {
        const ctx = this.ctx;

        for (let win of this.engine.windows) {
            const wx = win.normX * w;
            const wy = win.normY * h;
            const ww = win.w * w;
            const wh = win.h * h;
            const x = wx - ww / 2;
            const y = wy - wh / 2;

            // Fondo de la ventana según el estado
            if (win.state === 'WARN') {
                const warnGlow = ctx.createRadialGradient(wx, wy, 0, wx, wy, ww * 1.2);
                warnGlow.addColorStop(0, 'rgba(245, 158, 11, 0.9)');
                warnGlow.addColorStop(0.7, 'rgba(217, 119, 6, 0.5)');
                warnGlow.addColorStop(1, 'rgba(0, 0, 0, 0.8)');
                ctx.fillStyle = warnGlow;
            } else if (win.state === 'GHOST') {
                ctx.fillStyle = '#FBBF24';
            } else {
                ctx.fillStyle = '#080C1A';
            }

            // Marco de ventana gótica con arco superior
            ctx.beginPath();
            ctx.moveTo(x, y + wh);
            ctx.lineTo(x, y + wh * 0.35);
            ctx.quadraticCurveTo(wx, y - wh * 0.15, x + ww, y + wh * 0.35);
            ctx.lineTo(x + ww, y + wh);
            ctx.closePath();
            ctx.fill();

            ctx.strokeStyle = '#334155';
            ctx.lineWidth = 4;
            ctx.stroke();

            // Dibujar Fantasma si está activo
            if (win.state === 'GHOST') {
                const ghostY = wy + win.ghostYOffset * h;
                this._drawGhostSprite(wx, ghostY, ww * 0.85, win.ghostType);
            } else if (win.state === 'HIT') {
                this._drawEctoplasmSplash(wx, wy, ww);
            }
        }
    }

    _drawGhostSprite(cx, cy, size, type) {
        const ctx = this.ctx;
        const r = size * 0.45;

        let bodyColor = '#FFFFFF';
        let glowColor = 'rgba(255, 255, 255, 0.6)';
        let eyeColor = '#0F172A';

        if (type === 'SPEED') {
            bodyColor = '#00F0FF';
            glowColor = 'rgba(0, 240, 255, 0.8)';
            eyeColor = '#FFFFFF';
        } else if (type === 'TRICK') {
            bodyColor = '#C026D3';
            glowColor = 'rgba(192, 38, 211, 0.8)';
            eyeColor = '#FBBF24';
        } else if (type === 'GOLDEN') {
            bodyColor = '#F59E0B';
            glowColor = 'rgba(245, 158, 11, 0.9)';
            eyeColor = '#FFFFFF';
        }

        // Resplandor del fantasma
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 20;

        // Cuerpo del fantasma
        ctx.fillStyle = bodyColor;
        ctx.beginPath();
        ctx.arc(cx, cy - r * 0.2, r, Math.PI, 0, false);
        ctx.lineTo(cx + r, cy + r * 0.8);
        
        // Faldón ondeado inferior del fantasma
        ctx.quadraticCurveTo(cx + r * 0.5, cy + r * 0.4, cx, cy + r * 0.8);
        ctx.quadraticCurveTo(cx - r * 0.5, cy + r * 0.4, cx - r, cy + r * 0.8);
        ctx.closePath();
        ctx.fill();

        ctx.shadowBlur = 0; // Desactivar sombra para detalles

        // Ojos y Expresión
        ctx.fillStyle = eyeColor;
        ctx.beginPath();
        ctx.arc(cx - r * 0.35, cy - r * 0.3, r * 0.18, 0, Math.PI * 2);
        ctx.arc(cx + r * 0.35, cy - r * 0.3, r * 0.18, 0, Math.PI * 2);
        ctx.fill();

        // Boca divertida
        ctx.beginPath();
        if (type === 'TRICK') {
            ctx.arc(cx, cy + r * 0.1, r * 0.22, 0, Math.PI, false); // Boca enojada
        } else {
            ctx.arc(cx, cy, r * 0.25, 0, Math.PI, false); // Boca feliz
        }
        ctx.fill();
    }

    _drawEctoplasmSplash(cx, cy, size) {
        const ctx = this.ctx;
        ctx.fillStyle = '#00F0FF';
        ctx.beginPath();
        ctx.arc(cx, cy, size * 0.5, 0, Math.PI * 2);
        ctx.fill();
    }

    _drawForegroundDetails(w, h) {
        const ctx = this.ctx;
        ctx.fillStyle = '#070A14';
        // Suelo y Reja inferior
        ctx.fillRect(0, h * 0.70, w, h * 0.30);

        // Árboles tenebrosos laterales
        ctx.strokeStyle = '#0B1020';
        ctx.lineWidth = 8;

        // Árbol Izquierdo
        ctx.beginPath();
        ctx.moveTo(w * 0.05, h);
        ctx.lineTo(w * 0.12, h * 0.50);
        ctx.lineTo(w * 0.06, h * 0.35);
        ctx.moveTo(w * 0.12, h * 0.50);
        ctx.lineTo(w * 0.18, h * 0.38);
        ctx.stroke();

        // Árbol Derecho
        ctx.beginPath();
        ctx.moveTo(w * 0.95, h);
        ctx.lineTo(w * 0.88, h * 0.50);
        ctx.lineTo(w * 0.94, h * 0.35);
        ctx.moveTo(w * 0.88, h * 0.50);
        ctx.lineTo(w * 0.82, h * 0.38);
        ctx.stroke();
    }

    _drawParticles(w, h) {
        const ctx = this.ctx;
        for (let p of this.engine.particles) {
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x * w, p.y * h, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1.0;
    }

    _drawFloatingTexts(w, h) {
        const ctx = this.ctx;
        ctx.textAlign = 'center';
        ctx.font = 'bold 28px Outfit, sans-serif';

        for (let ft of this.engine.floatingTexts) {
            ctx.globalAlpha = ft.alpha;
            ctx.fillStyle = ft.color;
            ctx.shadowColor = '#000';
            ctx.shadowBlur = 8;
            ctx.fillText(ft.text, ft.normX * w, ft.normY * h);
        }
        ctx.globalAlpha = 1.0;
        ctx.shadowBlur = 0;
    }

    _drawHUD(w, h) {
        const ctx = this.ctx;

        if (this.engine.gameState === 'PLAYING') {
            // Barra Superior de HUD
            ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
            ctx.fillRect(w * 0.05, 20, w * 0.90, 60);
            ctx.strokeStyle = '#00F0FF';
            ctx.lineWidth = 2;
            ctx.strokeRect(w * 0.05, 20, w * 0.90, 60);

            // Puntuación
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 26px Outfit, sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(`PUNTOS: ${this.engine.score}`, w * 0.08, 58);

            // Combo Multiplicador
            if (this.engine.combo >= 3) {
                const mult = this.engine.combo >= 10 ? '5x 🔥' : (this.engine.combo >= 5 ? '3x ⚡' : '2x ✨');
                ctx.fillStyle = '#F59E0B';
                ctx.fillText(`COMBO ${mult}`, w * 0.38, 58);
            }

            // Temporizador
            ctx.fillStyle = this.engine.timeRemaining <= 10 ? '#EF4444' : '#00F0FF';
            ctx.textAlign = 'right';
            ctx.fillText(`TIEMPO: ${Math.ceil(this.engine.timeRemaining)}s`, w * 0.92, 58);

        } else if (this.engine.gameState === 'START') {
            // Pantalla de Inicio Espeluznante
            ctx.fillStyle = 'rgba(4, 8, 20, 0.85)';
            ctx.fillRect(0, 0, w, h);

            ctx.textAlign = 'center';
            ctx.fillStyle = '#00F0FF';
            ctx.font = 'bold 44px Outfit, sans-serif';
            ctx.shadowColor = '#00F0FF';
            ctx.shadowBlur = 15;
            ctx.fillText('CAZA FANTASMAS: MANSIÓN EMBRUJADA', w / 2, h * 0.38);

            ctx.shadowBlur = 0;
            ctx.fillStyle = '#E2E8F0';
            ctx.font = '20px Outfit, sans-serif';
            ctx.fillText('Atrapa a los fantasmas que asoman por las ventanas antes de que se escapen.', w / 2, h * 0.48);
            ctx.fillText('Cuidado con el Fantasma Sombra Púrpura 💜 (¡Resta puntos!).', w / 2, h * 0.53);

            // Botón Comenzar
            ctx.fillStyle = '#D900FF';
            ctx.fillRect(w / 2 - 140, h * 0.65 - 30, 280, 60);
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 24px Outfit, sans-serif';
            ctx.fillText('¡TOCA PARA JUGAR!', w / 2, h * 0.65 + 8);

        } else if (this.engine.gameState === 'GAMEOVER') {
            // Pantalla de Game Over
            ctx.fillStyle = 'rgba(4, 8, 20, 0.90)';
            ctx.fillRect(0, 0, w, h);

            ctx.textAlign = 'center';
            ctx.fillStyle = '#EF4444';
            ctx.font = 'bold 50px Outfit, sans-serif';
            ctx.fillText('¡TIEMPO AGOTADO!', w / 2, h * 0.35);

            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 36px Outfit, sans-serif';
            ctx.fillText(`PUNTAJE FINAL: ${this.engine.score}`, w / 2, h * 0.48);

            ctx.fillStyle = '#F59E0B';
            ctx.font = '22px Outfit, sans-serif';
            ctx.fillText(`MAX COMBO: ${this.engine.maxCombo}x`, w / 2, h * 0.56);

            // Botón Reintentar
            ctx.fillStyle = '#00F0FF';
            ctx.fillRect(w / 2 - 140, h * 0.68 - 30, 280, 60);
            ctx.fillStyle = '#0F172A';
            ctx.font = 'bold 24px Outfit, sans-serif';
            ctx.fillText('REINTENTAR', w / 2, h * 0.68 + 8);
        }
    }

    triggerWave(x, y) {
        if (this.inputManager) {
            this.inputManager.triggerExternal(x, y, 'lidar_ghosts_api');
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
