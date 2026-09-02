// Ticket-redemption games and other stations: skee-ball, hoops, claws, prize wheel, air hockey,
// coin pushers, Winner's Circle prize counter, Power Card kiosks, host stand, the sports bar.
import * as THREE from 'three';
import { M, emissive, glowMat } from './materials.js';
import { neonText, boxSign, BulbChaser, rectBulbs, circleBulbs, lineBulbs } from './neon.js';
import { addCollider, interactionVolume, updatables } from './world.js';
import { wheelFaceTexture, labelTexture, prizeBoxTexture, radialGlowTexture, marqueeTexture } from './textures.js';
import { ATTRACT } from './screens.js';

export const WHEEL_SEGMENTS = [
  { label: '25', value: 25, color: '#d8202a' }, { label: '50', value: 50, color: '#1946d8' }, { label: '10', value: 10, color: '#ffc31c' }, { label: '100', value: 100, color: '#1fc24a' },
  { label: '25', value: 25, color: '#ff7a1c' }, { label: '5', value: 5, color: '#8a3dff' }, { label: '75', value: 75, color: '#22e5ff' }, { label: '10', value: 10, color: '#ff4fb0' },
  { label: '250', value: 250, color: '#d8202a' }, { label: '25', value: 25, color: '#1946d8' }, { label: '50', value: 50, color: '#ffc31c' }, { label: '10', value: 10, color: '#1fc24a' },
  { label: '1000', value: 1000, color: '#ffffff', jackpot: true }, { label: '25', value: 25, color: '#8a3dff' }, { label: '5', value: 5, color: '#22e5ff' }, { label: '75', value: 75, color: '#ff4fb0' },
];

