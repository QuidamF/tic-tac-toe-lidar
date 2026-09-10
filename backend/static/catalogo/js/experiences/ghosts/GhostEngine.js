/**
 * @file GhostEngine.js
 * @description Motor de juego 2D para "Caza Fantasmas: Mansión Embrujada" (Whac-A-Mole).
 * Administra el estado de 8 ventanas interactivas, ciclo de spawn de 4 tipos de fantasmas,
 * colisión LiDAR, temporizador de 60s y sistema de combos.
 */

export class GhostEngine {
    constructor() {
        this.score = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.timeRemaining = 60; // 60 segundos por partida
        this.gameState = 'START'; // 'START', 'PLAYING', 'GAMEOVER'

        this.spawnTimer = 0;
        this.spawnInterval = 1.6; // segundos entre spawns

        this.floatingTexts = [];
        this.particles = [];

        // Definición de las 8 ventanas distribuidas sobre la fachada de la mansión
        // Coordenadas normalizadas (0.0 a 1.0)
        this.windows = [
            { id: 0, normX: 0.50, normY: 0.19, w: 0.09, h: 0.14, name: 'Atico' },
            { id: 1, normX: 0.31, normY: 0.34, w: 0.08, h: 0.13, name: 'Superior Izq' },
            { id: 2, normX: 0.43, normY: 0.34, w: 0.08, h: 0.13, name: 'Superior Centro Izq' },
            { id: 3, normX: 0.57, normY: 0.34, w: 0.08, h: 0.13, name: 'Superior Centro Der' },
            { id: 4, normX: 0.69, normY: 0.34, w: 0.08, h: 0.13, name: 'Superior Der' },
            { id: 5, normX: 0.33, normY: 0.55, w: 0.08, h: 0.13, name: 'Inferior Izq' },
            { id: 6, normX: 0.50, normY: 0.55, w: 0.08, h: 0.13, name: 'Inferior Centro' },
            { id: 7, normX: 0.67, normY: 0.55, w: 0.08, h: 0.13, name: 'Inferior Der' }
        ];

        this.resetWindows();
    }

    resetWindows() {
        for (let win of this.windows) {
            win.state = 'IDLE'; // 'IDLE', 'WARN', 'GHOST', 'HIT'
            win.ghostType = 'NORMAL';
            win.timer = 0;
            win.hitAnim = 0;
            win.ghostYOffset = 0;
        }
    }

    startGame() {
        this.score = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.timeRemaining = 60;
        this.gameState = 'PLAYING';
        this.spawnTimer = 0;
        this.spawnInterval = 1.5;
        this.floatingTexts = [];
        this.particles = [];
        this.resetWindows();
    }

    /**
     * Intenta registrar un golpe/toque LiDAR en coordenadas normalizadas (px/width, py/height).
     * @returns {Object|null} Información del impacto o null si falló
     */
    registerHit(normX, normY) {
        if (this.gameState !== 'PLAYING') return null;

        for (let win of this.windows) {
            // Verificar si el toque cae dentro del área de la ventana
            const halfW = win.w * 0.7;
            const halfH = win.h * 0.7;

            if (
                Math.abs(normX - win.normX) <= halfW &&
                Math.abs(normY - win.normY) <= halfH
            ) {
                if (win.state === 'GHOST') {
                    return this._onGhostHit(win);
                }
            }
        }
        return null;
    }

    _onGhostHit(win) {
        win.state = 'HIT';
        win.timer = 0.4; // 0.4s para animación de desintegración

        let pts = 0;
        let color = '#00F0FF';
        let text = '';
        let soundType = 'hit_normal';

        const multiplier = this.combo >= 10 ? 5 : (this.combo >= 5 ? 3 : (this.combo >= 3 ? 2 : 1));

        if (win.ghostType === 'NORMAL') {
            pts = 100 * multiplier;
            this.combo++;
            text = `+${pts}`;
            color = '#ffffff';
            soundType = 'hit_normal';
        } else if (win.ghostType === 'SPEED') {
            pts = 250 * multiplier;
            this.combo++;
            text = `+${pts}⚡`;
            color = '#00F0FF';
            soundType = 'hit_speed';
        } else if (win.ghostType === 'GOLDEN') {
            pts = 500 * multiplier;
            this.timeRemaining = Math.min(60, this.timeRemaining + 3);
            this.combo++;
            text = `+${pts} 🌟 (+3s)`;
            color = '#F59E0B';
            soundType = 'hit_golden';
        } else if (win.ghostType === 'TRICK') {
            pts = -150;
            this.combo = 0; // Romper combo
            text = `-150 💜`;
            color = '#C026D3';
            soundType = 'hit_trick';
        }

        this.score = Math.max(0, this.score + pts);
        if (this.combo > this.maxCombo) this.maxCombo = this.combo;

        // Texto flotante de puntuación
        this.floatingTexts.push({
            text: text,
            normX: win.normX,
            normY: win.normY - 0.05,
            color: color,
            alpha: 1.0,
            life: 1.0
        });

        // Partículas de impacto
        this._spawnHitParticles(win.normX, win.normY, color);

        return {
            windowId: win.id,
            ghostType: win.ghostType,
            points: pts,
            soundType: soundType
        };
    }

