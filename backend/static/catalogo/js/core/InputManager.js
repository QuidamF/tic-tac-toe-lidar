/**
 * @file InputManager.js
 * @description Capa de abstracción de entradas táctiles, mouse y coordenadas externas (LiDAR/Visión Artificial).
 * Normaliza las interacciones para que cualquier fuente emita eventos unificados.
 */

export class InputManager {
    /**
     * @param {HTMLElement} targetElement - Elemento DOM sobre el cual escuchar eventos (Canvas).
     */
    constructor(targetElement) {
        this.target = targetElement;
        this.listeners = [];
        this.activePointers = new Map();
        
        this._onPointerDown = this._onPointerDown.bind(this);
        this._onPointerMove = this._onPointerMove.bind(this);
        this._onPointerUp = this._onPointerUp.bind(this);
        
        this._initEvents();
    }

    /**
     * Inicializa los escuchadores de eventos estándar Pointer (Mouse + Touch).
     * @private
     */
    _initEvents() {
        if (!this.target) return;
        
        this.target.addEventListener('pointerdown', this._onPointerDown, { passive: false });
        this.target.addEventListener('pointermove', this._onPointerMove, { passive: false });
        this.target.addEventListener('pointerup', this._onPointerUp, { passive: true });
        this.target.addEventListener('pointercancel', this._onPointerUp, { passive: true });
    }

    /**
     * Suscribe un callback para recibir eventos de interacción.
     * @param {Function} callback - Función que recibe { x, y, normX, normY, id, type }
     */
    onInput(callback) {
        if (typeof callback === 'function' && !this.listeners.includes(callback)) {
            this.listeners.push(callback);
        }
    }

    /**
     * Desuscribe un callback específico.
     * @param {Function} callback 
     */
    offInput(callback) {
        this.listeners = this.listeners.filter(cb => cb !== callback);
    }

    /**
     * Limpia todos los suscriptores.
     */
    clearListeners() {
        this.listeners = [];
    }

    /**
     * Permite emitir eventos desde fuentes externas como LiDAR, visión artificial, WebSockets o TUIO.
     * @param {number} x - Posición X en píxeles absolutos del canvas o viewport.
     * @param {number} y - Posición Y en píxeles absolutos del canvas o viewport.
     * @param {string} [id='lidar'] - Identificador opcional de la entrada externa.
     */
    triggerExternal(x, y, id = 'lidar') {
        this.dispatchExternalEvent('external', x, y, id);
    }

    /**
     * Permite emitir eventos específicos de puntero (pointerdown, pointermove, pointerup).
     */
    dispatchExternalEvent(type, x, y, id = 'lidar') {
        const rect = this.target.getBoundingClientRect();
        const normX = Math.max(0, Math.min(1, x / rect.width));
        const normY = Math.max(0, Math.min(1, y / rect.height));

        const eventData = {
            x: x,
            y: y,
            normX: normX,
            normY: normY,
            id: id,
            type: type
        };

        this._notify(eventData);
    }

    /**
     * Manejador de evento PointerDown (Touch / Mouse).
     * @private
     */
    _onPointerDown(e) {
        e.preventDefault();
        const coords = this._getCanvasCoords(e.clientX, e.clientY);
        
        this.activePointers.set(e.pointerId, coords);

        const eventData = {
            x: coords.x,
            y: coords.y,
            normX: coords.normX,
            normY: coords.normY,
            id: e.pointerId,
            type: 'pointerdown'
        };

        this._notify(eventData);
    }

    /**
     * Manejador de evento PointerMove (Arrastre / Multitoque activo).
     * @private
     */
    _onPointerMove(e) {
        if (e.buttons === 0 && e.pointerType === 'mouse') return; // Ignorar movimiento sin clic en mouse
        
        const coords = this._getCanvasCoords(e.clientX, e.clientY);
        
        const eventData = {
            x: coords.x,
            y: coords.y,
            normX: coords.normX,
            normY: coords.normY,
            id: e.pointerId,
            type: 'pointermove'
        };

        this._notify(eventData);
    }

    /**
     * Manejador de evento PointerUp / PointerCancel.
     * @private
     */
    _onPointerUp(e) {
        this.activePointers.delete(e.pointerId);
    }

    /**
     * Convierte coordenadas de cliente a coordenadas locales del Canvas y normalizadas (0.0 - 1.0).
     * @private
     */
    _getCanvasCoords(clientX, clientY) {
        const rect = this.target.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        const normX = Math.max(0, Math.min(1, x / rect.width));
        const normY = Math.max(0, Math.min(1, y / rect.height));

        return { x, y, normX, normY };
    }

    /**
     * Notifica a todos los suscriptores.
     * @private
     */
    _notify(eventData) {
        for (let i = 0; i < this.listeners.length; i++) {
            this.listeners[i](eventData);
        }
    }

    /**
     * Remueve listeners y limpia memoria.
     */
    destroy() {
        if (this.target) {
            this.target.removeEventListener('pointerdown', this._onPointerDown);
            this.target.removeEventListener('pointermove', this._onPointerMove);
            this.target.removeEventListener('pointerup', this._onPointerUp);
            this.target.removeEventListener('pointercancel', this._onPointerUp);
        }
        this.listeners = [];
        this.activePointers.clear();
    }
}
