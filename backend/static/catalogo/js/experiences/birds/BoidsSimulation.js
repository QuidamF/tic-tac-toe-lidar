/**
 * @file BoidsSimulation.js
 * @description Simulación matemática 3D de comportamiento de bandadas (Boids Algorithm de Craig Reynolds).
 * Implementa Separación, Alineación, Cohesión y fuerzas de pánico/atracción ante sensores LiDAR.
 */

import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';

export class BoidsSimulation {
    /**
     * @param {THREE.Scene} scene 
     * @param {number} [count=300] 
     */
    constructor(scene, count = 300) {
        this.scene = scene;
        this.count = count;

        this.boids = [];
        this.dummy = new THREE.Object3D();
        this.colorTmp = new THREE.Color();

        // Parámetros de vuelo Boids
        this.maxSpeed = 0.55;
        this.maxForce = 0.025;

        this.neighborDist = 14.0;
        this.separationDist = 4.5;

        this.bounds = { x: 38, y: 26, z: 22 };

        this._initGeometryAndMesh();
    }

    /**
     * Crea la geometría 3D de un ave simplificada (cuerpo en V con dos alas articuladas).
     * @private
     */
    _initGeometryAndMesh() {
        // Geometría piramidal / estilizada de ave 3D
        const geometry = new THREE.ConeGeometry(0.6, 1.8, 4);
        geometry.rotateX(Math.PI / 2); // Orientar pico hacia adelante (+Z)

        const material = new THREE.MeshStandardMaterial({
            color: 0x00F0FF,
            roughness: 0.3,
            metalness: 0.8,
            flatShading: true
        });

        this.mesh = new THREE.InstancedMesh(geometry, material, this.count);
        this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

        // Inicializar datos individuales de cada ave
        for (let i = 0; i < this.count; i++) {
            const x = (Math.random() - 0.5) * this.bounds.x * 1.5;
            const y = (Math.random() - 0.5) * this.bounds.y * 1.5;
            const z = (Math.random() - 0.5) * this.bounds.z * 1.5;

            const vx = (Math.random() - 0.5) * this.maxSpeed;
            const vy = (Math.random() - 0.5) * this.maxSpeed;
            const vz = (Math.random() - 0.5) * this.maxSpeed;

            const hue = (0.52 + Math.random() * 0.25) % 1.0; // Tonos turquesa, cian y violeta

            this.boids.push({
                pos: new THREE.Vector3(x, y, z),
                vel: new THREE.Vector3(vx, vy, vz),
                acc: new THREE.Vector3(0, 0, 0),
                flapPhase: Math.random() * Math.PI * 2,
                hue: hue,
                scale: 0.8 + Math.random() * 0.5
            });

            this.colorTmp.setHSL(hue, 0.85, 0.6);
            this.mesh.setColorAt(i, this.colorTmp);
        }

        this.mesh.instanceMatrix.needsUpdate = true;
        if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;

        this.scene.add(this.mesh);
    }

    /**
     * Aplica la 1ra Regla: SEPARACIÓN (Evitar hacinamiento local).
     * @private
     */
    _separation(boidIdx) {
        const b = this.boids[boidIdx];
        const steer = new THREE.Vector3();
        let count = 0;

        for (let i = 0; i < this.count; i++) {
            if (i === boidIdx) continue;
            const other = this.boids[i];
            const d = b.pos.distanceTo(other.pos);

            if (d > 0 && d < this.separationDist) {
                const diff = new THREE.Vector3().subVectors(b.pos, other.pos).normalize().divideScalar(d);
                steer.add(diff);
                count++;
            }
        }

        if (count > 0) {
            steer.divideScalar(count);
        }

        if (steer.lengthSq() > 0) {
            steer.normalize().multiplyScalar(this.maxSpeed).sub(b.vel).clampLength(0, this.maxForce * 1.5);
        }
        return steer;
    }

    /**
     * Aplica la 2da Regla: ALINEACIÓN (Coordinar dirección con vecinas).
     * @private
     */
    _alignment(boidIdx) {
        const b = this.boids[boidIdx];
        const sum = new THREE.Vector3();
        let count = 0;

        for (let i = 0; i < this.count; i++) {
            if (i === boidIdx) continue;
            const other = this.boids[i];
            const d = b.pos.distanceTo(other.pos);

            if (d > 0 && d < this.neighborDist) {
                sum.add(other.vel);
                count++;
            }
        }

        if (count > 0) {
            sum.divideScalar(count).normalize().multiplyScalar(this.maxSpeed);
            const steer = new THREE.Vector3().subVectors(sum, b.vel).clampLength(0, this.maxForce);
            return steer;
        }
        return new THREE.Vector3();
    }