export class MidwayFactory {
  constructor(scene, batcher, screens) {
    this.scene = scene; this.b = batcher; this.screens = screens;
    this.stations = [];
    this.glowTex = radialGlowTexture('rgba(255,255,255,1)', 'rgba(255,255,255,0)', 128);
    this.glowMats = {};
    this.marquees = {};
  }
  group(x, z, rotY) {
    const g = new THREE.Group();
    g.position.set(x, 0, z); g.rotation.y = rotY;
    this.scene.add(g); g.updateMatrixWorld(true);
    return g;
  }
  contactShadow(g, w, d, cx = 0, cz = 0) {
    if (!this.shadowMat) { this.shadowMat = new THREE.MeshBasicMaterial({ map: this.glowTex, color: 0x000000, transparent: true, opacity: 0.7, depthWrite: false }); this.shadowMat.userData.noShadow = true; this.shadowMat.userData.noReceive = true; }
    this.b.plane(w * 1.6, d * 1.6, this.shadowMat, [cx, 0.007, cz], [-Math.PI / 2, 0, 0], g);
  }
  glow(g, x, z, size, hue, opacity = 0.28) {
    if (!this.glowMats[hue]) {
      this.glowMats[hue] = new THREE.MeshBasicMaterial({ map: this.glowTex, color: hue, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
      this.glowMats[hue].userData.noShadow = true; this.glowMats[hue].userData.noReceive = true;
    }
    this.b.plane(size, size, this.glowMats[hue], [x, 0.012, z], [-Math.PI / 2, 0, 0], g);
  }
  marquee(title, seed) {
    const key = title + seed;
    if (!this.marquees[key]) {
      this.marquees[key] = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: marqueeTexture(title, seed), emissiveIntensity: 0.95, roughness: 0.5 });
      this.marquees[key].userData.noShadow = true;
    }
    return this.marquees[key];
  }
  cardReader(g, pos, rot) {
    const holder = new THREE.Group();
    holder.position.set(pos[0], pos[1], pos[2]); holder.rotation.set(rot[0], rot[1], rot[2]);
    g.add(holder); holder.updateMatrixWorld(true);
    this.b.box(0.085, 0.13, 0.05, M.blackPlastic, [0, 0.065, 0], [0, 0, 0], holder);
    this.b.plane(0.06, 0.035, emissive(0x26e5ff, 1.6), [0, 0.09, 0.0255], [0, 0, 0], holder);
    this.b.plane(0.06, 0.012, emissive(0xffb02e, 1.2), [0, 0.045, 0.0255], [0, 0, 0], holder);
    this.b.sphere(0.005, emissive(0xff2020, 2.5), [0.03, 0.115, 0.0255], holder, 6);
  }
  screen(g, kind, w, h, pos, rot, pw = 160, ph = 120, variant = 0, priv = false) {
    const entry = priv ? this.screens.createPrivate(pw, ph) : this.screens.get(kind, variant, pw, ph);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), entry.material);
    mesh.position.set(pos[0], pos[1], pos[2]); mesh.rotation.set(rot[0], rot[1], rot[2]);
    g.add(mesh);
    return { mesh, entry };
  }
  plush(g, pos, colorIdx, size = 0.1, parent) {
    const mat = M.plushColors[colorIdx % M.plushColors.length];
    const b = this.b;
    const p = parent || g;
    b.sphere(size, mat, [pos[0], pos[1], pos[2]], p, 10);
    b.sphere(size * 0.72, mat, [pos[0], pos[1] + size * 1.1, pos[2] + size * 0.1], p, 10);
    b.sphere(size * 0.3, mat, [pos[0] - size * 0.55, pos[1] + size * 1.7, pos[2]], p, 8);
    b.sphere(size * 0.3, mat, [pos[0] + size * 0.55, pos[1] + size * 1.7, pos[2]], p, 8);
    b.sphere(size * 0.09, M.blackMatte, [pos[0] - size * 0.25, pos[1] + size * 1.2, pos[2] + size * 0.7], p, 6);
    b.sphere(size * 0.09, M.blackMatte, [pos[0] + size * 0.25, pos[1] + size * 1.2, pos[2] + size * 0.7], p, 6);
  }
  finish(rec, g, w, d, cz, interact, volH = 2.6) {
    this.contactShadow(g, w, d, 0, cz);
    addCollider(g.position.x + Math.cos(g.rotation.y) * 0 , g.position.z, w, d, g.rotation.y);
    rec.group = g;
    rec.volume = interactionVolume(0, volH / 2, cz, w, volH, d, 0, interact);
    g.add(rec.volume);
    this.stations.push(rec);
    return rec;
  }
  // world-space collider for a group-local rectangle
  localCollider(g, lx, lz, w, d) {
    const v = new THREE.Vector3(lx, 0, lz).applyMatrix4(g.matrixWorld);
    addCollider(v.x, v.z, w, d, g.rotation.y);
  }

  // ---------------- Skee-Ball ----------------
  skeeball(x, z, rotY) {
    const b = this.b, g = this.group(x, z, rotY);
    const rec = { type: 'skee', name: 'Skee-Ball', cost: 3 };
    // base cabinet & lane
    b.box(0.92, 0.5, 3.4, M.cabinetBlue, [0, 0.25, 0.2], [0, 0, 0], g);
    b.box(0.8, 0.02, 3.2, M.maple, [0, 0.51, 0.2], [0, 0, 0], g);
    b.box(0.06, 0.1, 3.4, M.maple, [-0.43, 0.55, 0.2], [0, 0, 0], g);
    b.box(0.06, 0.1, 3.4, M.maple, [0.43, 0.55, 0.2], [0, 0, 0], g);
    // ramp
    b.box(0.8, 0.02, 0.55, M.maple, [0, 0.7, -1.6], [0.8, 0, 0], g);
    // target board & housing
    b.box(1.0, 1.3, 0.9, M.cabinetBlue, [0, 0.65, -2.35], [0, 0, 0], g);
    b.box(0.88, 1.05, 0.06, M.blackPlastic, [0, 1.1, -2.2], [-0.62, 0, 0], g);
    b.plane(0.85, 1.0, M.skeeTarget, [0, 1.1 + 0.032 * Math.cos(0.62), -2.2 + 0.032 * Math.sin(0.62) * 1], [-0.62, 0, 0], g);
    // ring lips
    const lipMat = M.whitePlastic;
    for (const r of [0.05, 0.107, 0.172, 0.244, 0.322]) {
      const c = new THREE.Vector3(0, -0.1, 0.04).applyEuler(new THREE.Euler(-0.62, 0, 0)).add(new THREE.Vector3(0, 1.1, -2.2));
      b.torus(r, 0.008, lipMat, [c.x, c.y, c.z], [-0.62, 0, 0], g, 6, 32);
    }
    // cage
    const cageH = 1.9;
    b.plane(0.9, cageH, M.wire, [0, 0.5 + cageH / 2 + 0.5, -2.85], [0, 0, 0], g);
    b.plane(1.3, cageH, M.wire, [-0.5, 0.5 + cageH / 2 + 0.5, -2.2], [0, Math.PI / 2, 0], g);
    b.plane(1.3, cageH, M.wire, [0.5, 0.5 + cageH / 2 + 0.5, -2.2], [0, Math.PI / 2, 0], g);
    b.plane(1.0, 1.3, M.wire, [0, 2.9, -2.2], [-Math.PI / 2, 0, 0], g);
    for (const [px, pz] of [[-0.5, -2.85], [0.5, -2.85], [-0.5, -1.55], [0.5, -1.55]]) b.cyl(0.02, 0.02, 2.0, M.steelDark, [px, 1.95, pz], [0, 0, 0], g, 8);
    // header with marquee, bulbs, score display
    b.box(1.0, 0.5, 0.12, M.blackPlastic, [0, 3.15, -2.2], [0, 0, 0], g);
    b.plane(0.92, 0.42, this.marquee('SKEE-BALL', 3), [0, 3.15, -2.13], [0, 0, 0], g);
    new BulbChaser(rectBulbs(1.0, 0.5, 0.11, -2.12, 0, 3.15), { color: 0xffd28a, mode: 'chase', speed: 7, parent: g, radius: 0.022 });
    const sb = this.screen(g, 'scoreboard', 0.5, 0.36, [0, 2.6, -2.16], [0, 0, 0], 160, 120, 0, true);
    rec.scoreEntry = sb.entry;
    rec.scoreEntry.state = { rnd: Math.random, hi: 320 };
    ATTRACT.scoreboard(sb.entry.ctx, sb.entry.w, sb.entry.h, 0, sb.entry.state, 0); sb.entry.texture.needsUpdate = true;
    // lane lighting under the header
    b.plane(0.9, 0.08, glowMat(0xfff1d6, 2.2), [0, 2.32, -2.1], [Math.PI / 2, 0, 0], g);
    // ball return trough & balls
    b.box(0.12, 0.08, 2.6, M.steelDark, [0.52, 0.42, 0.5], [0, 0, 0], g);
    rec.balls = [];
    for (let i = 0; i < 9; i++) {
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 10), M.skeeBall);
      ball.position.set(0.52, 0.5, 1.7 - i * 0.1);
      ball.castShadow = true;
      g.add(ball); rec.balls.push(ball);
    }
    // player end panel
    b.box(0.9, 0.35, 0.16, M.blackPlastic, [0, 0.66, 1.9], [-0.35, 0, 0], g);
    b.cyl(0.03, 0.03, 0.015, M.redPlastic, [-0.25, 0.75, 1.9], [Math.PI / 2 - 0.35, 0, 0], g, 14);
    this.cardReader(g, [0.25, 0.7, 1.86], [-0.35, 0, 0]);
    this.glow(g, 0, 2.4, 1.8, 0x2f6fff, 0.22);
    rec.lane = { startZ: 1.55, rampZ: -1.4, rampEndZ: -1.85, y: 0.56, target: { z: -2.2, y: 1.1, tilt: -0.62 } };
    rec.standPose = { local: [0, 1.62, 2.55], look: [0, 1.0, -2.2] };
    return this.finish(rec, g, 1.0, 4.9, -0.3, { kind: 'station', label: 'Play Skee-Ball', cost: 3, station: rec }, 3.4);
  }

  // ---------------- Basketball ----------------
  hoops(x, z, rotY) {
    const b = this.b, g = this.group(x, z, rotY);
    const rec = { type: 'hoops', name: 'Hoop Fever', cost: 3 };
    b.box(1.05, 0.55, 2.8, M.cabinetRed, [0, 0.275, -0.1], [0, 0, 0], g);
    b.box(0.95, 0.02, 2.5, M.blackPlastic, [0, 0.6, -0.2], [-0.08, 0, 0], g);
    // ball return lip at the front
    b.box(1.05, 0.12, 0.2, M.cabinetRed, [0, 0.62, 1.2], [0, 0, 0], g);
    // backboard, rim, net
    b.box(0.95, 0.65, 0.03, M.tintedGlass, [0, 2.4, -1.35], [0, 0, 0], g);
    b.box(0.95, 0.04, 0.04, M.whitePlastic, [0, 2.08, -1.33], [0, 0, 0], g);
    b.box(0.04, 0.6, 0.04, M.whitePlastic, [-0.46, 2.4, -1.33], [0, 0, 0], g);
    b.box(0.04, 0.6, 0.04, M.whitePlastic, [0.46, 2.4, -1.33], [0, 0, 0], g);
    b.box(0.5, 0.36, 0.03, M.paperWhite, [0, 2.3, -1.34], [0, 0, 0], g);
    b.box(0.44, 0.3, 0.035, M.cabinetRed, [0, 2.3, -1.34], [0, 0, 0], g);
    b.torus(0.24, 0.014, M.orangePlastic, [0, 2.15, -1.05], [Math.PI / 2, 0, 0], g, 8, 28);
    b.box(0.08, 0.06, 0.3, M.orangePlastic, [0, 2.15, -1.2], [0, 0, 0], g);
    const netGeo = new THREE.BufferGeometry();
    const pts = [];
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2, a2 = ((i + 1) / 12) * Math.PI * 2;
      pts.push(Math.cos(a) * 0.24, 2.15, -1.05 + Math.sin(a) * 0.24, Math.cos(a2) * 0.13, 1.82, -1.05 + Math.sin(a2) * 0.13);
      pts.push(Math.cos(a) * 0.13, 1.82, -1.05 + Math.sin(a) * 0.13, Math.cos(a2) * 0.13, 1.82, -1.05 + Math.sin(a2) * 0.13);
      pts.push(Math.cos(a) * 0.19, 1.98, -1.05 + Math.sin(a) * 0.19, Math.cos(a2) * 0.19, 1.98, -1.05 + Math.sin(a2) * 0.19);
    }
    netGeo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    g.add(new THREE.LineSegments(netGeo, new THREE.LineBasicMaterial({ color: 0xf0f0f0 })));
    // cage
    const cageH = 2.5;
    b.plane(1.05, cageH, M.wire, [0, 0.55 + cageH / 2, -1.5], [0, 0, 0], g);
    b.plane(2.8, cageH, M.wire, [-0.52, 0.55 + cageH / 2, -0.1], [0, Math.PI / 2, 0], g);
    b.plane(2.8, cageH, M.wire, [0.52, 0.55 + cageH / 2, -0.1], [0, Math.PI / 2, 0], g);
    b.plane(1.05, 2.8, M.wire, [0, 3.05, -0.1], [-Math.PI / 2, 0, 0], g);
    for (const [px, pz] of [[-0.52, -1.5], [0.52, -1.5], [-0.52, 1.3], [0.52, 1.3]]) b.cyl(0.02, 0.02, 2.5, M.steelDark, [px, 1.8, pz], [0, 0, 0], g, 8);
    // header
    b.box(1.1, 0.55, 0.14, M.blackPlastic, [0, 3.35, -1.45], [0, 0, 0], g);
    b.plane(1.0, 0.46, this.marquee('HOOP FEVER', 1), [0, 3.35, -1.37], [0, 0, 0], g);
    new BulbChaser(rectBulbs(1.1, 0.55, 0.11, -1.36, 0, 3.35), { color: 0xffd28a, mode: 'chase', speed: 8, parent: g, radius: 0.022 });
    const sb = this.screen(g, 'scoreboard', 0.5, 0.36, [0, 2.85, -1.4], [0, 0, 0], 160, 120, 0, true);
    rec.scoreEntry = sb.entry; rec.scoreEntry.state = { rnd: Math.random, hi: 48 };
    ATTRACT.scoreboard(sb.entry.ctx, sb.entry.w, sb.entry.h, 0, sb.entry.state, 0); sb.entry.texture.needsUpdate = true;
    b.plane(1.0, 0.08, glowMat(0xfff1d6, 2.2), [0, 3.05, -1.3], [Math.PI / 2, 0, 0], g);
    // rack balls
    rec.balls = [];
    for (let i = 0; i < 3; i++) {
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 12), M.basketball);
      ball.position.set(-0.3 + i * 0.3, 0.75, 1.0); ball.castShadow = true; g.add(ball); rec.balls.push(ball);
    }
    this.cardReader(g, [0.4, 0.72, 1.32], [-0.4, 0, 0]);
    b.cyl(0.03, 0.03, 0.015, M.greenPlastic, [-0.4, 0.75, 1.3], [Math.PI / 2 - 0.4, 0, 0], g, 14);
    this.glow(g, 0, 1.9, 1.8, 0xff5a3a, 0.2);
    rec.rim = { local: new THREE.Vector3(0, 2.15, -1.05), r: 0.24 };
    rec.standPose = { local: [0, 1.62, 2.1], look: [0, 2.1, -1.05] };
    return this.finish(rec, g, 1.1, 2.95, -0.1, { kind: 'station', label: 'Play Hoop Fever', cost: 3, station: rec }, 3.6);
  }

  // ---------------- Claw machine ----------------
  claw(x, z, rotY, seed = 0) {
    const b = this.b, g = this.group(x, z, rotY);
    const rec = { type: 'claw', name: 'Prize Claw', cost: 2 };
    const body = [M.cabinetRed, M.cabinetBlue, M.cabinetPurple, M.cabinetYellow][seed % 4];
    const accent = [0xff3cac, 0x26e5ff, 0xffd23f, 0x3dff7a][seed % 4];
    b.box(0.95, 0.9, 0.95, body, [0, 0.45, 0], [0, 0, 0], g);
    b.box(0.95, 0.1, 0.95, M.blackPlastic, [0, 0.95, 0], [0, 0, 0], g);
    // glass box
    for (const [px, pz, ry] of [[0, 0.47, 0], [0, -0.47, 0], [-0.47, 0, Math.PI / 2], [0.47, 0, Math.PI / 2]]) b.plane(0.94, 1.0, M.glass, [px, 1.5, pz], [0, ry, 0], g);
    for (const [px, pz] of [[-0.47, -0.47], [0.47, -0.47], [-0.47, 0.47], [0.47, 0.47]]) b.box(0.05, 1.0, 0.05, M.steelDark, [px, 1.5, pz], [0, 0, 0], g);
    // canopy with sign & LEDs
    b.box(1.05, 0.3, 1.05, M.blackPlastic, [0, 2.15, 0], [0, 0, 0], g);
    b.plane(0.98, 0.26, this.marquee('PRIZE CLAW', seed + 2), [0, 2.15, 0.526], [0, 0, 0], g);
    b.box(1.05, 0.03, 0.03, glowMat(accent, 2.5), [0, 2.01, 0.53], [0, 0, 0], g);
    b.box(1.05, 0.03, 0.03, glowMat(accent, 2.5), [0, 2.29, 0.53], [0, 0, 0], g);
    b.box(0.03, 0.03, 1.05, glowMat(accent, 2.5), [-0.53, 2.29, 0], [0, 0, 0], g);
    b.box(0.03, 0.03, 1.05, glowMat(accent, 2.5), [0.53, 2.29, 0], [0, 0, 0], g);
    // interior light
    b.plane(0.7, 0.7, glowMat(0xffffff, 1.6), [0, 1.99, 0], [Math.PI / 2, 0, 0], g);
    // plush pile (static)
    rec.plushes = [];
    const rnd = (n) => ((Math.sin(seed * 91 + n * 7.3) + 1) / 2);
    for (let i = 0; i < 12; i++) {
      const px = -0.32 + rnd(i) * 0.64, pz = -0.32 + rnd(i + 50) * 0.55;
      const ci = (seed + i) % M.plushColors.length;
      this.plush(g, [px, 1.06, pz], ci, 0.08 + rnd(i + 100) * 0.03);
      rec.plushes.push({ x: px, z: pz, color: ci });
    }
    // chute at the front-left
    b.box(0.22, 0.02, 0.22, M.blackMatte, [-0.32, 1.005, 0.33], [0, 0, 0], g);
    b.box(0.24, 0.05, 0.03, M.steelDark, [-0.32, 1.02, 0.22], [0, 0, 0], g);
    b.box(0.03, 0.05, 0.24, M.steelDark, [-0.2, 1.02, 0.33], [0, 0, 0], g);
    b.box(0.2, 0.18, 0.02, M.blackMatte, [-0.32, 0.6, 0.48], [0, 0, 0], g);
    // gantry & claw (dynamic)
    b.cyl(0.012, 0.012, 0.9, M.chrome, [-0.4, 1.92, 0], [Math.PI / 2, 0, 0], g, 8);
    b.cyl(0.012, 0.012, 0.9, M.chrome, [0.4, 1.92, 0], [Math.PI / 2, 0, 0], g, 8);
    const gantry = new THREE.Group(); gantry.position.set(0, 1.92, 0); g.add(gantry);
    gantry.add(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.85, 8), M.chrome).rotateZ(Math.PI / 2));
    const carriage = new THREE.Group(); gantry.add(carriage);
    carriage.add(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.12), M.blackPlastic));
    const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 1, 6), M.steelDark);
    cable.position.y = -0.5; carriage.add(cable);
    const head = new THREE.Group(); carriage.add(head);
    head.add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.06, 12), M.chrome));
    const prongs = [];
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const pivot = new THREE.Group(); pivot.rotation.y = a; head.add(pivot);
      const prong = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.16, 0.02), M.chrome);
      prong.position.set(0.045, -0.09, 0); prong.rotation.z = 0.5;
      pivot.add(prong);
      const tip = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.07, 0.02), M.chrome);
      tip.position.set(0.075, -0.17, 0); tip.rotation.z = -0.4; pivot.add(tip);
      prongs.push(pivot);
    }
    rec.claw = { gantry, carriage, cable, head, prongs, x: 0, z: 0, drop: 0, open: 1 };
    rec.bounds = { minX: -0.34, maxX: 0.34, minZ: -0.34, maxZ: 0.34, dropDepth: 0.8 };
    // controls on the front slope
    b.box(0.95, 0.12, 0.35, M.blackPlastic, [0, 0.93, 0.6], [-0.35, 0, 0], g);
    b.box(0.95, 0.5, 0.3, body, [0, 0.6, 0.62], [0, 0, 0], g);
    b.cyl(0.006, 0.006, 0.08, M.chrome, [-0.2, 1.02, 0.6], [-0.35, 0, 0], g, 8);
    b.sphere(0.02, M.redPlastic, [-0.2, 1.06, 0.585], g, 8);
    b.cyl(0.03, 0.03, 0.015, M.redPlastic, [0.05, 0.99, 0.6], [Math.PI / 2 - 0.35 - Math.PI / 2 + 0.0, 0, 0], g, 14);
    this.cardReader(g, [0.32, 0.95, 0.56], [-0.35, 0, 0]);
    this.glow(g, 0, 0.9, 1.4, accent, 0.18);
    rec.standPose = { local: [0, 1.55, 1.25], look: [0, 1.25, 0] };
    return this.finish(rec, g, 1.0, 1.4, 0.1, { kind: 'station', label: 'Play Prize Claw', cost: 2, station: rec }, 2.4);
  }

  // ---------------- Prize wheel ----------------
  wheel(x, z, rotY) {
    const b = this.b, g = this.group(x, z, rotY);
    const rec = { type: 'wheel', name: 'Mega Spin', cost: 4 };
    b.box(1.5, 0.9, 0.9, M.cabinetYellow, [0, 0.45, 0], [0, 0, 0], g);
    b.box(2.5, 2.9, 0.2, M.cabinetRed, [0, 2.3, -0.35], [0, 0, 0], g);
    b.box(2.6, 0.1, 0.3, M.blackPlastic, [0, 3.8, -0.35], [0, 0, 0], g);
    const title = neonText('MEGA SPIN', { color: '#ffd23f', height: 0.5, intensity: 2.4, backing: false });
    title.position.set(0, 4.15, -0.3); g.add(title);
    const faceTex = wheelFaceTexture(WHEEL_SEGMENTS);
    const wheelMat = [M.blackPlastic, new THREE.MeshStandardMaterial({ map: faceTex, roughness: 0.5, emissive: 0xffffff, emissiveMap: faceTex, emissiveIntensity: 0.3 }), M.blackPlastic];
    const pivot = new THREE.Group(); pivot.position.set(0, 2.2, -0.2); g.add(pivot);
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 0.08, 48), wheelMat);
    wheel.rotation.x = Math.PI / 2; wheel.rotation.y = 0;
    pivot.add(wheel);
    // pegs
    for (let i = 0; i < WHEEL_SEGMENTS.length; i++) {
      const a = (i / WHEEL_SEGMENTS.length) * Math.PI * 2;
      const peg = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.08, 6), M.chrome);
      peg.position.set(Math.cos(a) * 1.0, Math.sin(a) * 1.0, 0.06); peg.rotation.x = Math.PI / 2; pivot.add(peg);
    }
    rec.wheel = pivot;
    // pointer flap at the top
    const flap = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.22, 4), M.redPlastic);
    flap.position.set(0, 3.36, -0.12); flap.rotation.z = Math.PI; flap.rotation.y = Math.PI / 4;
    g.add(flap); rec.flap = flap;
    new BulbChaser(circleBulbs(1.16, 36, -0.12, 0, 2.2), { color: 0xffd28a, mode: 'chase', speed: 6, parent: g, radius: 0.03 });
    rec.bulbs = new BulbChaser(rectBulbs(2.5, 2.9, 0.16, -0.24, 0, 2.3), { color: 0xffffff, mode: 'alternate', speed: 5, parent: g, radius: 0.028 });
    // big spin button
    b.cyl(0.11, 0.12, 0.05, M.blackMatte, [0, 0.92, 0.2], [0, 0, 0], g, 20);
    b.cyl(0.09, 0.09, 0.05, M.redPlastic, [0, 0.96, 0.2], [0, 0, 0], g, 20);
    b.plane(0.5, 0.12, emissive(0xffd23f, 1.4), [0, 0.905, 0.42], [-Math.PI / 2, 0, 0], g);
    this.cardReader(g, [0.5, 0.9, 0.3], [-0.3, 0, 0]);
    this.glow(g, 0, 0.9, 2.2, 0xffb02e, 0.22);
    rec.standPose = { local: [0, 1.62, 1.6], look: [0, 2.2, -0.2] };
    return this.finish(rec, g, 2.6, 1.2, -0.1, { kind: 'station', label: 'Spin Mega Spin', cost: 4, station: rec }, 4.2);
  }

  // ---------------- Air hockey (ambient animated) ----------------
  airHockey(x, z, rotY) {
    const b = this.b, g = this.group(x, z, rotY);
    const rec = { type: 'airhockey', name: 'Air Hockey' };
    b.box(1.9, 0.62, 1.0, M.cabinetBlue, [0, 0.31, 0], [0, 0, 0], g);
    b.box(2.3, 0.18, 1.25, M.blackPlastic, [0, 0.71, 0], [0, 0, 0], g);
    b.plane(2.1, 1.1, M.airHockey, [0, 0.805, 0], [-Math.PI / 2, 0, -Math.PI / 2], g);
    b.box(2.3, 0.06, 0.06, M.steelDark, [0, 0.83, -0.6], [0, 0, 0], g);
    b.box(2.3, 0.06, 0.06, M.steelDark, [0, 0.83, 0.6], [0, 0, 0], g);
    b.box(0.06, 0.06, 1.25, M.steelDark, [-1.15, 0.83, 0], [0, 0, 0], g);
    b.box(0.06, 0.06, 1.25, M.steelDark, [1.15, 0.83, 0], [0, 0, 0], g);
    // scoreboard on the side
    b.box(0.5, 0.25, 0.1, M.blackPlastic, [0, 0.95, -0.65], [0, 0, 0], g);
    b.plane(0.16, 0.12, emissive(0xff2020, 2), [-0.12, 0.95, -0.6], [0, 0, 0], g);
    b.plane(0.16, 0.12, emissive(0xff2020, 2), [0.12, 0.95, -0.6], [0, 0, 0], g);
    // overhead light bar
    for (const px of [-0.9, 0.9]) b.cyl(0.015, 0.015, 1.3, M.steelDark, [px, 2.5, 0], [0, 0, 0], g, 6);
    b.box(2.2, 0.08, 0.3, M.blackPlastic, [0, 1.9, 0], [0, 0, 0], g);
    b.plane(2.1, 0.22, glowMat(0xffffff, 2.2), [0, 1.855, 0], [Math.PI / 2, 0, 0], g);
    const puck = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.012, 16), M.blackMatte);
    puck.position.y = 0.82; g.add(puck);
    const mallet = (mx) => { const m = new THREE.Group(); m.add(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.065, 0.04, 16), M.redPlastic)); const k = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.05, 12), M.redPlastic); k.position.y = 0.045; m.add(k); m.position.set(mx, 0.83, 0); g.add(m); return m; };
    const m1 = mallet(-0.85), m2 = mallet(0.85);
    const st = { vx: 1.4, vz: 0.9, px: 0, pz: 0 };
    updatables.push({ update(dt) {
      st.px += st.vx * dt; st.pz += st.vz * dt;
      if (st.px > 0.95 || st.px < -0.95) { st.vx *= -1; st.px = Math.max(-0.95, Math.min(0.95, st.px)); }
      if (st.pz > 0.48 || st.pz < -0.48) { st.vz *= -1; st.pz = Math.max(-0.48, Math.min(0.48, st.pz)); }
      puck.position.x = st.px; puck.position.z = st.pz;
      m1.position.z += (st.pz - m1.position.z) * dt * 3; m2.position.z += (st.pz - m2.position.z) * dt * 2.5;
    } });
    this.glow(g, 0, 0, 2.6, 0x8ab8ff, 0.14);
    this.contactShadow(g, 2.3, 1.25);
    addCollider(g.position.x, g.position.z, 2.4, 1.35, g.rotation.y);
    rec.group = g; this.stations.push(rec);
    return rec;
  }

  // ---------------- Coin pusher (ambient animated) ----------------
  pusher(x, z, rotY, seed = 0) {
    const b = this.b, g = this.group(x, z, rotY);
    const rec = { type: 'pusher', name: 'Coin Pusher' };
    const body = seed % 2 ? M.cabinetPurple : M.cabinetRed;
    b.box(1.1, 1.0, 0.9, body, [0, 0.5, 0], [0, 0, 0], g);
    b.box(1.1, 0.06, 0.9, M.blackPlastic, [0, 1.03, 0], [0, 0, 0], g);
    b.plane(1.06, 0.7, M.glass, [0, 1.4, 0.45], [0, 0, 0], g);
    b.plane(0.9, 0.7, M.glass, [-0.55, 1.4, 0], [0, Math.PI / 2, 0], g);
    b.plane(0.9, 0.7, M.glass, [0.55, 1.4, 0], [0, Math.PI / 2, 0], g);
    b.box(1.1, 0.5, 0.08, M.blackPlastic, [0, 1.4, -0.42], [0, 0, 0], g);
    b.box(1.15, 0.35, 0.95, M.blackPlastic, [0, 1.93, 0], [0, 0, 0], g);
    this.screen(g, 'jackpot', 0.9, 0.3, [0, 1.93, 0.48], [0, 0, 0], 240, 90);
    b.box(1.0, 0.04, 0.8, M.steel, [0, 1.06, 0], [0, 0, 0], g);
    // coins
    const coinGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.004, 12);
    const coinMat = new THREE.MeshStandardMaterial({ color: 0xd8b04a, metalness: 0.9, roughness: 0.3 });
    const coins = new THREE.InstancedMesh(coinGeo, coinMat, 160);
    const m = new THREE.Matrix4(); const e = new THREE.Euler(); const q = new THREE.Quaternion(); const s = new THREE.Vector3(1, 1, 1); const p = new THREE.Vector3();
    for (let i = 0; i < 160; i++) {
      const r1 = ((Math.sin(i * 12.9 + seed) + 1) / 2), r2 = ((Math.sin(i * 7.7 + seed * 3) + 1) / 2), r3 = ((Math.sin(i * 3.1) + 1) / 2);
      p.set(-0.42 + r1 * 0.84, 1.085 + Math.floor(r3 * 3) * 0.004, -0.1 + r2 * 0.45);
      e.set((r3 - 0.5) * 0.3, r1 * 6, (r2 - 0.5) * 0.3); q.setFromEuler(e);
      m.compose(p, q, s); coins.setMatrixAt(i, m);
    }
    coins.castShadow = true; g.add(coins);
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.06, 0.35), M.blackPlastic);
    shelf.position.set(0, 1.11, -0.25); g.add(shelf);
    updatables.push({ update(dt, t) { shelf.position.z = -0.28 + Math.sin(t * 1.2 + seed) * 0.08; } });
    b.box(1.1, 0.1, 0.25, M.blackPlastic, [0, 1.05, 0.55], [-0.4, 0, 0], g);
    this.cardReader(g, [0.35, 0.98, 0.5], [-0.4, 0, 0]);
    this.glow(g, 0, 0.8, 1.4, 0xffd23f, 0.18);
    this.contactShadow(g, 1.1, 0.9);
    addCollider(g.position.x, g.position.z, 1.2, 1.0, g.rotation.y);
    rec.group = g; this.stations.push(rec);
    return rec;
  }

  // ---------------- Winner's Circle prize counter ----------------
  prizeCounter(x, z, backWallZ) {
    const b = this.b, g = this.group(x, z, 0);
    const rec = { type: 'prizes', name: "Winner's Circle" };
    // counter
    b.box(14, 1.0, 0.8, M.cabinetPurple, [0, 0.5, 0], [0, 0, 0], g);
    b.box(14.2, 0.06, 0.95, M.wood, [0, 1.03, 0], [0, 0, 0], g);
    b.plane(13.6, 0.75, M.tintedGlass, [0, 0.55, 0.41], [0, 0, 0], g);
    b.box(14, 0.04, 0.04, glowMat(0xffd23f, 1.3), [0, 0.98, 0.42], [0, 0, 0], g);
    for (let i = 0; i < 8; i++) {
      const px = -6 + i * 1.7;
      this.plush(g, [px, 0.35, 0.05], i, 0.12);
      b.box(0.35, 0.35, 0.35, new THREE.MeshStandardMaterial({ map: prizeBoxTexture(['PLUSH', 'YO-YO', 'SLIME', 'CANDY', 'CARDS', 'DICE', 'PUZZLE', 'BALL'][i], i) }), [px + 0.8, 0.28, 0.05], [0, 0.3, 0], g);
    }
    addCollider(x, z, 14.2, 0.9);
    addCollider(x - 7, z - 1.5, 0.3, 3); addCollider(x + 7, z - 1.5, 0.3, 3);
    // back shelving
    const shelfZ = backWallZ + 0.35 - z;
    b.box(16, 3.4, 0.05, M.cabinetPurple, [0, 1.7, shelfZ - 0.3], [0, 0, 0], g);
    const names = ['GIANT PLUSH', 'SPEAKER', 'HEADPHONES', 'DRONE', 'CONSOLE', 'LEGO SET', 'RC CAR', 'BLENDER', 'TV', 'CAMERA', 'WATCH', 'GUITAR'];
    [1.15, 2.05, 2.95].forEach((sy, tier) => {
      b.box(16, 0.05, 0.6, M.wood, [0, sy, shelfZ], [0, 0, 0], g);
      b.box(16, 0.03, 0.03, glowMat([0xff3cac, 0x26e5ff, 0xffd23f][tier], 1.3), [0, sy - 0.04, shelfZ + 0.3], [0, 0, 0], g);
      for (let i = 0; i < 12; i++) {
        const px = -7.3 + i * 1.33, seed = i + tier * 5;
        const size = 0.35 + ((seed * 37) % 10) / 40;
        if ((i + tier) % 3 === 0) this.plush(g, [px, sy + 0.03, shelfZ], seed, 0.13 + (seed % 3) * 0.02);
        else b.box(size, size * (0.6 + (seed % 4) * 0.15), 0.3, new THREE.MeshStandardMaterial({ map: prizeBoxTexture(names[(i + tier * 4) % names.length], seed) }), [px, sy + 0.03 + size * (0.6 + (seed % 4) * 0.15) / 2, shelfZ], [0, 0, 0], g);
      }
    });
    // giant plush and neon sign
    this.plush(g, [7.3, 0.0, shelfZ + 0.3], 0, 0.42);
    this.plush(g, [-7.3, 0.0, shelfZ + 0.3], 4, 0.4);
    const neon = neonText("WINNER'S CIRCLE", { color: '#ffd23f', height: 0.8, intensity: 2.5, backing: true });
    neon.position.set(0, 4.2, shelfZ - 0.2); g.add(neon);
    const sub = neonText('PRIZE REDEMPTION', { color: '#26e5ff', height: 0.32, intensity: 2.2, backing: false, letterSpacing: 12 });
    sub.position.set(0, 3.55, shelfZ - 0.2); g.add(sub);
    new BulbChaser(lineBulbs([-8, 4.85, shelfZ - 0.1], [8, 4.85, shelfZ - 0.1], 60), { color: 0xffd28a, mode: 'chase', speed: 10, parent: g, radius: 0.03 });
    // ticket eater kiosk
    b.box(0.6, 1.5, 0.5, M.cabinetRed, [8.5, 0.75, 0.6], [0, 0, 0], g);
    this.screen(g, 'prizeboard', 0.48, 0.36, [8.5, 1.25, 0.86], [-0.2, 0, 0], 240, 180);
    b.box(0.3, 0.04, 0.06, M.blackMatte, [8.5, 0.95, 0.86], [0, 0, 0], g);
    const lbl = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.16), new THREE.MeshStandardMaterial({ map: labelTexture(['TICKET EATER'], { bg: '#ffd23f', fg: '#111', w: 256, h: 80, font: 'bold 34px "Rubik", sans-serif' }) }));
    lbl.position.set(8.5, 1.55, 0.86); g.add(lbl);
    addCollider(x + 8.5, z + 0.6, 0.7, 0.6);
    rec.group = g;
    rec.volume = interactionVolume(0, 1.2, 0.3, 14, 2.4, 1.4, 0, { kind: 'prizes', label: 'Redeem tickets at the Winner\'s Circle', cost: 0, station: rec });
    g.add(rec.volume);
    this.stations.push(rec);
    return rec;
  }

  // ---------------- Power Card kiosk ----------------
  kiosk(x, z, rotY) {
    const b = this.b, g = this.group(x, z, rotY);
    const rec = { type: 'kiosk', name: 'Power Card Kiosk' };
    b.box(0.6, 1.5, 0.45, M.cabinetBlue, [0, 0.75, 0], [0, 0, 0], g);
    b.box(0.62, 0.42, 0.5, M.blackPlastic, [0, 1.6, 0.02], [-0.35, 0, 0], g);
    this.screen(g, 'kiosk', 0.44, 0.34, [0, 1.62, 0.28], [-0.35, 0, 0], 256, 192);
    b.box(0.6, 0.6, 0.02, glowMat(0x26e5ff, 1.2), [0, 1.9, -0.05], [0, 0, 0], g);
    const lbl = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.2), new THREE.MeshStandardMaterial({ map: labelTexture(['POWER CARD', 'RECHARGE'], { bg: '#0b0c2a', fg: '#26e5ff', w: 256, h: 92, font: 'bold 28px "Rubik", sans-serif' }), emissive: 0xffffff, emissiveMap: labelTexture(['POWER CARD', 'RECHARGE'], { bg: '#0b0c2a', fg: '#26e5ff', w: 256, h: 92, font: 'bold 28px "Rubik", sans-serif' }), emissiveIntensity: 0.9 }));
    lbl.position.set(0, 2.05, 0.0); g.add(lbl);
    b.box(0.2, 0.03, 0.03, M.blackMatte, [0.15, 1.15, 0.23], [0, 0, 0], g);
    b.box(0.03, 0.03, 0.03, glowMat(0x3dff7a, 2.5), [-0.15, 1.15, 0.23], [0, 0, 0], g);
    b.box(0.3, 0.02, 0.3, glowMat(0x26e5ff, 1.5), [0, 0.02, 0.45], [0, 0, 0], g);
    this.glow(g, 0, 0.5, 1.2, 0x26e5ff, 0.2);
    return this.finish(rec, g, 0.7, 0.6, 0, { kind: 'kiosk', label: 'Recharge Power Card', cost: 0, station: rec }, 2.2);
  }

  hostStand(x, z, rotY) {
    const b = this.b, g = this.group(x, z, rotY);
    b.box(0.75, 1.1, 0.5, M.cabinetPurple, [0, 0.55, 0], [0, 0, 0], g);
    b.box(0.85, 0.05, 0.6, M.wood, [0, 1.12, 0], [0, 0, 0], g);
    b.box(0.3, 0.02, 0.22, M.blackPlastic, [0.1, 1.15, 0], [0, 0, 0], g);
    b.cyl(0.06, 0.08, 0.02, M.steelDark, [-0.25, 1.15, 0], [0, 0, 0], g, 10);
    b.cyl(0.01, 0.01, 0.35, M.steelDark, [-0.25, 1.3, 0], [0, 0, 0], g, 6);
    b.cyl(0.08, 0.1, 0.12, glowMat(0xffe0b0, 1.6), [-0.25, 1.5, 0], [0, 0, 0], g, 12);
    const lbl = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.22), new THREE.MeshStandardMaterial({ map: labelTexture(['PLEASE WAIT', 'TO BE SEATED'], { bg: '#f4f1ea', fg: '#111', w: 256, h: 100, font: 'bold 26px "Rubik", sans-serif' }) }));
    lbl.position.set(0, 0.7, 0.26); g.add(lbl);
    addCollider(x, z, 0.9, 0.6, rotY);
  }

  // ---------------- Sports bar ----------------
  bar(scene) {
    const b = this.b, g = this.group(0, 0, 0);
    const rec = { type: 'bar', name: 'Sports Bar' };
    const wallX = 28;
    // back bar against the right wall
    b.box(0.6, 3.6, 13, M.cabinetPurple, [wallX - 0.3, 1.8, -2], [0, 0, 0], g);
    const bottleMats = [M.bottleGlass, M.bottleAmber, M.bottleClear];
    [1.3, 2.1, 2.9].forEach((sy, tier) => {
      b.box(0.5, 0.04, 12.8, M.wood, [wallX - 0.55, sy, -2], [0, 0, 0], g);
      b.box(0.03, 0.03, 12.8, glowMat([0x26e5ff, 0xff3cac, 0xffb02e][tier], 2.4), [wallX - 0.8, sy - 0.03, -2], [0, 0, 0], g);
      for (let i = 0; i < 40; i++) {
        const pz = -8.2 + i * 0.32, hgt = 0.26 + ((i * 7 + tier) % 4) * 0.03;
        b.cyl(0.035, 0.04, hgt, bottleMats[(i + tier) % 3], [wallX - 0.55 + ((i % 3) - 1) * 0.1, sy + 0.02 + hgt / 2, pz], [0, 0, 0], g, 8);
        b.cyl(0.012, 0.012, 0.08, M.blackMatte, [wallX - 0.55 + ((i % 3) - 1) * 0.1, sy + 0.02 + hgt + 0.04, pz], [0, 0, 0], g, 6);
      }
    });
    // TVs above the back bar
    for (let i = 0; i < 3; i++) {
      const pz = -7 + i * 3.0;
      b.box(0.06, 1.3, 2.3, M.blackPlastic, [wallX - 0.36, 4.3, pz], [0, 0, 0], g);
      this.screen(g, 'tv', 2.2, 1.24, [wallX - 0.395, 4.3, pz], [0, -Math.PI / 2, 0], 480, 270, i % 2);
    }
    const barNeon = neonText('BAR', { color: '#ff3cac', height: 1.4, intensity: 2.6, backing: false });
    barNeon.position.set(wallX - 0.12, 4.3, 3.2); barNeon.rotation.y = -Math.PI / 2; g.add(barNeon);
    const cold = neonText('ICE COLD BEER', { color: '#26e5ff', height: 0.42, intensity: 2.2, backing: false, letterSpacing: 8 });
    cold.position.set(wallX - 0.12, 3.3, 3.2); cold.rotation.y = -Math.PI / 2; g.add(cold);
    // warm bar lighting
    for (let i = 0; i < 4; i++) {
      const pl = new THREE.PointLight(0xffb070, i === 1 ? 45 : 30, 12, 2); pl.position.set(wallX - 3.2, 2.7, -7 + i * 3.2); pl.userData.tier = i === 1 ? 1 : 2; g.add(pl); (this.extraLights ||= []).push(pl);
    }
    const bl = new THREE.PointLight(0xff9ad0, 20, 10, 2); bl.position.set(wallX - 1.5, 3.6, 3.2); bl.userData.tier = 2; g.add(bl); (this.extraLights ||= []).push(bl);
    const tl = new THREE.PointLight(0xffd0a0, 28, 12, 2); tl.position.set(18, 3.0, -2.5); tl.userData.tier = 2; g.add(tl); (this.extraLights ||= []).push(tl);
    // counter
    const cxBar = wallX - 3.2;
    b.box(0.7, 1.1, 12, M.cabinetPurple, [cxBar, 0.55, -2], [0, 0, 0], g);
    b.box(0.95, 0.06, 12.3, M.wood, [cxBar, 1.13, -2], [0, 0, 0], g);
    b.box(0.05, 0.04, 12, glowMat(0xffb02e, 1.8), [cxBar - 0.44, 0.35, -2], [0, 0, 0], g);
    b.cyl(0.03, 0.03, 12, M.chrome, [cxBar - 0.62, 0.3, -2], [Math.PI / 2, 0, 0], g, 10);
    addCollider(cxBar, -2, 1.0, 12.3);
    addCollider(wallX - 0.5, -2, 1.0, 13);
    // taps
    for (let i = 0; i < 8; i++) {
      const pz = -4 + i * 0.5;
      b.cyl(0.02, 0.02, 0.35, M.chrome, [cxBar + 0.2, 1.33, pz], [0, 0, 0], g, 8);
      b.cyl(0.012, 0.012, 0.16, M.chrome, [cxBar + 0.12, 1.5, pz], [0, 0, Math.PI / 2 - 0.8], g, 6);
      b.sphere(0.022, [M.redPlastic, M.bluePlastic, M.blackPlastic, M.yellowPlastic][i % 4], [cxBar + 0.05, 1.55, pz], g, 8);
    }
    b.box(0.3, 0.2, 4.2, M.steelDark, [cxBar + 0.2, 1.24, -2], [0, 0, 0], g);
    // stools
    const stool = (sx, sz) => {
      b.cyl(0.04, 0.04, 0.75, M.chrome, [sx, 0.375, sz], [0, 0, 0], g, 10);
      b.cyl(0.2, 0.22, 0.03, M.chrome, [sx, 0.02, sz], [0, 0, 0], g, 14);
      b.cyl(0.19, 0.19, 0.08, M.leather, [sx, 0.79, sz], [0, 0, 0], g, 16);
      b.torus(0.2, 0.012, M.chrome, [sx, 0.3, sz], [Math.PI / 2, 0, 0], g, 6, 16);
      addCollider(sx, sz, 0.45, 0.45);
    };
    for (let i = 0; i < 10; i++) stool(cxBar - 1.0, -7.4 + i * 1.2);
    // high-top tables
    for (const tx of [14.5, 18.5, 22]) for (const tz of [-6.5, -2.5, 1.5]) {
      b.cyl(0.05, 0.05, 1.05, M.chrome, [tx, 0.525, tz], [0, 0, 0], g, 10);
      b.cyl(0.3, 0.32, 0.03, M.steelDark, [tx, 0.02, tz], [0, 0, 0], g, 14);
      b.cyl(0.42, 0.42, 0.05, M.wood, [tx, 1.07, tz], [0, 0, 0], g, 20);
      addCollider(tx, tz, 0.9, 0.9);
      for (const a of [0.6, 2.7, 4.8]) stool(tx + Math.cos(a) * 0.72, tz + Math.sin(a) * 0.72);
      // glasses
      b.cyl(0.035, 0.03, 0.14, M.bottleAmber, [tx + 0.12, 1.16, tz + 0.1], [0, 0, 0], g, 10);
      b.cyl(0.035, 0.03, 0.14, M.bottleClear, [tx - 0.15, 1.16, tz - 0.08], [0, 0, 0], g, 10);
    }
    // pendants above the counter
    for (let i = 0; i < 5; i++) {
      const pz = -7 + i * 2.5;
      b.cyl(0.006, 0.006, 2.4, M.blackMatte, [cxBar, 4.2, pz], [0, 0, 0], g, 6);
      b.cyl(0.12, 0.2, 0.25, M.steelDark, [cxBar, 2.95, pz], [0, 0, 0], g, 14);
      b.sphere(0.05, glowMat(0xffd9a0, 3), [cxBar, 2.9, pz], g, 8);
    }
    // big screen wall on the front wall of the bar
    b.box(6.4, 3.5, 0.15, M.blackPlastic, [19, 3.2, 7.75], [0, 0, 0], g);
    for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) {
      this.screen(g, 'tv', 2.0, 1.12, [16.9 + c * 2.1, 2.55 + r * 1.2, 7.66], [0, Math.PI, 0], 480, 270, (r + c) % 2);
    }
    const watch = neonText('WATCH', { color: '#ffd23f', height: 0.5, intensity: 2.2, backing: false, letterSpacing: 14 });
    watch.position.set(19, 5.2, 7.6); watch.rotation.y = Math.PI; g.add(watch);
    // booths along the front wall right of the screen wall
    for (let i = 0; i < 2; i++) {
      const bx = 24 + i * 2.6;
      b.box(2.2, 0.45, 0.6, M.leather, [bx, 0.45, 7.4], [0, 0, 0], g);
      b.box(2.2, 1.1, 0.15, M.leather, [bx, 1.0, 7.75], [0, 0, 0], g);
      b.box(1.6, 0.05, 0.9, M.wood, [bx, 0.78, 6.4], [0, 0, 0], g);
      b.box(0.1, 0.75, 0.1, M.steelDark, [bx, 0.38, 6.4], [0, 0, 0], g);
      addCollider(bx, 7.0, 2.3, 1.9);
    }
    this.glow(g, cxBar - 1.2, -2, 4, 0xff8a3a, 0.18);
    rec.group = g;
    rec.volume = interactionVolume(cxBar - 0.4, 1.0, -2, 1.2, 2.0, 12, 0, { kind: 'bar', label: 'Order at the bar', cost: 0, station: rec });
    g.add(rec.volume);
    this.stations.push(rec);
    return rec;
  }

  // Racing bank header sign
  bankHeader(x, z, rotY, title, color, width) {
    const b = this.b, g = this.group(x, z, rotY);
    b.box(width, 0.7, 0.3, M.blackPlastic, [0, 2.9, 0], [0, 0, 0], g);
    for (const px of [-width / 2 + 0.3, width / 2 - 0.3]) b.box(0.12, 2.9, 0.12, M.steelDark, [px, 1.45, 0], [0, 0, 0], g);
    const n = neonText(title, { color, height: 0.45, intensity: 2.4, backing: false, letterSpacing: 8 });
    n.position.set(0, 2.9, 0.17); g.add(n);
    const n2 = n.clone(); n2.rotation.y = Math.PI; n2.position.z = -0.17; g.add(n2);
    new BulbChaser(lineBulbs([-width / 2, 3.32, 0.16], [width / 2, 3.32, 0.16], Math.round(width / 0.2)), { color: 0xffd28a, mode: 'chase', speed: 8, parent: g, radius: 0.025 });
    const pl = new THREE.PointLight(new THREE.Color(color).lerp(new THREE.Color(0xfff2e0), 0.75), 30, 16, 2); pl.position.set(0, 2.4, 0); pl.userData.tier = 2; g.add(pl);
    (this.extraLights ||= []).push(pl);
  }
}
