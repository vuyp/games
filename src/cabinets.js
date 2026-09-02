// Arcade cabinet factory: uprights, sit-down racers, light-gun booths, rhythm/dance machines, pinball.
import * as THREE from 'three';
import { M, emissive, glowMat } from './materials.js';
import { marqueeTexture, sideArtTexture, radialGlowTexture, makeCanvas, toTexture, mulberry32 } from './textures.js';
import { addCollider, interactionVolume, updatables } from './world.js';
import { ledStrip } from './neon.js';

// Game catalogue. `play` names the mini-game implementation, `screen` the attract animation.
export const GAMES = {
  galaxy:  { title: 'GALAXY DEFENDER', screen: 'galaxy', variant: 0, type: 'upright', seed: 2, play: 'shooter', cost: 3, body: 'cabinetBlue',   accent: 0x22e5ff, hue: 0x2fb0ff },
  raiders: { title: 'STAR RAIDERS',    screen: 'galaxy', variant: 1, type: 'upright', seed: 4, play: 'shooter', cost: 3, body: 'cabinetPurple', accent: 0xffd400, hue: 0xff3cac },
  breaker: { title: 'NEON BREAKER',    screen: 'breaker', variant: 0, type: 'upright', seed: 0, play: 'breakout', cost: 2, body: 'cabinet',     accent: 0xff2d95, hue: 0xff2d95 },
  brawl:   { title: 'STREET BRAWLERS II', screen: 'brawl', variant: 0, type: 'upright', seed: 5, play: 'brawl', cost: 3, body: 'cabinetRed',   accent: 0xffd400, hue: 0xff7a1c },
  zombie:  { title: 'ZOMBIE ALLEY',    screen: 'zombie', variant: 0, type: 'deluxe', seed: 3, play: 'gun', cost: 4, body: 'cabinetGreen',      accent: 0x3dff7a, hue: 0x3dff7a },
  beat:    { title: 'BEAT RUSH',       screen: 'beat', variant: 0, type: 'rhythm', seed: 3, play: 'rhythm', cost: 3, body: 'cabinetWhite',     accent: 0xff2d95, hue: 0xb46bff },
  dance:   { title: 'DANCE FEVER',     screen: 'dance', variant: 0, type: 'dance', seed: 0, play: 'rhythm', cost: 3, body: 'cabinetPurple',    accent: 0x22e5ff, hue: 0xff3cac },
  turbo:   { title: 'TURBO DRIFT GP',  screen: 'racer', variant: 0, type: 'racer', seed: 1, play: 'racer', cost: 4, body: 'cabinetRed',        accent: 0xffd400, hue: 0xff5a1f },
  nitro:   { title: 'NITRO RUSH',      screen: 'racer', variant: 1, type: 'racer', seed: 2, play: 'racer', cost: 4, body: 'cabinetBlue',       accent: 0x22e5ff, hue: 0x2fb0ff },
  cosmic:  { title: 'COSMIC PINBALL',  screen: 'pinball', variant: 0, type: 'pinball', seed: 4, play: 'pinball', cost: 2, body: 'cabinetPurple', accent: 0x22e5ff, hue: 0x8a3dff },
  dragon:  { title: 'DRAGON FIRE',     screen: 'pinball', variant: 1, type: 'pinball', seed: 1, play: 'pinball', cost: 2, body: 'cabinetRed', accent: 0xffd400, hue: 0xff6a00 },
};

const SCREEN_HUES = {};

function pinballPlayfieldTexture(seed) {
  const w = 256, h = 512;
  const { canvas, ctx } = makeCanvas(w, h);
  const rnd = mulberry32(300 + seed);
  const pal = seed % 2 ? ['#1a0030', '#ff2d95', '#22e5ff', '#ffd400'] : ['#0a0a3a', '#ff6a00', '#ffd400', '#3dff7a'];
  ctx.fillStyle = pal[0]; ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 24; i++) {
    ctx.strokeStyle = pal[1 + (i % 3)]; ctx.lineWidth = 2 + rnd() * 3; ctx.globalAlpha = 0.6;
    ctx.beginPath(); ctx.arc(w / 2 + (rnd() - 0.5) * 100, rnd() * h, 20 + rnd() * 90, rnd() * 6, rnd() * 6); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // lanes
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(30, 60); ctx.quadraticCurveTo(30, 20, 80, 20); ctx.lineTo(180, 20); ctx.quadraticCurveTo(226, 20, 226, 60); ctx.lineTo(226, 140); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(20, 380); ctx.lineTo(95, 470); ctx.moveTo(236, 380); ctx.lineTo(161, 470); ctx.stroke();
  for (let i = 0; i < 14; i++) { ctx.fillStyle = i % 2 ? pal[2] : pal[3]; ctx.beginPath(); ctx.arc(60 + (i % 7) * 22, 200 + Math.floor(i / 7) * 30, 5, 0, Math.PI * 2); ctx.fill(); }
  ctx.font = '26px "Bungee", Impact, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = pal[3];
  ctx.fillText(seed % 2 ? 'DRAGON' : 'COSMIC', w / 2, 330);
  return toTexture(canvas, { wrap: false });
}

