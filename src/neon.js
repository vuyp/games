// Neon text, lit box signs and chasing marquee bulbs.
import * as THREE from 'three';
import { textTexture, measureText, labelTexture } from './textures.js';
import { emissive, glowMat, M } from './materials.js';
import { updatables } from './world.js';

const NEON_FONT = '"Bungee", Impact, "Arial Black", sans-serif';
const SCRIPT_FONT = 'italic 700 "Rubik", "Segoe UI", sans-serif';

// A glowing text plane (double-sided). Height in metres; width follows the text.
export function neonText(text, { color = '#ff2d95', height = 0.5, fontFamily = NEON_FONT, intensity = 2.2, backing = true, backingColor = 0x08080c, letterSpacing = 6, script = false } = {}) {
  const px = 160;
  const font = script ? `${SCRIPT_FONT.replace('"Rubik"', `${px}px "Rubik"`)}` : `${px}px ${fontFamily}`;
  const fontStr = script ? `italic 700 ${px}px "Rubik", "Segoe UI", sans-serif` : `${px}px ${fontFamily}`;
  const textW = measureText(text, fontStr, letterSpacing);
  const canvasW = Math.ceil(Math.min(4096, textW + 220));
  const canvasH = 320;
  const tex = textTexture(text, { font: fontStr, color: '#ffffff', glow: color, glowSize: 44, width: canvasW, height: canvasH, letterSpacing });
  const worldW = (canvasW / canvasH) * height;
  const group = new THREE.Group();
  const c = new THREE.Color(color);
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false, side: THREE.DoubleSide, depthWrite: false, color: c.clone().multiplyScalar(intensity).lerp(new THREE.Color(0xffffff).multiplyScalar(intensity), 0.35) });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(worldW, height), mat);
  plane.renderOrder = 5;
  plane.userData.neonText = text;
  group.add(plane);
  if (backing) {
    const back = new THREE.Mesh(new THREE.BoxGeometry(worldW * 0.92, height * 0.78, 0.04), new THREE.MeshStandardMaterial({ color: backingColor, roughness: 0.8, metalness: 0.4 }));
    back.position.z = -0.03;
    group.add(back);
  }
  group.userData.width = worldW;
  return group;
}

// Illuminated box sign (like hanging directional signs).
export function boxSign(lines, { w = 1.6, h = 0.45, bg = '#0f1a3a', fg = '#ffffff', font = '38px "Bungee", Impact, sans-serif', intensity = 1.4, twoSided = true } = {}) {
  const tex = labelTexture(lines, { bg, fg, w: 512, h: Math.round(512 * h / w), font });
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.12), M.blackPlastic);
  group.add(body);
  const faceMat = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: intensity, roughness: 0.5 });
  const face = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.96, h * 0.9), faceMat);
  face.position.z = 0.061;
  group.add(face);
  if (twoSided) {
    const back = face.clone();
    back.position.z = -0.061;
    back.rotation.y = Math.PI;
    group.add(back);
  }
  return group;
}

// Hanging rods for a ceiling sign.
export function hangSign(sign, x, y, z, rotY = 0, ceilingY = 5.4) {
  sign.position.set(x, y, z);
  sign.rotation.y = rotY;
  const rodMat = M.steelDark;
  const h = ceilingY - y;
  for (const dx of [-0.3, 0.3]) {
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, h, 6), rodMat);
    rod.position.set(dx, h / 2, 0);
    sign.add(rod);
  }
  return sign;
}

// Chasing marquee bulbs: one InstancedMesh, per-instance colours animated each frame.
export class BulbChaser {
  constructor(positions, { radius = 0.028, color = 0xffb84d, mode = 'chase', speed = 8, parent = null, offset = 0 } = {}) {
    this.n = positions.length;
    this.mode = mode;
    this.speed = speed;
    this.offset = offset;
    this.on = new THREE.Color(color).multiplyScalar(4.5);
    this.off = new THREE.Color(color).multiplyScalar(0.12);
    const geo = new THREE.SphereGeometry(radius, 8, 6);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
    this.mesh = new THREE.InstancedMesh(geo, mat, this.n);
    const m = new THREE.Matrix4();
    positions.forEach((p, i) => { m.makeTranslation(p[0], p[1], p[2]); this.mesh.setMatrixAt(i, m); this.mesh.setColorAt(i, this.off); });
    this.mesh.instanceMatrix.needsUpdate = true;
    this.mesh.instanceColor.needsUpdate = true;
    this.mesh.frustumCulled = true;
    (parent || null)?.add(this.mesh);
    this.t = 0;
    this._c = new THREE.Color();
    updatables.push(this);
  }
  update(dt, t) {
    const T = t * this.speed + this.offset;
    for (let i = 0; i < this.n; i++) {
      let lit;
      if (this.mode === 'chase') lit = ((i + Math.floor(T)) % 3) === 0;
      else if (this.mode === 'blink') lit = Math.floor(T / 4) % 2 === 0;
      else if (this.mode === 'twinkle') lit = Math.sin(T * 0.7 + i * 1.7) > 0.3;
      else if (this.mode === 'alternate') lit = ((i + Math.floor(T / 2)) % 2) === 0;
      else lit = true;
      this._c.copy(lit ? this.on : this.off);
      this.mesh.setColorAt(i, this._c);
    }
    this.mesh.instanceColor.needsUpdate = true;
  }
  setMode(mode, speed) { this.mode = mode; if (speed) this.speed = speed; }
}

// Bulb positions around a rectangle (in the local XY plane at z), corner to corner.
export function rectBulbs(w, h, spacing = 0.12, z = 0, cx = 0, cy = 0) {
  const pts = [];
  const nx = Math.max(2, Math.round(w / spacing)), ny = Math.max(2, Math.round(h / spacing));
  for (let i = 0; i < nx; i++) pts.push([cx - w / 2 + (i / nx) * w, cy + h / 2, z]);
  for (let i = 0; i < ny; i++) pts.push([cx + w / 2, cy + h / 2 - (i / ny) * h, z]);
  for (let i = 0; i < nx; i++) pts.push([cx + w / 2 - (i / nx) * w, cy - h / 2, z]);
  for (let i = 0; i < ny; i++) pts.push([cx - w / 2, cy - h / 2 + (i / ny) * h, z]);
  return pts;
}

export function circleBulbs(r, count, z = 0, cx = 0, cy = 0) {
  const pts = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r, z]);
  }
  return pts;
}

export function lineBulbs(from, to, count) {
  const pts = [];
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0 : i / (count - 1);
    pts.push([from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t, from[2] + (to[2] - from[2]) * t]);
  }
  return pts;
}

// Thin LED strip: an emissive box.
export function ledStrip(len, color, intensity = 2.5, thickness = 0.02) {
  return new THREE.Mesh(new THREE.BoxGeometry(len, thickness, thickness), glowMat(color, intensity));
}

export { emissive, glowMat };
