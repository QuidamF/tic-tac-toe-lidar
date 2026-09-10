/**
 * @file LinkedParticlesNetwork.js
 * @description Simulación 3D de red constelación / Plexus Network (Three.js Points & LineSegments).
 * Inspirado en webgpu_tsl_vfx_linkedparticles con interconexiones dinámicas y líneas láser al toque LiDAR.
 */

import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';

export class LinkedParticlesNetwork {
    /**
     * @param {THREE.Scene} scene 
     * @param {number} [maxParticles=350] 
     */
    constructor(scene, maxParticles = 350) {
        this.scene = scene;
        this.maxParticles = maxParticles;

        this.connectDistance = 11.0;
        this.maxConnections = maxParticles * 8; // Máximo de segmentos de línea

        this.particles = [];
        this.bounds = { x: 38, y: 26, z: 22 };

        this.shockwaves = [];

        this._initParticlePoints();
        this._initLinesMesh();
    }

    /**
     * Inicializa los nodos de partículas 3D.
     * @private
     */
    _initParticlePoints() {
        const positions = new Float32Array(this.maxParticles * 3);
        const colors = new Float32Array(this.maxParticles * 3);

        const colorTmp = new THREE.Color();

        for (let i = 0; i < this.maxParticles; i++) {
            const x = (Math.random() - 0.5) * this.bounds.x * 1.8;
            const y = (Math.random() - 0.5) * this.bounds.y * 1.8;
            const z = (Math.random() - 0.5) * this.bounds.z * 1.8;

            positions[i * 3] = x;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = z;

            const hue = 0.5 + Math.random() * 0.4; // Cian a magenta electrificado
            colorTmp.setHSL(hue, 0.9, 0.65);

            colors[i * 3] = colorTmp.r;
            colors[i * 3 + 1] = colorTmp.g;
            colors[i * 3 + 2] = colorTmp.b;

            this.particles.push({
                x, y, z,
                vx: (Math.random() - 0.5) * 0.12,
                vy: (Math.random() - 0.5) * 0.12,
                vz: (Math.random() - 0.5) * 0.12,
                baseHue: hue
            });
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        // Generar textura circular de brillo
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');
        const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
        grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
        grad.addColorStop(0.4, 'rgba(0, 240, 255, 0.8)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 32, 32);
        const texture = new THREE.CanvasTexture(canvas);

        const material = new THREE.PointsMaterial({
            size: 1.6,
            map: texture,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            vertexColors: true
        });

        this.pointsMesh = new THREE.Points(geometry, material);
        this.scene.add(this.pointsMesh);
    }

    /**
     * Inicializa la estructura BufferGeometry de segmentos de líneas dinámicas.
     * @private
     */
    _initLinesMesh() {
        const linePositions = new Float32Array(this.maxConnections * 6);
        const lineColors = new Float32Array(this.maxConnections * 6);

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3).setUsage(THREE.DynamicDrawUsage));
        geometry.setAttribute('color', new THREE.BufferAttribute(lineColors, 3).setUsage(THREE.DynamicDrawUsage));

        const material = new THREE.LineBasicMaterial({
            vertexColors: true,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        this.linesMesh = new THREE.LineSegments(geometry, material);
        this.scene.add(this.linesMesh);
    }

    /**
     * Emite un pulso de onda de energía eléctrica al contacto.
     */
    triggerImpulse(x, y, z = 0) {
        this.shockwaves.push({
            x, y, z,
            radius: 0.5,
            maxRadius: 30.0,
            speed: 0.9,
            strength: 3.5
        });
    }

    /**
     * Actualiza la simulación física de nodos y recalcula los enlaces de líneas en 3D.
     * @param {number} timestamp 
     * @param {Array<{x: number, y: number, z: number, isHold: boolean}>} activePointers3D 
     */
    update(timestamp, activePointers3D = []) {
        const pointPositions = this.pointsMesh.geometry.attributes.position.array;
        const pointColors = this.pointsMesh.geometry.attributes.color.array;

        const linePositions = this.linesMesh.geometry.attributes.position.array;
        const lineColors = this.linesMesh.geometry.attributes.color.array;

        // Actualizar ondas de energía
        for (let w = this.shockwaves.length - 1; w >= 0; w--) {
            const sw = this.shockwaves[w];
            sw.radius += sw.speed;
            if (sw.radius > sw.maxRadius) {
                this.shockwaves.splice(w, 1);
            }
        }

        let lineVertexIdx = 0;
        const colorTmp = new THREE.Color();

        // 1. Mover nodos y aplicar fuerzas físicas
        for (let i = 0; i < this.maxParticles; i++) {
            const p = this.particles[i];

            // Rebotar suavemente en los límites
            if (Math.abs(p.x) > this.bounds.x) p.vx *= -1;
            if (Math.abs(p.y) > this.bounds.y) p.vy *= -1;
            if (Math.abs(p.z) > this.bounds.z) p.vz *= -1;

            // Interacción LiDAR / Puntero
            for (let ptr of activePointers3D) {
                const dx = p.x - ptr.x;
                const dy = p.y - ptr.y;
                const dz = p.z - ptr.z;
                const distSq = dx * dx + dy * dy + dz * dz;

                if (distSq < 350 && distSq > 0.01) {
                    const dist = Math.sqrt(distSq);
                    const force = (1.0 - dist / 18.0);

                    if (ptr.isHold) {
                        // Vórtice de atracción
                        p.vx -= (dx / dist) * force * 0.45;
                        p.vy -= (dy / dist) * force * 0.45;
                        p.vz -= (dz / dist) * force * 0.45;
                    } else {
                        // Repulsión radial
                        p.vx += (dx / dist) * force * 0.8;
                        p.vy += (dy / dist) * force * 0.8;
                        p.vz += (dz / dist) * force * 0.8;
                    }
                }
            }

            // Aplicar ondas de energía
            for (let sw of this.shockwaves) {
                const dx = p.x - sw.x;
                const dy = p.y - sw.y;
                const dz = p.z - sw.z;
                const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
                const diff = Math.abs(dist - sw.radius);

                if (diff < 3.5) {
                    const push = (1.0 - diff / 3.5) * sw.strength;
                    p.vx += (dx / (dist || 1)) * push * 0.3;
                    p.vy += (dy / (dist || 1)) * push * 0.3;
                    p.vz += (dz / (dist || 1)) * push * 0.3;
                }
            }

            // Amortiguamiento
            p.vx *= 0.96;
            p.vy *= 0.96;
            p.vz *= 0.96;

            p.x += p.vx;
            p.y += p.vy;
            p.z += p.vz;

            pointPositions[i * 3] = p.x;
            pointPositions[i * 3 + 1] = p.y;
            pointPositions[i * 3 + 2] = p.z;
        }

        // 2. Generar conexiones de líneas entre nodos cercanos (Plexus Network)
        for (let i = 0; i < this.maxParticles; i++) {
            const p1 = this.particles[i];

            for (let j = i + 1; j < this.maxParticles; j++) {
                const p2 = this.particles[j];

                const dx = p1.x - p2.x;
                const dy = p1.y - p2.y;
                const dz = p1.z - p2.z;
                const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

                if (dist < this.connectDistance && lineVertexIdx < (this.maxConnections - 2) * 6) {
                    const alpha = (1.0 - dist / this.connectDistance);

                    // Línea Punto A
                    linePositions[lineVertexIdx] = p1.x;
                    linePositions[lineVertexIdx + 1] = p1.y;
                    linePositions[lineVertexIdx + 2] = p1.z;

                    colorTmp.setHSL(p1.baseHue, 0.9, 0.5 * alpha);
                    lineColors[lineVertexIdx] = colorTmp.r;
                    lineColors[lineVertexIdx + 1] = colorTmp.g;
                    lineColors[lineVertexIdx + 2] = colorTmp.b;

                    // Línea Punto B
                    linePositions[lineVertexIdx + 3] = p2.x;
                    linePositions[lineVertexIdx + 4] = p2.y;
                    linePositions[lineVertexIdx + 5] = p2.z;

                    colorTmp.setHSL(p2.baseHue, 0.9, 0.5 * alpha);
                    lineColors[lineVertexIdx + 3] = colorTmp.r;
                    lineColors[lineVertexIdx + 4] = colorTmp.g;
                    lineColors[lineVertexIdx + 5] = colorTmp.b;

                    lineVertexIdx += 6;
                }
            }

            // Conectar líneas de energía directamente a las posiciones de la mano / LiDAR
            for (let ptr of activePointers3D) {
                const dx = p1.x - ptr.x;
                const dy = p1.y - ptr.y;
                const dz = p1.z - ptr.z;
                const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

                if (dist < 22.0 && lineVertexIdx < (this.maxConnections - 2) * 6) {
                    const alpha = (1.0 - dist / 22.0);

                    linePositions[lineVertexIdx] = p1.x;
                    linePositions[lineVertexIdx + 1] = p1.y;
                    linePositions[lineVertexIdx + 2] = p1.z;

                    colorTmp.setHSL(0.55, 1.0, 0.9 * alpha); // Rayo láser azul brillante
                    lineColors[lineVertexIdx] = colorTmp.r;
                    lineColors[lineVertexIdx + 1] = colorTmp.g;
                    lineColors[lineVertexIdx + 2] = colorTmp.b;

                    linePositions[lineVertexIdx + 3] = ptr.x;
                    linePositions[lineVertexIdx + 4] = ptr.y;
                    linePositions[lineVertexIdx + 5] = ptr.z;

                    colorTmp.setHSL(0.85, 1.0, 0.9 * alpha); // Resplandor magenta en el toque
                    lineColors[lineVertexIdx + 3] = colorTmp.r;
                    lineColors[lineVertexIdx + 4] = colorTmp.g;
                    lineColors[lineVertexIdx + 5] = colorTmp.b;

                    lineVertexIdx += 6;
                }
            }
        }

        // Limpiar el resto de la geometría del buffer de líneas
        for (let k = lineVertexIdx; k < this.maxConnections * 6; k++) {
            linePositions[k] = 0;
            lineColors[k] = 0;
        }

        this.pointsMesh.geometry.attributes.position.needsUpdate = true;
        this.linesMesh.geometry.attributes.position.needsUpdate = true;
        this.linesMesh.geometry.attributes.color.needsUpdate = true;
        this.linesMesh.geometry.setDrawRange(0, lineVertexIdx / 3);
    }

    dispose() {
        if (this.pointsMesh) {
            this.scene.remove(this.pointsMesh);
            this.pointsMesh.geometry.dispose();
            this.pointsMesh.material.dispose();
        }
        if (this.linesMesh) {
            this.scene.remove(this.linesMesh);
            this.linesMesh.geometry.dispose();
            this.linesMesh.material.dispose();
        }
    }
}
