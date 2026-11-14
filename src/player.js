// Контроллер от первого лица: pointer lock, WASD, столкновения с AABB, покачивание камеры.
import * as THREE from 'three';

const EYE = 1.2; // Миша невысокий — камера ниже, чем у взрослого
const RADIUS = 0.28;

export class Player {
  constructor(camera, dom) {
    this.camera = camera;
    this.dom = dom;
    this.pos = new THREE.Vector3(0, 0, 0);
    this.yaw = 0; this.pitch = 0;
    this.keys = new Set();
    this.colliders = [];
    this.canMove = false;     // ходьба
    this.canLook = false;     // вращение мышью
    this.sens = 1;
    this.bob = 0;
    this.tween = null;
    this.onStep = null;
    this._stepAcc = 0;

    addEventListener('keydown', (e) => this.keys.add(e.code));
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());
    document.addEventListener('mousemove', (e) => {
      if (!this.locked || !this.canLook) return;
      this.yaw -= e.movementX * 0.0022 * this.sens;
      this.pitch -= e.movementY * 0.0022 * this.sens;
      this.pitch = THREE.MathUtils.clamp(this.pitch, -1.35, 1.35);
    });
  }

  get locked() { return document.pointerLockElement === this.dom; }
  lock() { if (!this.locked) this.dom.requestPointerLock()?.catch?.(() => {}); }
  unlock() { if (this.locked) document.exitPointerLock(); }

  addBox(minX, maxX, minZ, maxZ) {
    const b = { minX, maxX, minZ, maxZ, enabled: true };
    this.colliders.push(b);
    return b;
  }

  _blocked(x, z) {
    for (const b of this.colliders) {
      if (!b.enabled) continue;
      const cx = Math.max(b.minX, Math.min(x, b.maxX));
      const cz = Math.max(b.minZ, Math.min(z, b.maxZ));
      if ((x - cx) ** 2 + (z - cz) ** 2 < RADIUS * RADIUS) return true;
    }
    return false;
  }

  setPose(x, z, yaw = 0, pitch = 0) { this.pos.set(x, 0, z); this.yaw = yaw; this.pitch = pitch; }

  // Плавно повернуть взгляд на точку (и, при необходимости, переместиться).
  lookAt(target, { duration = 1.0, moveTo = null } = {}) {
    const from = { yaw: this.yaw, pitch: this.pitch, pos: this.pos.clone() };
    const dest = moveTo ? new THREE.Vector3(moveTo.x, 0, moveTo.z) : this.pos.clone();
    const d = new THREE.Vector3().subVectors(target, new THREE.Vector3(dest.x, EYE, dest.z));
    let yaw = Math.atan2(-d.x, -d.z);
    while (yaw - from.yaw > Math.PI) yaw -= Math.PI * 2;
    while (yaw - from.yaw < -Math.PI) yaw += Math.PI * 2;
    const pitch = Math.atan2(d.y, Math.hypot(d.x, d.z));
    return new Promise((resolve) => { this.tween = { from, to: { yaw, pitch, pos: dest }, t: 0, duration, resolve }; });
  }

  update(dt) {
    if (this.tween) {
      const tw = this.tween;
      tw.t = Math.min(1, tw.t + dt / tw.duration);
      const k = tw.t * tw.t * (3 - 2 * tw.t);
      this.yaw = THREE.MathUtils.lerp(tw.from.yaw, tw.to.yaw, k);
      this.pitch = THREE.MathUtils.lerp(tw.from.pitch, tw.to.pitch, k);
      this.pos.lerpVectors(tw.from.pos, tw.to.pos, k);
      if (tw.t >= 1) { this.tween = null; tw.resolve(); }
    }

    let moving = false;
    if (this.canMove && !this.tween) {
      const f = (this.keys.has('KeyW') || this.keys.has('ArrowUp') ? 1 : 0) - (this.keys.has('KeyS') || this.keys.has('ArrowDown') ? 1 : 0);
      const r = (this.keys.has('KeyD') || this.keys.has('ArrowRight') ? 1 : 0) - (this.keys.has('KeyA') || this.keys.has('ArrowLeft') ? 1 : 0);
      if (f || r) {
        moving = true;
        const speed = 2.4 * dt / Math.hypot(f, r);
        const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
        const dx = (-sin * f + cos * r) * speed;
        const dz = (-cos * f - sin * r) * speed;
        if (!this._blocked(this.pos.x + dx, this.pos.z)) this.pos.x += dx;
        if (!this._blocked(this.pos.x, this.pos.z + dz)) this.pos.z += dz;
        this._stepAcc += dt;
        if (this._stepAcc > 0.42) { this._stepAcc = 0; this.onStep?.(); }
      }
    }
    this.bob += dt * (moving ? 9 : 0);
    const bobY = moving ? Math.sin(this.bob) * 0.03 : 0;

    this.camera.position.set(this.pos.x, EYE + bobY, this.pos.z);
    this.camera.rotation.set(this.pitch, this.yaw, Math.sin(this.bob * 0.5) * (moving ? 0.006 : 0), 'YXZ');
  }
}

export { EYE };
