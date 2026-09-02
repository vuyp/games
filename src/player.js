// First-person controller: pointer-lock look, WASD with acceleration, sliding AABB collision,
// head bob, and a camera rig for docking into game stations.
import * as THREE from 'three';
import { colliders, interactables, player } from './world.js';

const RADIUS = 0.33;
const EYE = 1.68;

export class PlayerController {
  constructor(camera, dom) {
    this.camera = camera;
    this.dom = dom;
    this.keys = new Set();
    this.yaw = 0; this.pitch = 0;
    this.pos = player.pos;
    this.vel = new THREE.Vector3();
    this.locked = false;
    this.enabled = true;       // movement + look
    this.lookOnly = false;     // look allowed but no walking (used by some game modes)
    this.bobT = 0;
    this.bobAmt = 0;
    this.sens = 0.0022;
    this.target = null;        // current interactable hit
    this.ray = new THREE.Raycaster();
    this.ray.far = 3.4;
    this.onMouseMove = (e) => {
      if (!this.locked || !this.enabled) return;
      const dx = e.movementX || 0, dy = e.movementY || 0;
      if (Math.abs(dx) > 300 || Math.abs(dy) > 300) return; // ignore lock glitches
      this.yaw -= dx * this.sens;
      this.pitch -= dy * this.sens;
      this.pitch = Math.max(-1.45, Math.min(1.45, this.pitch));
      this.moveListeners.forEach(fn => fn(dx, dy));
    };
    this.moveListeners = [];
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('keydown', (e) => { if (!e.repeat) this.keys.add(e.code); });
    document.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === this.dom;
      this.lockListeners.forEach(fn => fn(this.locked));
    });
    this.lockListeners = [];
    this._tmp = new THREE.Vector3();
    this._fwd = new THREE.Vector3();
    this._right = new THREE.Vector3();
    this.speedMul = 1;
    this.touchMove = null;
  }
  // Look input from touch drags (no pointer lock on mobile).
  touchLook(dx, dy) {
    if (!this.enabled) return;
    this.yaw -= dx * this.sens; this.pitch -= dy * this.sens;
    this.pitch = Math.max(-1.45, Math.min(1.45, this.pitch));
  }
  lock() { if (document.pointerLockElement !== this.dom) this.dom.requestPointerLock?.({ unadjustedMovement: true })?.catch?.(() => this.dom.requestPointerLock()); }
  unlock() { if (document.pointerLockElement) document.exitPointerLock(); }
  setPose(x, y, z, yaw, pitch) {
    this.pos.set(x, y, z); this.yaw = yaw; this.pitch = pitch; this.vel.set(0, 0, 0);
  }
  down(code) { return this.keys.has(code); }

  update(dt) {
    if (!this.enabled) return;
    let mx = 0, mz = 0;
    if (!this.lookOnly) {
      if (this.down('KeyW') || this.down('ArrowUp')) mz += 1;
      if (this.down('KeyS') || this.down('ArrowDown')) mz -= 1;
      if (this.down('KeyD') || this.down('ArrowRight')) mx += 1;
      if (this.down('KeyA') || this.down('ArrowLeft')) mx -= 1;
      if (this.touchMove) { mx += this.touchMove.x; mz += this.touchMove.y; }
    }
    const running = this.down('ShiftLeft') || this.down('ShiftRight') || (this.touchMove && Math.hypot(this.touchMove.x, this.touchMove.y) > 0.92);
    const maxSpeed = (running ? 5.6 : 3.1) * this.speedMul;
    this._fwd.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    this._right.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const want = this._tmp.set(0, 0, 0);
    if (mx || mz) {
      const mag = Math.min(1, Math.hypot(mx, mz));
      want.addScaledVector(this._fwd, mz).addScaledVector(this._right, mx).normalize().multiplyScalar(maxSpeed * mag);
    }
    const accel = (mx || mz) ? 14 : 18;
    this.vel.x += (want.x - this.vel.x) * Math.min(1, accel * dt);
    this.vel.z += (want.z - this.vel.z) * Math.min(1, accel * dt);
    // move with axis-separated sliding collision
    this.pos.x += this.vel.x * dt;
    this.resolve('x');
    this.pos.z += this.vel.z * dt;
    this.resolve('z');
    // head bob
    const speed = Math.hypot(this.vel.x, this.vel.z);
    const bobTarget = speed > 0.3 ? (running ? 1 : 0.6) : 0;
    this.bobAmt += (bobTarget - this.bobAmt) * Math.min(1, dt * 6);
    this.bobT += dt * (running ? 11 : 8.5) * (speed > 0.3 ? 1 : 0);
    const bobY = Math.sin(this.bobT) * 0.028 * this.bobAmt;
    const bobX = Math.cos(this.bobT * 0.5) * 0.012 * this.bobAmt;
    this.pos.y = EYE;
    this.camera.position.set(this.pos.x + this._right.x * bobX, EYE + bobY, this.pos.z + this._right.z * bobX);
    this.camera.rotation.set(this.pitch, this.yaw, Math.sin(this.bobT * 0.5) * 0.004 * this.bobAmt, 'YXZ');
    const targetFov = running && speed > 3 ? 78 : 72;
    if (Math.abs(this.camera.fov - targetFov) > 0.05) { this.camera.fov += (targetFov - this.camera.fov) * Math.min(1, dt * 4); this.camera.updateProjectionMatrix(); }
    this.speed = speed;
    this.running = running && speed > 3;
  }
  resolve(axis) {
    const p = this.pos;
    for (let i = 0; i < colliders.length; i++) {
      const c = colliders[i];
      if (p.x + RADIUS <= c.minX || p.x - RADIUS >= c.maxX || p.z + RADIUS <= c.minZ || p.z - RADIUS >= c.maxZ) continue;
      if (axis === 'x') {
        const left = p.x + RADIUS - c.minX, right = c.maxX - (p.x - RADIUS);
        if (left < right) p.x = c.minX - RADIUS; else p.x = c.maxX + RADIUS;
        this.vel.x = 0;
      } else {
        const front = p.z + RADIUS - c.minZ, back = c.maxZ - (p.z - RADIUS);
        if (front < back) p.z = c.minZ - RADIUS; else p.z = c.maxZ + RADIUS;
        this.vel.z = 0;
      }
    }
  }
  // Find what the crosshair is pointing at.
  pick() {
    this.ray.setFromCamera({ x: 0, y: 0 }, this.camera);
    const hits = this.ray.intersectObjects(interactables, false);
    this.target = hits.length ? hits[0].object : null;
    return this.target;
  }
}