    /**
     * Aplica la 3ra Regla: COHESIÓN (Moverse hacia el centro de gravedad del grupo).
     * @private
     */
    _cohesion(boidIdx) {
        const b = this.boids[boidIdx];
        const sum = new THREE.Vector3();
        let count = 0;

        for (let i = 0; i < this.count; i++) {
            if (i === boidIdx) continue;
            const other = this.boids[i];
            const d = b.pos.distanceTo(other.pos);

            if (d > 0 && d < this.neighborDist) {
                sum.add(other.pos);
                count++;
            }
        }

        if (count > 0) {
            sum.divideScalar(count);
            // Buscar hacia esa posición objetivo
            const desired = new THREE.Vector3().subVectors(sum, b.pos).normalize().multiplyScalar(this.maxSpeed);
            const steer = new THREE.Vector3().subVectors(desired, b.vel).clampLength(0, this.maxForce);
            return steer;
        }
        return new THREE.Vector3();
    }

    /**
     * Mantiene las aves dentro de los límites del volumen 3D.
     * @private
     */
    _containment(boid) {
        const steer = new THREE.Vector3();
        const margin = 5.0;

        if (Math.abs(boid.pos.x) > this.bounds.x - margin) steer.x = -Math.sign(boid.pos.x) * this.maxSpeed;
        if (Math.abs(boid.pos.y) > this.bounds.y - margin) steer.y = -Math.sign(boid.pos.y) * this.maxSpeed;
        if (Math.abs(boid.pos.z) > this.bounds.z - margin) steer.z = -Math.sign(boid.pos.z) * this.maxSpeed;

        if (steer.lengthSq() > 0) {
            steer.sub(boid.vel).clampLength(0, this.maxForce * 2.0);
        }
        return steer;
    }

    /**
     * Actualiza la posición y orientación de cada ave en la simulación.
     * @param {number} timestamp 
     * @param {Array<{x: number, y: number, z: number, isHold: boolean}>} activePointers3D 
     */
    update(timestamp, activePointers3D = []) {
        const delta = 0.016;

        for (let i = 0; i < this.count; i++) {
            const b = this.boids[i];

            // 1. Calcular fuerzas estándar de Boids
            const sep = this._separation(i).multiplyScalar(1.6);
            const ali = this._alignment(i).multiplyScalar(1.1);
            const coh = this._cohesion(i).multiplyScalar(1.0);
            const bnd = this._containment(b);

            b.acc.add(sep);
            b.acc.add(ali);
            b.acc.add(coh);
            b.acc.add(bnd);

            // 2. Aplicar fuerzas de interacción LiDAR / Puntero
            for (let ptr of activePointers3D) {
                const target = new THREE.Vector3(ptr.x, ptr.y, ptr.z);
                const d = b.pos.distanceTo(target);

                if (d < 25.0) {
                    if (ptr.isHold) {
                        // Vórtice de atracción (Murmuración alrededor de la mano)
                        const desired = new THREE.Vector3().subVectors(target, b.pos).normalize().multiplyScalar(this.maxSpeed * 1.3);
                        const force = new THREE.Vector3().subVectors(desired, b.vel).clampLength(0, this.maxForce * 3.0);
                        b.acc.add(force);
                    } else {
                        // Dispersión en pánico / Huida del toque
                        const panic = new THREE.Vector3().subVectors(b.pos, target).normalize().multiplyScalar(this.maxSpeed * 2.2);
                        const force = new THREE.Vector3().subVectors(panic, b.vel).clampLength(0, this.maxForce * 4.5);
                        b.acc.add(force);
                    }
                }
            }

            // Integración de movimiento Euler
            b.vel.add(b.acc);
            b.vel.clampLength(0, this.maxSpeed * (activePointers3D.length > 0 ? 1.5 : 1.0));
            b.pos.addScaledVector(b.vel, 1.0);

            b.acc.set(0, 0, 0); // Resetear aceleración

            // Actualizar rotación y matriz instanciada
            this.dummy.position.copy(b.pos);

            // Apuntar en la dirección de movimiento
            if (b.vel.lengthSq() > 0.001) {
                const lookTarget = new THREE.Vector3().addVectors(b.pos, b.vel);
                this.dummy.lookAt(lookTarget);
            }

            // Animación procedimental de oscilación/aleteo leve
            b.flapPhase += b.vel.length() * 0.35;
            const scaleY = b.scale * (1.0 + Math.sin(b.flapPhase) * 0.2);
            this.dummy.scale.set(b.scale, scaleY, b.scale);

            this.dummy.updateMatrix();
            this.mesh.setMatrixAt(i, this.dummy.matrix);

            // Variación sutil de color basada en agitación/velocidad
            const currentSpeed = b.vel.length();
            this.colorTmp.setHSL((b.hue + currentSpeed * 0.1) % 1.0, 0.85, Math.min(0.85, 0.5 + currentSpeed * 0.4));
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
    }
}
