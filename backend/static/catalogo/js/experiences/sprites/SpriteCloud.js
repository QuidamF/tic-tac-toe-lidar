/**
 * @file SpriteCloud.js
 * @description Gestor de simulación 3D con Three.js InstancedMesh (5,000+ sprites instanciados).
 * Inspirado en el ejemplo webgpu_instance_sprites con respuesta física y campo de atracción LiDAR.
 */

import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';

export class SpriteCloud {
    /**
     * @param {THREE.Scene} scene 
     * @param {number} [count=5000] 
     */
    constructor(scene, count = 5000) {
        this.scene = scene;
        this.count = count;

        this.particles = [];
        this.dummy = new THREE.Object3D();
        this.colorTmp = new THREE.Color();
        this.matrixTmp = new THREE.Matrix4();

        this.shockwaves = [];

        this._createGlowTexture();
        this._initMesh();
    }

    /**
     * Genera una textura procedimental de resplandor radial (Glow Sprite).
     * @private
     */
    _createGlowTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');

        const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        grad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
        grad.addColorStop(0.25, 'rgba(0, 240, 255, 0.85)');
        grad.addColorStop(0.6, 'rgba(192, 38, 211, 0.4)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 64, 64);

        this.texture = new THREE.CanvasTexture(canvas);
    }

    /**
     * Inicializa la geometría e InstancedMesh de Three.js.
     * @private
     */
    _initMesh() {
        // Geometría de plano orientada a cámara (Sprite Quad)
        const geometry = new THREE.PlaneGeometry(1.4, 1.4);

        const material = new THREE.MeshBasicMaterial({
            map: this.texture,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.DoubleSide
        });

        this.mesh = new THREE.InstancedMesh(geometry, material, this.count);
        this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

        // Inicializar datos de cada partícula instanciada
        for (let i = 0; i < this.count; i++) {
            // Distribución esférica/toroidal orgánica
            const radius = 10 + Math.pow(Math.random(), 0.7) * 35;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos((Math.random() * 2) - 1);

            const x = radius * Math.sin(phi) * Math.cos(theta);
            const y = radius * Math.sin(phi) * Math.sin(theta);
            const z = (Math.random() - 0.5) * 25;

            const speed = 0.02 + Math.random() * 0.04;
            const hue = (0.5 + Math.random() * 0.45) % 1.0; // Cyan a magenta
            const scale = 0.4 + Math.random() * 0.8;

            this.particles.push({
                homeX: x,
                homeY: y,
                homeZ: z,
                x: x,
                y: y,
                z: z,
                vx: 0,
                vy: 0,
                vz: 0,
                orbitAngle: theta,
                orbitSpeed: (Math.random() - 0.5) * 0.008,
                radius: radius,
                scale: scale,
                baseScale: scale,
                hue: hue,
                sat: 0.9,
                light: 0.6
            });

            // Establecer matriz inicial
            this.dummy.position.set(x, y, z);
            this.dummy.scale.set(scale, scale, scale);
            this.dummy.updateMatrix();

            this.mesh.setMatrixAt(i, this.dummy.matrix);

            this.colorTmp.setHSL(hue, 0.9, 0.6);
            this.mesh.setColorAt(i, this.colorTmp);
        }

        this.mesh.instanceMatrix.needsUpdate = true;
        if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;

        this.scene.add(this.mesh);
    }

    /**
     * Dispara un impulso / onda de choque en coordenadas 3D.
     */
    triggerImpulse(worldX, worldY, worldZ = 0) {
        this.shockwaves.push({
            x: worldX,
            y: worldY,
            z: worldZ,
            radius: 1.0,
            maxRadius: 28.0,
            speed: 0.85,
            strength: 4.5
        });
    }