// Smoothly docks the camera into a fixed pose (for playing a machine) and back.
export class CameraRig {
  constructor(camera, controller) {
    this.camera = camera; this.ctl = controller;
    this.active = false; this.t = 0; this.dur = 0.8;
    this.from = { pos: new THREE.Vector3(), quat: new THREE.Quaternion() };
    this.to = { pos: new THREE.Vector3(), quat: new THREE.Quaternion() };
    this.mode = 'idle'; // 'in' | 'hold' | 'out'
    this.onArrive = null;
    this._m = new THREE.Matrix4();
  }
  dock(pos, lookAt, onArrive, dur = 0.8) {
    this.ctl.enabled = false;
    this.from.pos.copy(this.camera.position); this.from.quat.copy(this.camera.quaternion);
    this.to.pos.copy(pos);
    this._m.lookAt(pos, lookAt, new THREE.Vector3(0, 1, 0));
    this.to.quat.setFromRotationMatrix(this._m);
    this.t = 0; this.dur = dur; this.mode = 'in'; this.active = true; this.onArrive = onArrive;
  }
  release(dur = 0.7) {
    if (!this.active) { this.ctl.enabled = true; return; }
    this.from.pos.copy(this.camera.position); this.from.quat.copy(this.camera.quaternion);
    this.to.pos.set(this.ctl.pos.x, EYE, this.ctl.pos.z);
    this.to.quat.setFromEuler(new THREE.Euler(this.ctl.pitch, this.ctl.yaw, 0, 'YXZ'));
    this.t = 0; this.dur = dur; this.mode = 'out';
  }
  update(dt) {
    if (!this.active) return;
    if (this.mode === 'hold') return;
    this.t += dt;
    const k = Math.min(1, this.t / this.dur);
    const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
    this.camera.position.lerpVectors(this.from.pos, this.to.pos, e);
    this.camera.quaternion.slerpQuaternions(this.from.quat, this.to.quat, e);
    if (k >= 1) {
      if (this.mode === 'in') { this.mode = 'hold'; this.onArrive?.(); }
      else { this.mode = 'idle'; this.active = false; this.ctl.enabled = true; }
    }
  }
}