    _spawnHitParticles(normX, normY, color) {
        for (let i = 0; i < 18; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 0.002 + Math.random() * 0.005;
            this.particles.push({
                x: normX,
                y: normY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 4 + Math.random() * 8,
                color: color,
                alpha: 1.0,
                life: 0.6 + Math.random() * 0.4
            });
        }
    }

    /**
     * Actualiza el temporizador y el estado de las ventanas y fantasmas.
     * @param {number} deltaSec - Tiempo transcurrido en segundos
     */
    update(deltaSec) {
        if (this.gameState !== 'PLAYING') return;

        // 1. Temporizador del juego
        this.timeRemaining -= deltaSec;
        if (this.timeRemaining <= 0) {
            this.timeRemaining = 0;
            this.gameState = 'GAMEOVER';
            return;
        }

        // Dificultad progresiva: intervalos más rápidos a medida que pasa el tiempo
        const progress = (60 - this.timeRemaining) / 60;
        this.spawnInterval = Math.max(0.7, 1.6 - progress * 0.9);

        // 2. Control de Spawn de fantasmas
        this.spawnTimer += deltaSec;
        if (this.spawnTimer >= this.spawnInterval) {
            this.spawnTimer = 0;
            this._spawnRandomGhost();
        }

        // 3. Actualizar ventanas
        for (let win of this.windows) {
            if (win.state === 'WARN') {
                win.timer -= deltaSec;
                if (win.timer <= 0) {
                    win.state = 'GHOST';
                    // Tiempo de permanencia del fantasma según su tipo
                    if (win.ghostType === 'SPEED') win.timer = 1.0;
                    else if (win.ghostType === 'GOLDEN') win.timer = 1.2;
                    else if (win.ghostType === 'TRICK') win.timer = 1.8;
                    else win.timer = 2.0;
                }
            } else if (win.state === 'GHOST') {
                win.timer -= deltaSec;
                // Animación de flotabilidad senoidal
                win.ghostYOffset = Math.sin(Date.now() * 0.006) * 0.015;

                if (win.timer <= 0) {
                    // El fantasma escapó (se cerró la ventana sin ser golpeado)
                    win.state = 'IDLE';
                    if (win.ghostType !== 'TRICK') {
                        this.combo = 0; // Rompe el combo si se escapó un fantasma bueno
                    }
                }
            } else if (win.state === 'HIT') {
                win.timer -= deltaSec;
                if (win.timer <= 0) {
                    win.state = 'IDLE';
                }
            }
        }

        // 4. Actualizar textos flotantes
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const ft = this.floatingTexts[i];
            ft.normY -= deltaSec * 0.04;
            ft.life -= deltaSec * 1.2;
            ft.alpha = Math.max(0, ft.life);
            if (ft.life <= 0) {
                this.floatingTexts.splice(i, 1);
            }
        }

        // 5. Actualizar partículas de ectoplasma
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= deltaSec * 1.5;
            p.alpha = Math.max(0, p.life);
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    _spawnRandomGhost() {
        const idleWindows = this.windows.filter(w => w.state === 'IDLE');
        if (idleWindows.length === 0) return;

        // Seleccionar ventana aleatoria
        const win = idleWindows[Math.floor(Math.random() * idleWindows.length)];
        win.state = 'WARN';
        win.timer = 0.4; // 0.4s de advertencia luminosa antes de aparecer

        // Seleccionar tipo de fantasma por probabilidad
        const rand = Math.random();
        if (rand < 0.55) {
            win.ghostType = 'NORMAL';
        } else if (rand < 0.75) {
            win.ghostType = 'SPEED';
        } else if (rand < 0.90) {
            win.ghostType = 'TRICK';
        } else {
            win.ghostType = 'GOLDEN';
        }
    }
}