    /**
     * Actualiza la posición y matriz de cada sprite instanciado.
     * @param {number} timestamp 
     * @param {Array<{x: number, y: number, isHold: boolean}>} activePointers3D 
     */
    update(timestamp, activePointers3D = []) {
        const time = timestamp * 0.001;

        // Actualizar ondas de choque
        for (let w = this.shockwaves.length - 1; w >= 0; w--) {
            const sw = this.shockwaves[w];
            sw.radius += sw.speed;
            if (sw.radius > sw.maxRadius) {
                this.shockwaves.splice(w, 1);
            }
        }

        // Rotación suave del enjambre entero
        this.mesh.rotation.y = time * 0.05;
        this.mesh.rotation.x = Math.sin(time * 0.03) * 0.1;

        for (let i = 0; i < this.count; i++) {
            const p = this.particles[i];

            // Movimiento orbital básico
            p.orbitAngle += p.orbitSpeed;
            const targetX = p.radius * Math.cos(p.orbitAngle);
            const targetY = p.radius * Math.sin(p.orbitAngle) * 0.7;

            // Fuerza de retorno a casa
            p.vx += (targetX - p.x) * 0.015;
            p.vy += (targetY - p.y) * 0.015;
            p.vz += (p.homeZ - p.z) * 0.015;

            // Interacción con punteros / LiDAR en 3D
            for (let ptr of activePointers3D) {
                const dx = p.x - ptr.x;
                const dy = p.y - ptr.y;
                const dz = p.z - ptr.z;
                const distSq = dx * dx + dy * dy + dz * dz;

                if (distSq < 400 && distSq > 0.01) {
                    const dist = Math.sqrt(distSq);
                    const force = (1.0 - dist / 20.0);

                    if (ptr.isHold) {
                        // Modo Agujero Negro / Atracción
                        p.vx -= (dx / dist) * force * 0.8;
                        p.vy -= (dy / dist) * force * 0.8;
                        p.vz -= (dz / dist) * force * 0.8;
                    } else {
                        // Fuerza de repulsión radial
                        p.vx += (dx / dist) * force * 1.2;
                        p.vy += (dy / dist) * force * 1.2;
                        p.vz += (dz / dist) * force * 1.2;
                    }

                    // Aumentar tamaño temporal al interactuar
                    p.scale = Math.min(p.baseScale * 2.5, p.scale + 0.1);
                }
            }

            // Aplicar ondas de choque
            for (let sw of this.shockwaves) {
                const dx = p.x - sw.x;
                const dy = p.y - sw.y;
                const dz = p.z - sw.z;
                const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
                const diff = Math.abs(dist - sw.radius);

                if (diff < 4.0) {
                    const push = (1.0 - diff / 4.0) * sw.strength;
                    p.vx += (dx / (dist || 1)) * push;
                    p.vy += (dy / (dist || 1)) * push;
                    p.vz += (dz / (dist || 1)) * push;
                }
            }

            // Amortiguamiento
            p.vx *= 0.92;
            p.vy *= 0.92;
            p.vz *= 0.92;

            p.x += p.vx;
            p.y += p.vy;
            p.z += p.vz;

            p.scale += (p.baseScale - p.scale) * 0.05;

            // Actualizar objeto dummy para la matriz de la instancia
            this.dummy.position.set(p.x, p.y, p.z);
            this.dummy.scale.set(p.scale, p.scale, p.scale);
            this.dummy.updateMatrix();

            this.mesh.setMatrixAt(i, this.dummy.matrix);

            // Cambiar color sutilmente según la velocidad actual
            const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy + p.vz * p.vz);
            const dynamicHue = (p.hue + speed * 0.08) % 1.0;
            this.colorTmp.setHSL(dynamicHue, p.sat, Math.min(0.9, p.light + speed * 0.15));
            this.mesh.setColorAt(i, this.colorTmp);
        }

        this.mesh.instanceMatrix.needsUpdate = true;
        if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    }

    dispose() {
        if (this.mesh) {
            this.scene.remove(this.mesh);
            this.mesh.geometry.dispose();
            this.mesh.material.dispose();
        }
        if (this.texture) {
            this.texture.dispose();
        }
    }
}