// Geometry helper for planes lying on a profile segment (in the cabinet's dz/y side plane).
function segFrame(p1, p2, D) {
  const dx = p2[0] - p1[0], dy = p2[1] - p1[1];
  const len = Math.hypot(dx, dy);
  const dir = [dx / len, dy / len];
  const n = [-dir[1], dir[0]]; // outward normal (dz, y)
  const mid = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2];
  return {
    len, n, dir, mid,
    // position (x, y, z) at param v along the segment (0 at p1) offset by `off` along the normal
    at: (x, v, off) => [x, p1[1] + dir[1] * v * len + n[1] * off, p1[0] + dir[0] * v * len + n[0] * off - D / 2],
    rotPlane: Math.atan2(-n[1], n[0]),   // rotation.x for a PlaneGeometry to face along n
    rotCyl: Math.atan2(n[0], n[1]),      // rotation.x for a CylinderGeometry axis to align with n
  };
}

export class CabinetFactory {
  constructor(scene, batcher, screens) {
    this.scene = scene;
    this.b = batcher;
    this.screens = screens;
    this.marqueeMats = {};
    this.sideMats = {};
    this.glowMats = {};
    this.playfieldMats = {};
    this.glowTex = radialGlowTexture('rgba(255,255,255,1)', 'rgba(255,255,255,0)', 128);
    this.cabinets = [];
    this.shadowMat = new THREE.MeshBasicMaterial({ map: this.glowTex, color: 0x000000, transparent: true, opacity: 0.7, depthWrite: false });
    this.shadowMat.userData.noShadow = true; this.shadowMat.userData.noReceive = true;
    // subtle CRT scanlines multiplied over the screens
    const { canvas, ctx } = makeCanvas(2, 4);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 2, 4); ctx.fillStyle = '#c8c8c8'; ctx.fillRect(0, 3, 2, 1);
    const scan = toTexture(canvas, { repeat: [1, 140], srgb: false, filter: false });
    scan.magFilter = THREE.LinearFilter; scan.minFilter = THREE.LinearMipmapLinearFilter;
    this.scanMat = new THREE.MeshBasicMaterial({ map: scan, transparent: true, blending: THREE.MultiplyBlending, depthWrite: false });
    this.scanMat.userData.noShadow = true; this.scanMat.userData.noReceive = true;
  }
  contactShadow(g, w, d, cz = 0) {
    this.b.plane(w * 1.7, d * 1.5, this.shadowMat, [0, 0.007, cz], [-Math.PI / 2, 0, 0], g);
  }
  scanlines(g, w, h, pos, rot) {
    this.b.plane(w, h, this.scanMat, pos, rot, g);
  }
  _marquee(game, id) {
    if (!this.marqueeMats[id]) {
      const m = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: marqueeTexture(game.title, game.seed), emissiveIntensity: 0.95, roughness: 0.5 });
      m.userData.noShadow = true;
      this.marqueeMats[id] = m;
    }
    return this.marqueeMats[id];
  }
  _side(game, id) {
    if (!this.sideMats[id]) this.sideMats[id] = new THREE.MeshStandardMaterial({ map: sideArtTexture(game.title, game.seed), roughness: 0.45, metalness: 0.05 });
    return this.sideMats[id];
  }
  _glow(hue) {
    if (!this.glowMats[hue]) {
      this.glowMats[hue] = new THREE.MeshBasicMaterial({ map: this.glowTex, color: hue, transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
      this.glowMats[hue].userData.noShadow = true;
      this.glowMats[hue].userData.noReceive = true;
    }
    return this.glowMats[hue];
  }
  floorGlow(g, x, z, size, hue, opacity) {
    const mat = this._glow(hue);
    this.b.plane(size, size, mat, [x, 0.012, z], [-Math.PI / 2, 0, 0], g);
  }
  accentMat(hex) {
    const key = `acc${hex}`;
    if (!this.glowMats[key]) this.glowMats[key] = new THREE.MeshStandardMaterial({ color: hex, roughness: 0.35, metalness: 0.05 });
    return this.glowMats[key];
  }

  place(id, x, z, rotY = 0, opts = {}) {
    const game = GAMES[id];
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = rotY;
    this.scene.add(g);
    g.updateMatrixWorld(true);
    const rec = { id, game, group: g, x, z, rotY, screenMesh: null, screenSize: null, seatPose: null };
    const type = game.type;
    if (type === 'upright') this.upright(g, game, id, rec);
    else if (type === 'racer') this.racer(g, game, id, rec);
    else if (type === 'deluxe') this.deluxe(g, game, id, rec);
    else if (type === 'rhythm') this.rhythm(g, game, id, rec);
    else if (type === 'dance') this.dance(g, game, id, rec);
    else if (type === 'pinball') this.pinball(g, game, id, rec);
    rec.volume.userData.interact = { kind: 'cabinet', label: `Play ${game.title}`, cost: game.cost, cabinet: rec };
    this.cabinets.push(rec);
    return rec;
  }

  // Small Power Card reader found on every game.
  cardReader(g, pos, rot) {
    const b = this.b;
    const m = new THREE.Matrix4();
    const holder = new THREE.Group();
    holder.position.set(pos[0], pos[1], pos[2]);
    holder.rotation.set(rot[0], rot[1], rot[2]);
    g.add(holder);
    holder.updateMatrixWorld(true);
    b.box(0.085, 0.13, 0.05, M.blackPlastic, [0, 0.065, 0], [0, 0, 0], holder);
    b.plane(0.06, 0.035, emissive(0x26e5ff, 1.6), [0, 0.09, 0.0255], [0, 0, 0], holder);
    b.plane(0.06, 0.012, emissive(0xffb02e, 1.2), [0, 0.045, 0.0255], [0, 0, 0], holder);
    b.sphere(0.005, emissive(0xff2020, 2.5), [0.03, 0.115, 0.0255], holder, 6);
    void m;
  }

  screenPlane(g, w, h, pos, rot, entry) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), entry.material);
    mesh.position.set(pos[0], pos[1], pos[2]);
    mesh.rotation.set(rot[0], rot[1], rot[2]);
    g.add(mesh);
    return mesh;
  }

  upright(g, game, id, rec) {
    const b = this.b;
    const W = 0.68, D = 0.85, H = 1.9;
    const P = [[0, 0], [0, H], [0.62, H], [0.66, 1.66], [0.50, 1.60], [0.58, 1.12], [0.85, 1.05], [0.85, 0.92], [0.72, 0.90], [0.72, 0.12], [0.62, 0.12], [0.62, 0]];
    const shape = new THREE.Shape(P.map(p => new THREE.Vector2(p[0], p[1])));
    const body = new THREE.ExtrudeGeometry(shape, { depth: W, bevelEnabled: false });
    body.rotateY(-Math.PI / 2);
    body.translate(W / 2, 0, -D / 2);
    b.geo(body, M[game.body] || M.cabinet, [0, 0, 0], [0, 0, 0], g);
    // side art
    const side = this._side(game, id);
    b.plane(0.58, 1.34, side, [W / 2 + 0.002, 0.86, 0.30 - D / 2], [0, Math.PI / 2, 0], g);
    b.plane(0.58, 1.34, side, [-W / 2 - 0.002, 0.86, 0.30 - D / 2], [0, -Math.PI / 2, 0], g);
    // T-molding strips along the front profile edges
    const acc = this.accentMat(game.accent);
    for (let i = 2; i < P.length - 1; i++) {
      const f = segFrame(P[i], P[i + 1], D);
      const c = f.at(0, 0.5, 0);
      for (const sx of [-1, 1]) b.box(0.012, f.len + 0.006, 0.012, acc, [sx * (W / 2), c[1], c[2]], [-Math.atan2(f.dir[0], -f.dir[1]) + Math.PI, 0, 0], g);
    }
    // marquee
    const fm = segFrame(P[2], P[3], D);
    const mq = fm.at(0, 0.5, 0.004);
    b.plane(0.62, 0.21, this._marquee(game, id), mq, [fm.rotPlane, 0, 0], g);
    b.box(0.66, 0.02, 0.05, M.blackPlastic, fm.at(0, 0.02, 0.01), [fm.rotPlane, 0, 0], g);
    b.box(0.66, 0.02, 0.05, M.blackPlastic, fm.at(0, 0.98, 0.01), [fm.rotPlane, 0, 0], g);
    // speaker grilles under the marquee
    const fu = segFrame(P[3], P[4], D);
    b.box(0.12, 0.05, 0.005, M.blackMatte, fu.at(-0.2, 0.5, 0.004), [fu.rotPlane, 0, 0], g);
    b.box(0.12, 0.05, 0.005, M.blackMatte, fu.at(0.2, 0.5, 0.004), [fu.rotPlane, 0, 0], g);
    // screen assembly
    const fs = segFrame(P[4], P[5], D);
    b.plane(0.64, fs.len, M.blackPlastic, fs.at(0, 0.5, 0.003), [fs.rotPlane, 0, 0], g);
    const entry = this.screens.get(game.screen, game.variant, 320, 240);
    rec.screenMesh = this.screenPlane(g, 0.52, 0.39, fs.at(0, 0.5, 0.008), [fs.rotPlane, 0, 0], entry);
    rec.screenEntry = entry;
    rec.screenSize = [320, 240];
    this.scanlines(g, 0.52, 0.39, fs.at(0, 0.5, 0.011), [fs.rotPlane, 0, 0]);
    b.plane(0.60, fs.len - 0.02, M.screenGlass, fs.at(0, 0.5, 0.014), [fs.rotPlane, 0, 0], g);
    // control panel
    const fc = segFrame(P[5], P[6], D);
    b.plane(0.66, fc.len, M.blackPlastic, fc.at(0, 0.5, 0.003), [fc.rotPlane, 0, 0], g);
    // joystick
    b.cyl(0.032, 0.036, 0.012, M.blackMatte, fc.at(-0.19, 0.5, 0.008), [fc.rotCyl, 0, 0], g, 12);
    b.cyl(0.007, 0.007, 0.075, M.chrome, fc.at(-0.19, 0.5, 0.045), [fc.rotCyl, 0, 0], g, 8);
    b.sphere(0.022, game.seed % 2 ? M.redPlastic : M.bluePlastic, fc.at(-0.19, 0.5, 0.09), g, 10);
    // buttons
    const cols = [M.redPlastic, M.yellowPlastic, M.greenPlastic, M.bluePlastic, M.whitePlastic, M.redPlastic];
    let k = 0;
    for (const v of [0.34, 0.66]) for (const x of [0.02, 0.10, 0.18]) {
      b.cyl(0.018, 0.018, 0.006, M.blackMatte, fc.at(x, v, 0.004), [fc.rotCyl, 0, 0], g, 12);
      b.cyl(0.014, 0.015, 0.012, cols[k++ % cols.length], fc.at(x, v, 0.012), [fc.rotCyl, 0, 0], g, 12);
    }
    // 1P/2P start buttons on the panel lip
    const fl = segFrame(P[6], P[7], D);
    for (const x of [-0.12, 0.12]) {
      b.cyl(0.012, 0.012, 0.01, x < 0 ? M.redPlastic : M.bluePlastic, fl.at(x, 0.5, 0.006), [fl.rotCyl, 0, 0], g, 10);
    }
    // card reader on the right of the control panel
    const cr = fc.at(0.27, 0.42, 0.004);
    this.cardReader(g, cr, [fc.rotPlane, 0, 0]);
    // coin door
    const ff = segFrame(P[8], P[9], D);
    b.box(0.26, 0.30, 0.012, M.steelDark, ff.at(0, 0.45, 0.006), [0, 0, 0], g);
    b.box(0.04, 0.05, 0.004, M.blackMatte, ff.at(-0.06, 0.4, 0.013), [0, 0, 0], g);
    b.box(0.04, 0.05, 0.004, M.blackMatte, ff.at(0.06, 0.4, 0.013), [0, 0, 0], g);
    b.box(0.03, 0.008, 0.004, emissive(0xffb02e, 2.2), ff.at(-0.06, 0.4, 0.016), [0, 0, 0], g);
    b.box(0.03, 0.008, 0.004, emissive(0xffb02e, 2.2), ff.at(0.06, 0.4, 0.016), [0, 0, 0], g);
    // kick plate
    b.box(W, 0.12, 0.01, M.steel, [0, 0.06, 0.62 - D / 2 + 0.005], [0, 0, 0], g);
    // floor glow in front, matching the screen hue
    this.floorGlow(g, 0, 0.75, 1.9, game.hue);
    this.contactShadow(g, W, D);
    addCollider(g.position.x, g.position.z, W + 0.04, D, g.rotation.y);
    rec.volume = interactionVolume(0, H / 2, 0, W, H, D, 0, {});
    g.add(rec.volume);
    rec.standPose = { local: [0, 1.62, 1.05], look: [0, 1.36, 0.02] };
  }

  racer(g, game, id, rec) {
    const b = this.b;
    const W = 1.15, D = 2.0;
    const body = M[game.body] || M.cabinetRed;
    b.box(W, 0.06, D, M.steelDark, [0, 0.03, 0], [0, 0, 0], g);
    // screen housing
    b.box(1.1, 1.55, 0.55, body, [0, 0.06 + 0.775, -0.72], [0, 0, 0], g);
    b.box(1.1, 0.35, 0.42, M.blackPlastic, [0, 1.61 + 0.175, -0.72], [0, 0, 0], g);
    b.plane(1.04, 0.3, this._marquee(game, id), [0, 1.785, -0.72 + 0.211], [0, 0, 0], g);
    b.plane(1.0, 0.72, M.blackPlastic, [0, 1.18, -0.44], [-0.1, 0, 0], g);
    const entry = this.screens.get(game.screen, game.variant, 480, 270);
    rec.screenMesh = this.screenPlane(g, 0.94, 0.53, [0, 1.18, -0.434], [-0.1, 0, 0], entry);
    rec.screenEntry = entry;
    rec.screenSize = [480, 270];
    this.scanlines(g, 0.94, 0.53, [0, 1.18, -0.431], [-0.1, 0, 0]);
    b.plane(0.98, 0.62, M.screenGlass, [0, 1.18, -0.428], [-0.1, 0, 0], g);
    // led strips framing the housing
    const strip = glowMat(game.accent, 2.5);
    b.box(0.03, 1.5, 0.03, strip, [-0.56, 0.86, -0.445], [0, 0, 0], g);
    b.box(0.03, 1.5, 0.03, strip, [0.56, 0.86, -0.445], [0, 0, 0], g);
    // side art
    const side = this._side(game, id);
    b.plane(0.5, 1.3, side, [0.552, 0.9, -0.72], [0, Math.PI / 2, 0], g);
    b.plane(0.5, 1.3, side, [-0.552, 0.9, -0.72], [0, -Math.PI / 2, 0], g);
    // speakers on top corners
    b.box(0.2, 0.2, 0.2, M.blackMatte, [-0.45, 2.05, -0.72], [0, 0, 0], g);
    b.box(0.2, 0.2, 0.2, M.blackMatte, [0.45, 2.05, -0.72], [0, 0, 0], g);
    // dash
    b.box(0.9, 0.36, 0.45, M.blackPlastic, [0, 0.72, -0.25], [0, 0, 0], g);
    b.box(0.9, 0.04, 0.1, M.chrome, [0, 0.9, -0.03], [0, 0, 0], g);
    // steering wheel
    b.cyl(0.025, 0.025, 0.28, M.steelDark, [0, 0.92, -0.14], [Math.PI / 2 - 0.6, 0, 0], g, 10);
    b.torus(0.17, 0.022, M.leather, [0, 1.02, 0.02], [-0.6, 0, 0], g, 10, 28);
    b.cyl(0.05, 0.05, 0.03, M.blackPlastic, [0, 1.02, 0.02], [Math.PI / 2 - 0.6, 0, 0], g, 12);
    for (const a of [0, 2.1, -2.1]) {
      b.box(0.03, 0.3, 0.012, M.blackPlastic, [Math.sin(a) * 0.08, 1.02 + Math.cos(a) * 0.08 * Math.cos(0.6), 0.02 - Math.cos(a) * 0.08 * Math.sin(0.6)], [-0.6, 0, a], g);
    }
    // shifter, start button, card reader
    b.cyl(0.01, 0.01, 0.12, M.chrome, [0.32, 0.95, -0.12], [0, 0, 0], g, 8);
    b.sphere(0.025, M.redPlastic, [0.32, 1.02, -0.12], g, 10);
    b.cyl(0.02, 0.02, 0.012, M.greenPlastic, [-0.3, 0.905, -0.12], [0, 0, 0], g, 12);
    this.cardReader(g, [0.42, 0.9, -0.2], [-0.3, 0, 0]);
    // pedals
    b.box(0.09, 0.14, 0.02, M.steelDark, [-0.12, 0.13, -0.2], [-0.5, 0, 0], g);
    b.box(0.09, 0.14, 0.02, M.steelDark, [0.12, 0.13, -0.2], [-0.5, 0, 0], g);
    // seat
    const seatMat = game.seed % 2 ? M.fabric : M.leather;
    b.box(0.42, 0.42, 0.42, M.blackPlastic, [0, 0.27, 0.5], [0, 0, 0], g);
    b.box(0.56, 0.13, 0.52, seatMat, [0, 0.55, 0.48], [0, 0, 0], g);
    b.box(0.56, 0.78, 0.15, seatMat, [0, 1.0, 0.76], [-0.16, 0, 0], g);
    b.box(0.1, 0.7, 0.16, body, [-0.3, 1.0, 0.75], [-0.16, 0, 0], g);
    b.box(0.1, 0.7, 0.16, body, [0.3, 1.0, 0.75], [-0.16, 0, 0], g);
    b.box(0.3, 0.2, 0.13, seatMat, [0, 1.5, 0.84], [-0.16, 0, 0], g);
    b.box(0.1, 0.1, 0.5, seatMat, [-0.27, 0.66, 0.48], [0, 0, 0], g);
    b.box(0.1, 0.1, 0.5, seatMat, [0.27, 0.66, 0.48], [0, 0, 0], g);
    this.floorGlow(g, 0, 0.1, 1.6, game.hue);
    this.contactShadow(g, W, D);
    addCollider(g.position.x, g.position.z, W + 0.05, D, g.rotation.y);
    rec.volume = interactionVolume(0, 1.05, 0, W, 2.1, D, 0, {});
    g.add(rec.volume);
    rec.standPose = { local: [0, 1.28, 0.42], look: [0, 1.18, -0.44] };
  }

  deluxe(g, game, id, rec) {
    const b = this.b;
    const body = M[game.body] || M.cabinet;
    b.box(1.5, 2.2, 1.2, body, [0, 1.1, -0.2], [0, 0, 0], g);
    b.box(1.6, 0.34, 1.3, M.blackPlastic, [0, 2.37, -0.2], [0, 0, 0], g);
    b.plane(1.5, 0.3, this._marquee(game, id), [0, 2.37, 0.455], [0, 0, 0], g);
    const strip = glowMat(game.accent, 2.2);
    b.box(0.03, 2.2, 0.03, strip, [-0.76, 1.1, 0.4], [0, 0, 0], g);
    b.box(0.03, 2.2, 0.03, strip, [0.76, 1.1, 0.4], [0, 0, 0], g);
    b.box(1.55, 0.03, 0.03, strip, [0, 2.19, 0.4], [0, 0, 0], g);
    b.plane(1.32, 0.82, M.blackPlastic, [0, 1.42, 0.403], [0, 0, 0], g);
    const entry = this.screens.get(game.screen, game.variant, 480, 270);
    rec.screenMesh = this.screenPlane(g, 1.24, 0.7, [0, 1.42, 0.408], [0, 0, 0], entry);
    rec.screenEntry = entry;
    rec.screenSize = [480, 270];
    this.scanlines(g, 1.24, 0.7, [0, 1.42, 0.411], [0, 0, 0]);
    b.plane(1.3, 0.78, M.screenGlass, [0, 1.42, 0.414], [0, 0, 0], g);
    // speakers
    b.box(0.3, 0.2, 0.02, M.blackMatte, [-0.5, 1.95, 0.405], [0, 0, 0], g);
    b.box(0.3, 0.2, 0.02, M.blackMatte, [0.5, 1.95, 0.405], [0, 0, 0], g);
    // side art
    const side = this._side(game, id);
    b.plane(1.0, 1.6, side, [0.752, 1.1, -0.2], [0, Math.PI / 2, 0], g);
    b.plane(1.0, 1.6, side, [-0.752, 1.1, -0.2], [0, -Math.PI / 2, 0], g);
    // control ledge with guns
    b.box(1.5, 0.16, 0.4, M.blackPlastic, [0, 0.9, 0.58], [0, 0, 0], g);
    b.box(1.5, 0.5, 0.36, body, [0, 0.57, 0.58], [0, 0, 0], g);
    for (const x of [-0.42, 0.42]) {
      b.cyl(0.03, 0.03, 0.12, M.steelDark, [x, 1.04, 0.62], [0, 0, 0], g, 10);
      const gunMat = x < 0 ? M.bluePlastic : M.redPlastic;
      b.box(0.035, 0.11, 0.045, gunMat, [x, 1.14, 0.64], [0.3, 0, 0], g);
      b.cyl(0.016, 0.02, 0.2, gunMat, [x, 1.21, 0.58], [Math.PI / 2 - 0.4, 0, 0], g, 10);
      b.cyl(0.006, 0.006, 0.22, M.blackMatte, [x, 1.21, 0.58], [Math.PI / 2 - 0.4, 0, 0], g, 6);
      b.cyl(0.018, 0.018, 0.012, M.greenPlastic, [x + (x < 0 ? 0.18 : -0.18), 0.985, 0.5], [0, 0, 0], g, 12);
    }
    this.cardReader(g, [0, 0.98, 0.5], [-0.2, 0, 0]);
    this.floorGlow(g, 0, 1.2, 2.6, game.hue);
    this.contactShadow(g, 1.6, 1.6, -0.05);
    addCollider(g.position.x, g.position.z, 1.6, 1.6, g.rotation.y);
    rec.volume = interactionVolume(0, 1.2, -0.05, 1.6, 2.5, 1.5, 0, {});
    g.add(rec.volume);
    rec.standPose = { local: [0, 1.65, 1.55], look: [0, 1.42, 0.4] };
  }

  rhythm(g, game, id, rec) {
    const b = this.b;
    const body = M[game.body] || M.cabinetWhite;
    b.box(1.0, 2.3, 0.8, body, [0, 1.15, -0.1], [0, 0, 0], g);
    b.box(1.06, 0.3, 0.86, M.blackPlastic, [0, 2.15, -0.1], [0, 0, 0], g);
    b.plane(1.0, 0.26, this._marquee(game, id), [0, 2.15, 0.334], [0, 0, 0], g);
    b.plane(0.9, 0.7, M.blackPlastic, [0, 1.5, 0.303], [-0.12, 0, 0], g);
    const entry = this.screens.get(game.screen, game.variant, 320, 240);
    rec.screenMesh = this.screenPlane(g, 0.8, 0.6, [0, 1.5, 0.31], [-0.12, 0, 0], entry);
    rec.screenEntry = entry;
    rec.screenSize = [320, 240];
    this.scanlines(g, 0.8, 0.6, [0, 1.5, 0.314], [-0.12, 0, 0]);
    b.plane(0.88, 0.68, M.screenGlass, [0, 1.5, 0.318], [-0.12, 0, 0], g);
    // speaker towers with LED strips
    for (const x of [-0.64, 0.64]) {
      b.box(0.26, 1.2, 0.5, M.blackPlastic, [x, 1.5, -0.1], [0, 0, 0], g);
      b.cyl(0.09, 0.09, 0.02, M.blackMatte, [x, 1.8, 0.155], [Math.PI / 2, 0, 0], g, 16);
      b.cyl(0.09, 0.09, 0.02, M.blackMatte, [x, 1.25, 0.155], [Math.PI / 2, 0, 0], g, 16);
      b.box(0.03, 1.1, 0.03, glowMat(game.accent, 2.4), [x + (x < 0 ? -0.12 : 0.12), 1.5, 0.15], [0, 0, 0], g);
      b.box(0.03, 1.1, 0.03, glowMat(0x22e5ff, 2.4), [x + (x < 0 ? 0.12 : -0.12), 1.5, 0.15], [0, 0, 0], g);
    }
    // drum pad shelf
    b.box(1.0, 0.14, 0.45, M.blackPlastic, [0, 0.93, 0.5], [0, 0, 0], g);
    b.box(1.0, 0.85, 0.45, body, [0, 0.43, 0.5], [0, 0, 0], g);
    const padCols = [M.redPlastic, M.bluePlastic, M.yellowPlastic, M.greenPlastic];
    padCols.forEach((mat, i) => {
      b.cyl(0.095, 0.1, 0.04, M.blackMatte, [-0.36 + i * 0.24, 1.02, 0.5], [0, 0, 0], g, 20);
      b.cyl(0.08, 0.08, 0.03, mat, [-0.36 + i * 0.24, 1.045, 0.5], [0, 0, 0], g, 20);
    });
    this.cardReader(g, [0.4, 1.0, 0.66], [-0.3, 0, 0]);
    this.floorGlow(g, 0, 1.1, 2.0, game.hue);
    this.contactShadow(g, 1.6, 1.3, 0.1);
    addCollider(g.position.x, g.position.z, 1.6, 1.3, g.rotation.y);
    rec.volume = interactionVolume(0, 1.15, 0.1, 1.6, 2.3, 1.4, 0, {});
    g.add(rec.volume);
    rec.standPose = { local: [0, 1.62, 1.3], look: [0, 1.5, 0.3] };
  }

  dance(g, game, id, rec) {
    const b = this.b;
    const body = M[game.body] || M.cabinetPurple;
    b.box(1.4, 2.4, 0.7, body, [0, 1.2, -0.75], [0, 0, 0], g);
    b.box(1.46, 0.32, 0.76, M.blackPlastic, [0, 2.24, -0.75], [0, 0, 0], g);
    b.plane(1.4, 0.28, this._marquee(game, id), [0, 2.24, -0.369], [0, 0, 0], g);
    b.plane(1.15, 0.85, M.blackPlastic, [0, 1.55, -0.397], [0, 0, 0], g);
    const entry = this.screens.get(game.screen, game.variant, 320, 240);
    rec.screenMesh = this.screenPlane(g, 1.0, 0.75, [0, 1.55, -0.392], [0, 0, 0], entry);
    rec.screenEntry = entry;
    rec.screenSize = [320, 240];
    this.scanlines(g, 1.0, 0.75, [0, 1.55, -0.389], [0, 0, 0]);
    b.plane(1.12, 0.82, M.screenGlass, [0, 1.55, -0.386], [0, 0, 0], g);
    for (const x of [-0.5, 0.5]) {
      b.cyl(0.14, 0.14, 0.03, M.blackMatte, [x, 0.75, -0.39], [Math.PI / 2, 0, 0], g, 20);
      b.torus(0.15, 0.015, glowMat(game.accent, 2.6), [x, 0.75, -0.385], [0, 0, 0], g, 8, 24);
    }
    b.box(1.4, 0.04, 0.04, glowMat(0xff3cac, 2.4), [0, 2.06, -0.38], [0, 0, 0], g);
    // platform with arrow panels (animated, so not batched)
    b.box(1.3, 0.14, 1.2, M.steelDark, [0, 0.07, 0.35], [0, 0, 0], g);
    rec.pads = [];
    const arrowPos = [[-0.4, 0.35], [0.4, 0.35], [0, -0.05], [0, 0.75]];
    arrowPos.forEach((p, i) => {
      const mat = new THREE.MeshStandardMaterial({ color: 0x0a0a10, emissive: [0xff2d95, 0x22e5ff, 0x3dff7a, 0xffd400][i], emissiveIntensity: 0.4, roughness: 0.4 });
      const pad = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.02, 0.34), mat);
      pad.position.set(p[0], 0.15, p[1]);
      g.add(pad);
      rec.pads.push(pad);
    });
    b.box(0.34, 0.02, 0.34, M.blackPlastic, [0, 0.15, 0.35], [0, 0, 0], g);
    updatables.push({ update: (dt, t) => { rec.pads.forEach((p, i) => { p.material.emissiveIntensity = (Math.floor(t * 4) % 4 === i) ? 2.4 : 0.35; }); } });
    // safety bar
    for (const x of [-0.6, 0.6]) b.cyl(0.02, 0.02, 0.85, M.chrome, [x, 0.56, 0.9], [0, 0, 0], g, 10);
    b.cyl(0.02, 0.02, 1.24, M.chrome, [0, 0.98, 0.9], [0, 0, Math.PI / 2], g, 10);
    this.cardReader(g, [0.62, 0.98, 0.9], [-0.4, 0, 0]);
    this.floorGlow(g, 0, 0.35, 2.4, game.hue);
    this.contactShadow(g, 1.45, 2.3, -0.2);
    addCollider(g.position.x, g.position.z, 1.45, 2.3, g.rotation.y);
    rec.volume = interactionVolume(0, 1.2, -0.2, 1.5, 2.5, 1.9, 0, {});
    g.add(rec.volume);
    rec.standPose = { local: [0, 1.62, 0.35], look: [0, 1.55, -0.39] };
  }

  pinball(g, game, id, rec) {
    const b = this.b;
    const body = M[game.body] || M.cabinetPurple;
    const tilt = 0.11;
    b.box(0.56, 0.34, 1.35, body, [0, 0.8, 0], [tilt, 0, 0], g);
    for (const x of [-0.24, 0.24]) for (const z of [-0.58, 0.58]) b.box(0.04, 0.68, 0.04, M.chrome, [x, 0.34, z], [0, 0, 0], g);
    const key = `pf${game.seed}`;
    if (!this.playfieldMats[key]) this.playfieldMats[key] = new THREE.MeshStandardMaterial({ map: pinballPlayfieldTexture(game.seed), roughness: 0.3, emissive: 0xffffff, emissiveMap: pinballPlayfieldTexture(game.seed), emissiveIntensity: 0.35 });
    b.plane(0.5, 1.27, this.playfieldMats[key], [0, 0.972, 0.0], [-Math.PI / 2 + tilt, 0, 0], g);
    b.plane(0.54, 1.3, M.screenGlass, [0, 1.06, 0.0], [-Math.PI / 2 + tilt, 0, 0], g);
    // bumpers, flippers, ball
    for (const [x, z] of [[-0.1, -0.3], [0.1, -0.3], [0, -0.15]]) {
      const y = 0.975 + (-z) * tilt;
      b.cyl(0.035, 0.035, 0.035, M.whitePlastic, [x, y + 0.017, z], [0, 0, 0], g, 14);
      b.cyl(0.03, 0.03, 0.008, emissive(game.accent, 2.0), [x, y + 0.04, z], [0, 0, 0], g, 14);
    }
    b.box(0.09, 0.015, 0.025, M.yellowPlastic, [-0.09, 0.975 - 0.5 * tilt + 0.01, 0.5], [0, -0.4, 0], g);
    b.box(0.09, 0.015, 0.025, M.yellowPlastic, [0.09, 0.975 - 0.5 * tilt + 0.01, 0.5], [0, 0.4, 0], g);
    b.sphere(0.014, M.chrome, [0.16 * Math.sin(game.seed), 0.975 + 0.014, 0.1], g, 10);
    // backbox
    b.box(0.58, 0.75, 0.28, body, [0, 1.5, -0.55], [0, 0, 0], g);
    const entry = this.screens.get(game.screen, game.variant, 320, 240);
    rec.screenMesh = this.screenPlane(g, 0.52, 0.6, [0, 1.5, -0.406], [0, 0, 0], entry);
    rec.screenEntry = entry;
    rec.screenSize = [320, 240];
    b.plane(0.54, 0.64, M.screenGlass, [0, 1.5, -0.402], [0, 0, 0], g);
    b.box(0.6, 0.05, 0.3, M.blackPlastic, [0, 1.9, -0.55], [0, 0, 0], g);
    // lockdown bar, plunger, flipper buttons
    b.box(0.6, 0.03, 0.07, M.chrome, [0, 0.905, 0.66], [0, 0, 0], g);
    b.cyl(0.012, 0.012, 0.14, M.chrome, [0.23, 0.9, 0.74], [Math.PI / 2, 0, 0], g, 8);
    b.sphere(0.022, M.redPlastic, [0.23, 0.9, 0.82], g, 10);
    b.cyl(0.014, 0.014, 0.02, M.redPlastic, [-0.29, 0.85, 0.5], [0, 0, Math.PI / 2], g, 10);
    b.cyl(0.014, 0.014, 0.02, M.redPlastic, [0.29, 0.85, 0.5], [0, 0, Math.PI / 2], g, 10);
    // coin door & card reader on the front
    b.box(0.22, 0.24, 0.012, M.steelDark, [0, 0.55, 0.6 + 0.5 * tilt * 0], [0, 0, 0], g);
    this.cardReader(g, [0.2, 0.62, 0.62], [0, 0, 0]);
    this.floorGlow(g, 0, 0.3, 1.5, game.hue, 0.2);
    this.contactShadow(g, 0.62, 1.45);
    addCollider(g.position.x, g.position.z, 0.62, 1.45, g.rotation.y);
    rec.volume = interactionVolume(0, 1.0, -0.1, 0.62, 2.0, 1.5, 0, {});
    g.add(rec.volume);
    rec.standPose = { local: [0, 1.62, 1.15], look: [0, 1.0, -0.2] };
  }
}
