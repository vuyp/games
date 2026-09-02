// Game sessions: cabinet mini-games, skee-ball, hoops, claw, prize wheel, prize counter, kiosk, bar.
import * as THREE from 'three';
import { M } from './materials.js';
import { ATTRACT } from './screens.js';
import { createMiniGame } from './minigames.js';
import { state, spend, addTickets, addChips, spendTickets, addPrize, save } from './state.js';
import { WHEEL_SEGMENTS } from './midway.js';

const PRIZES = [
  { name: 'Candy', cost: 100, emoji: '🍬' }, { name: 'Sticker Pack', cost: 150, emoji: '🌟' }, { name: 'Plush Keychain', cost: 250, emoji: '🧸' },
  { name: 'Light-Up Yo-Yo', cost: 600, emoji: '🪀' }, { name: 'Squishy Toy', cost: 900, emoji: '🐙' }, { name: 'Trucker Hat', cost: 1500, emoji: '🧢' },
  { name: 'Bluetooth Earbuds', cost: 3000, emoji: '🎧' }, { name: 'Giant Plush', cost: 4500, emoji: '🦄' }, { name: 'Lava Lamp', cost: 6000, emoji: '🔮' },
  { name: 'Wireless Speaker', cost: 12000, emoji: '🔊' }, { name: 'Drone', cost: 25000, emoji: '🚁' }, { name: 'Game Console', cost: 90000, emoji: '🎮' },
];
const DRINKS = ['a Blue Moon', 'a Mango Margarita', 'an Old Fashioned', 'a root beer float', 'a Shirley Temple', 'a basket of loaded fries', 'a Blackberry Mojito', 'an ice cold IPA', 'a Coke with extra ice', 'the Bacon Cheeseburger'];

function drawScoreboard(entry, live) {
  entry.state.live = live;
  ATTRACT.scoreboard(entry.ctx, entry.w, entry.h, performance.now() / 1000, entry.state, 0);
  entry.texture.needsUpdate = true;
}

export class GameManager {
  constructor({ scene, camera, controller, rig, hud, audio, screens }) {
    Object.assign(this, { scene, camera, controller, rig, hud, audio, screens });
    this.mode = 'walk';
    this.session = null;
    this._v = new THREE.Vector3(); this._v2 = new THREE.Vector3(); this._q = new THREE.Quaternion();
    this.lastDrink = -99;
  }
  busy() { return this.mode !== 'walk'; }
  worldPose(group, pose) {
    const p = new THREE.Vector3(...pose.local).applyMatrix4(group.matrixWorld);
    const l = new THREE.Vector3(...pose.look).applyMatrix4(group.matrixWorld);
    return { pos: p, look: l };
  }
  // Called when E is pressed on an interactable.
  interact(mesh) {
    const it = mesh.userData.interact;
    if (!it || this.busy() || this.rig.active || performance.now() < (this.cooldownUntil || 0)) return;
    if (it.kind === 'cabinet') this.startCabinet(it.cabinet);
    else if (it.kind === 'station') {
      const s = it.station;
      if (s.type === 'skee') this.startSkee(s);
      else if (s.type === 'hoops') this.startHoops(s);
      else if (s.type === 'claw') this.startClaw(s);
      else if (s.type === 'wheel') this.startWheel(s);
    } else if (it.kind === 'prizes') this.openPrizes();
    else if (it.kind === 'kiosk') this.openKiosk();
    else if (it.kind === 'bar') this.orderDrink();
  }
  pay(cost, name) {
    if (cost <= 0) return true;
    if (!spend(cost)) { this.hud.toast(`Not enough chips for ${name}. Recharge at a Power Card kiosk.`, 'bad'); this.audio.deny(); return false; }
    this.audio.swipe();
    this.hud.toast(`Card swiped: -${cost} chips`, '');
    return true;
  }
  award(tickets, label) {
    if (tickets > 0) {
      addTickets(tickets);
      this.audio.tickets(tickets);
      this.hud.toast(`${label}: +${tickets} tickets!`, 'win', 4200);
    } else this.hud.toast(`${label}: no tickets this time.`, 'bad');
  }
  quit() {
    if (!this.session) return;
    const s = this.session; this.session = null;
    s.end?.();
    this.hud.hideGame();
    this.hud.prompt(null);
    this.controller.lookOnly = false;
    if (s.docked) this.rig.release(); else this.controller.enabled = true;
    this.mode = 'walk';
    this.cooldownUntil = performance.now() + 700;
  }
  update(dt, t) {
    if (this.session?.update) this.session.update(dt, t);
    if (this.session?.done) this.quit();
  }
  key(code, down) { this.session?.key?.(code, down); }
  mouseDown() { this.session?.mouseDown?.(); }
  mouseUp() { this.session?.mouseUp?.(); }
  mouseMove(dx, dy) { this.session?.mouseMove?.(dx, dy); }

  // ---------------- Cabinet mini-games ----------------
  startCabinet(rec) {
    const game = rec.game;
    if (!this.pay(game.cost, game.title)) return;
    this.mode = 'cabinet';
    const [pw, ph] = rec.screenSize;
    const priv = this.screens.createPrivate(pw, ph);
    const original = rec.screenMesh.material;
    rec.screenMesh.material = priv.material;
    const io = { audio: this.audio, onOver: () => {} };
    const mini = createMiniGame(game.play, priv.ctx, pw, ph, io, game.variant);
    const pose = this.worldPose(rec.group, rec.standPose);
    let started = false, awarded = false;
    this.hud.game({ title: game.title, score: 0, help: `${mini.help} &nbsp;·&nbsp; <kbd>Q</kbd> walk away` });
    this.rig.dock(pose.pos, pose.look, () => { started = true; }, 0.9);
    const session = {
      docked: true, touchKind: game.play,
      update: (dt) => {
        if (!started) { mini.update(0); priv.texture.needsUpdate = true; return; }
        mini.update(Math.min(dt, 0.05));
        priv.texture.needsUpdate = true;
        this.hud.gameUpdate({ score: mini.score });
        if (mini.over && !awarded) { awarded = true; this.award(mini.tickets(), game.title); if (mini.score > 0) this.audio.win(mini.tickets() > 20); }
        if (mini.done) session.done = true;
      },
      key: (code, down) => mini.key(code, down),
      mouseDown: () => mini.mouseDown(), mouseUp: () => mini.mouseUp(), mouseMove: (dx, dy) => mini.mouseMove(dx, dy),
      end: () => { mini.destroy?.(); rec.screenMesh.material = original; priv.texture.dispose(); priv.material.dispose(); },
    };
    this.session = session;
  }

  // ---------------- Skee-Ball ----------------
  startSkee(rec) {
    if (!this.pay(rec.cost, 'Skee-Ball')) return;
    this.mode = 'station';
    const pose = this.worldPose(rec.group, rec.standPose);
    const g = rec.group;
    let started = false, ballsLeft = 9, score = 0, charging = false, power = 0, aim = 0, ballInFlight = null, finishT = 0, over = false;
    const held = new THREE.Mesh(new THREE.SphereGeometry(0.045, 14, 12), M.skeeBall);
    this.scene.add(held);
    const lane = rec.lane;
    const target = lane.target;
    const tiltN = new THREE.Vector3(0, Math.sin(-target.tilt), Math.cos(-target.tilt)); // local normal of the target face (up/forward)
    const tiltU = new THREE.Vector3(0, Math.cos(-target.tilt), -Math.sin(-target.tilt)); // local "up" along the face
    const holes = [[0.07, 50], [0.117, 40], [0.182, 30], [0.254, 20], [0.332, 10]];
    // Where on the target face a ball leaving the ramp at speed v lands (face coordinate v: -0.5 bottom .. 0.5 top).
    const landingV = (vr) => {
      let y = lane.y, z = lane.rampZ, vy = vr * Math.sin(0.9), vz = -vr * Math.cos(0.9);
      for (let i = 0; i < 400; i++) {
        vy -= 9.8 / 120; y += vy / 120; z += vz / 120;
        const rel = new THREE.Vector3(0, y - target.y, z - target.z);
        if (rel.dot(tiltN) < 0.045) return rel.dot(tiltU);
        if (y < 0) return -9;
      }
      return 9;
    };
    // Ramp speed that lands at face coordinate `want` (bisection), so power maps linearly to height on the board.
    const speedForFace = (want) => {
      let lo = 2.0, hi = 9.0;
      for (let i = 0; i < 24; i++) { const mid = (lo + hi) / 2; if (landingV(mid) < want) lo = mid; else hi = mid; }
      return (lo + hi) / 2;
    };
    this.hud.game({ title: 'SKEE-BALL', score: 0, extraLabel: 'BALLS', extra: 9, help: 'Hold <kbd>Mouse</kbd> to charge, move mouse to aim, release to roll &nbsp;·&nbsp; <kbd>Q</kbd> walk away' });
    drawScoreboard(rec.scoreEntry, { score: 0, label: 'SKEE-BALL' });
    this.rig.dock(pose.pos, pose.look, () => { started = true; this.hud.hint(this.touch ? 'Press and hold the right side to charge, drag to aim, release to roll' : 'Hold the mouse button to charge your roll, release to throw'); }, 0.9);
    for (const b of rec.balls) b.visible = true;
    const updateRack = () => rec.balls.forEach((b, i) => { b.visible = i < ballsLeft - (ballInFlight ? 0 : 1) + (over ? 1 : 0); });
    const localToWorld = (v) => v.applyMatrix4(g.matrixWorld);
    const session = {
      docked: true, touchKind: 'skee',
      update: (dt) => {
        if (!started) return;
        if (charging) { power = Math.min(1, power + dt * 0.85); }
        // held ball floats at the bottom of the view
        held.visible = !ballInFlight && ballsLeft > 0 && !over;
        if (held.visible) {
          const fwd = this._v.set(0, 0, -1).applyQuaternion(this.camera.quaternion);
          const right = this._v2.set(1, 0, 0).applyQuaternion(this.camera.quaternion);
          held.position.copy(this.camera.position).addScaledVector(fwd, 0.45).addScaledVector(right, 0.12 + aim * 0.05).add(new THREE.Vector3(0, -0.2 + power * 0.06, 0));
        }
        if (ballInFlight) {
          const b = ballInFlight;
          b.t += dt;
          if (b.phase === 'lane') {
            b.v = Math.max(1.2, b.v - 0.6 * dt);
            b.z -= b.v * dt; b.x += b.vx * dt;
            b.x = Math.max(-0.36, Math.min(0.36, b.x));
            if (b.z <= lane.rampZ) { b.phase = 'air'; b.vy = b.v * Math.sin(0.9); b.vz = -b.v * Math.cos(0.9); b.y = lane.y; this.audio.swish(); }
          } else if (b.phase === 'air') {
            b.vy -= 9.8 * dt; b.y += b.vy * dt; b.z += b.vz * dt; b.x += b.vx * dt;
            // hit the target face?
            const rel = new THREE.Vector3(b.x, b.y - target.y, b.z - target.z);
            const dist = rel.dot(tiltN);
            if (dist < 0.045 && b.vz < 0) {
              const u = rel.x, v = rel.dot(tiltU);
              // ring holes centred at v = -0.1, 100 pockets at (±0.249, 0.363)
              let pts = 0;
              const dc = Math.hypot(u, v + 0.1);
              for (const [r, p] of holes) if (dc < r + 0.02) { pts = p; break; }
              if (!pts && (Math.hypot(u - 0.249, v - 0.363) < 0.08 || Math.hypot(u + 0.249, v - 0.363) < 0.08)) pts = 100;
              b.phase = 'sink'; b.sinkT = 0; b.pts = pts;
              if (pts) { score += pts; this.audio.score(pts); this.hud.toast(`${pts} points!`, pts >= 50 ? 'win' : ''); }
              else { this.audio.thud(); }
              this.hud.gameUpdate({ score });
              drawScoreboard(rec.scoreEntry, { score, label: 'SKEE-BALL' });
            } else if (b.y < lane.y - 0.5 || b.z < target.z - 1) { b.phase = 'sink'; b.sinkT = 0; b.pts = 0; this.audio.thud(); }
          } else if (b.phase === 'sink') {
            b.sinkT += dt; b.y -= dt * 0.6;
            if (b.sinkT > 0.5) { g.remove(b.mesh); ballInFlight = null; updateRack(); if (ballsLeft <= 0) { over = true; finishT = 0; const tix = Math.floor(score / 10) + (score >= 360 ? 20 : 0) + (score >= 450 ? 50 : 0); this.award(tix, 'Skee-Ball'); if (score > state.stats.bestSkee) { state.stats.bestSkee = score; save(); } this.audio.win(score >= 360); } }
          }
          if (b.mesh) b.mesh.position.set(b.x, b.y, b.z);
        }
        if (over) { finishT += dt; if (finishT > 2.5) session.done = true; }
      },
      mouseDown: () => { if (started && !ballInFlight && ballsLeft > 0 && !over) { charging = true; power = 0; aim = 0; } },
      mouseMove: (dx) => { if (charging) aim = Math.max(-1, Math.min(1, aim + dx * 0.01)); },
      mouseUp: () => {
        if (!charging) return; charging = false;
        ballsLeft--; this.hud.gameUpdate({ extra: ballsLeft });
        const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.045, 14, 12), M.skeeBall);
        mesh.castShadow = true; g.add(mesh);
        // power 0 → below the board, ~0.4 → bullseye, ~0.9 → the 100 pockets, 1 → over the top
        const wantV = -0.5 + power * 0.98 + (Math.random() - 0.5) * 0.04;
        const vr = speedForFace(wantV);
        const v0 = Math.sqrt(vr * vr + 2 * 0.6 * (lane.startZ - lane.rampZ));
        ballInFlight = { mesh, phase: 'lane', t: 0, x: aim * 0.12, y: lane.y, z: lane.startZ, v: v0, vx: aim * 0.35, vy: 0, vz: 0 };
        this.audio.roll(); updateRack();
      },
      end: () => { this.scene.remove(held); if (ballInFlight?.mesh) g.remove(ballInFlight.mesh); rec.balls.forEach(b => b.visible = true); drawScoreboard(rec.scoreEntry, null); },
    };
    this.session = session;
  }

  // ---------------- Hoops ----------------
  startHoops(rec) {
    if (!this.pay(rec.cost, 'Hoop Fever')) return;
    this.mode = 'station';
    const pose = this.worldPose(rec.group, rec.standPose);
    const g = rec.group;
    const rimW = rec.rim.local.clone().applyMatrix4(g.matrixWorld);
    const backZ = new THREE.Vector3(0, 2.4, -1.33).applyMatrix4(g.matrixWorld);
    const fwdMachine = new THREE.Vector3(0, 0, -1).applyQuaternion(g.quaternion).normalize();
    let started = false, time = 45, score = 0, charging = false, power = 0, over = false, finishT = 0, cooldown = 0;
    const balls = [];
    const held = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 14), M.basketball); this.scene.add(held);
    const preview = new THREE.InstancedMesh(new THREE.SphereGeometry(0.02, 6, 6), new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.7 }), 24); preview.visible = false; this.scene.add(preview);
    const R = 0.11;
    this.hud.game({ title: 'HOOP FEVER', score: 0, time, help: 'Aim with the mouse, hold <kbd>Mouse</kbd> to charge, release to shoot &nbsp;·&nbsp; <kbd>Q</kbd> walk away' });
    drawScoreboard(rec.scoreEntry, { score: 0, time, label: 'HOOP FEVER' });
    // stand mode: teleport to spot, allow looking
    this.rig.dock(pose.pos, pose.look, () => {
      started = true;
      this.controller.setPose(pose.pos.x, pose.pos.y, pose.pos.z, this.controller.yaw, this.controller.pitch);
      const e = new THREE.Euler().setFromQuaternion(this.camera.quaternion, 'YXZ');
      this.controller.yaw = e.y; this.controller.pitch = e.x;
      this.rig.active = false; this.rig.mode = 'idle';
      this.controller.enabled = true; this.controller.lookOnly = true;
      this.hud.hint(this.touch ? 'Drag to aim at the hoop, hold to charge, release to shoot' : 'Look at the hoop, hold the mouse button to charge, release to shoot');
    }, 0.9);
    const launchVel = (p) => {
      const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
      const h = new THREE.Vector3(dir.x, 0, dir.z).normalize();
      return h.multiplyScalar(2.2 + p * 2.6).add(new THREE.Vector3(0, 3.4 + p * 2.6 + dir.y * 2.0, 0));
    };
    const startPos = () => new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion).multiplyScalar(0.4).add(this.camera.position).add(new THREE.Vector3(0, -0.1, 0));
    const m4 = new THREE.Matrix4();
    const session = {
      docked: false, touchKind: 'hoops',
      update: (dt) => {
        if (!started) return;
        cooldown -= dt;
        if (!over) { time -= dt; this.hud.gameUpdate({ time }); if (time <= 0) { over = true; time = 0; finishT = 0; const tix = score * 2 + (score >= 20 ? 30 : 0) + (score >= 40 ? 60 : 0); this.award(tix, 'Hoop Fever'); if (score > state.stats.bestHoops) { state.stats.bestHoops = score; save(); } this.audio.win(score >= 20); drawScoreboard(rec.scoreEntry, { score, time: 0, label: 'FINAL' }); } }
        if (Math.floor(time) !== session.lastSec) { session.lastSec = Math.floor(time); if (!over) drawScoreboard(rec.scoreEntry, { score, time, label: 'HOOP FEVER' }); }
        if (charging) power = Math.min(1, power + dt * 1.1);
        held.visible = !over && cooldown <= 0;
        if (held.visible) { held.position.copy(startPos()); held.position.y -= 0.12 - power * 0.05; }
        preview.visible = charging;
        if (charging) {
          const p = startPos(), v = launchVel(power);
          for (let i = 0; i < 24; i++) { const tt = i * 0.06; m4.makeTranslation(p.x + v.x * tt, p.y + v.y * tt - 4.9 * tt * tt, p.z + v.z * tt); preview.setMatrixAt(i, m4); }
          preview.instanceMatrix.needsUpdate = true;
        }
        for (const b of balls) {
          if (b.dead) continue;
          b.age += dt;
          b.v.y -= 9.8 * dt;
          b.p.addScaledVector(b.v, dt);
          // backboard (plane perpendicular to machine forward at backZ)
          const rel = b.p.clone().sub(backZ); const depth = rel.dot(fwdMachine);
          if (depth > -R && b.p.y > 2.05 && b.p.y < 2.75 && Math.abs(rel.clone().sub(fwdMachine.clone().multiplyScalar(depth)).x + rel.clone().sub(fwdMachine.clone().multiplyScalar(depth)).z) < 1.2) { b.p.addScaledVector(fwdMachine, -(depth + R)); const vn = b.v.dot(fwdMachine); if (vn > 0) { b.v.addScaledVector(fwdMachine, -vn * 1.55); this.audio.bounce(); } }
          // rim
          const dr = new THREE.Vector3(b.p.x - rimW.x, 0, b.p.z - rimW.z); const hd = dr.length();
          if (Math.abs(b.p.y - rimW.y) < R && !b.scored) {
            if (hd < rec.rim.r - R * 0.55 && b.v.y < 0) { b.scored = true; score += 2; this.hud.gameUpdate({ score }); this.audio.score(50); this.audio.cheer(); b.v.multiplyScalar(0.4); drawScoreboard(rec.scoreEntry, { score, time, label: 'HOOP FEVER' }); }
            else if (hd > rec.rim.r - R * 0.55 && hd < rec.rim.r + R) { const n = dr.normalize(); const vn = b.v.dot(n); b.v.addScaledVector(n, -vn * 1.4).add(new THREE.Vector3((Math.random() - 0.5) * 0.6, 0.6, (Math.random() - 0.5) * 0.6)); b.v.y = Math.abs(b.v.y) * 0.5 + 0.6; this.audio.bounce(); }
          }
          // floor / ramp
          const floorY = 0.62 + R;
          if (b.p.y < floorY) { b.p.y = floorY; if (Math.abs(b.v.y) > 0.6) this.audio.bounce(); b.v.y = Math.abs(b.v.y) * 0.45; b.v.x *= 0.8; b.v.z *= 0.8; }
          if (b.age > 3.5) { b.dead = true; this.scene.remove(b.mesh); }
          b.mesh.position.copy(b.p);
        }
        if (over) { finishT += dt; if (finishT > 3) session.done = true; }
      },
      mouseDown: () => { if (started && !over && cooldown <= 0) { charging = true; power = 0; } },
      mouseUp: () => {
        if (!charging) return; charging = false;
        const mesh = new THREE.Mesh(new THREE.SphereGeometry(R, 16, 14), M.basketball); mesh.castShadow = true; this.scene.add(mesh);
        balls.push({ mesh, p: startPos(), v: launchVel(power), age: 0 });
        cooldown = 0.5; this.audio.swish();
      },
      end: () => { this.scene.remove(held); this.scene.remove(preview); balls.forEach(b => this.scene.remove(b.mesh)); this.controller.lookOnly = false; drawScoreboard(rec.scoreEntry, null); },
    };
    this.session = session;
  }

  // ---------------- Claw ----------------
  startClaw(rec) {
    if (!this.pay(rec.cost, 'Prize Claw')) return;
    this.mode = 'station';
    const pose = this.worldPose(rec.group, rec.standPose);
    const c = rec.claw, bounds = rec.bounds;
    let started = false, phase = 'move', t = 0, timeLeft = 25, x = 0, z = 0, drop = 0, grip = 0, won = null, carried = null, finishT = 0;
    this.hud.game({ title: 'PRIZE CLAW', score: 0, extraLabel: 'TIME', extra: 25, help: '<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> move the claw &nbsp; <kbd>Space</kbd> drop &nbsp;·&nbsp; <kbd>Q</kbd> walk away' });
    this.rig.dock(pose.pos, pose.look, () => { started = true; this.audio.motor(true); this.hud.hint(this.touch ? 'Use the d-pad to position the claw, then tap DROP' : 'Position the claw over a plush, then press Space'); }, 0.9);
    const keys = new Set();
    const setClaw = () => {
      c.gantry.position.z = z; c.carriage.position.x = x;
      c.cable.scale.y = Math.max(0.02, drop); c.cable.position.y = -drop / 2;
      c.head.position.y = -drop;
      c.prongs.forEach(p => { p.children.forEach(ch => { ch.rotation.z = (ch === p.children[0] ? 0.5 : -0.4) - grip * 0.45; }); });
    };
    const makePlush = (ci) => {
      const grp = new THREE.Group(); const mat = M.plushColors[ci % M.plushColors.length]; const s = 0.09;
      const add = (r, p, m = mat) => { const mm = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 10), m); mm.position.set(...p); grp.add(mm); };
      add(s, [0, 0, 0]); add(s * 0.72, [0, s * 1.1, s * 0.1]); add(s * 0.3, [-s * 0.55, s * 1.7, 0]); add(s * 0.3, [s * 0.55, s * 1.7, 0]);
      add(s * 0.09, [-s * 0.25, s * 1.2, s * 0.7], M.blackMatte); add(s * 0.09, [s * 0.25, s * 1.2, s * 0.7], M.blackMatte);
      return grp;
    };
    const session = {
      docked: true, touchKind: 'claw',
      update: (dt) => {
        if (!started) return;
        t += dt;
        if (phase === 'move') {
          timeLeft -= dt; this.hud.gameUpdate({ extra: Math.ceil(timeLeft) });
          const sp = 0.32;
          if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= sp * dt; if (keys.has('KeyD') || keys.has('ArrowRight')) x += sp * dt;
          if (keys.has('KeyW') || keys.has('ArrowUp')) z -= sp * dt; if (keys.has('KeyS') || keys.has('ArrowDown')) z += sp * dt;
          x = Math.max(bounds.minX, Math.min(bounds.maxX, x)); z = Math.max(bounds.minZ, Math.min(bounds.maxZ, z));
          if (timeLeft <= 0) phase = 'drop';
        } else if (phase === 'drop') {
          drop += dt * 0.7; if (drop >= bounds.dropDepth) { drop = bounds.dropDepth; phase = 'grab'; t = 0; this.audio.tick(); }
        } else if (phase === 'grab') {
          grip = Math.min(1, grip + dt * 2.5);
          if (grip >= 1 && t > 0.6) {
            // decide the catch
            let best = null;
            for (const p of rec.plushes) { const d = Math.hypot(p.x - x, p.z - z); if (!best || d < best.d) best = { d, p }; }
            const chance = best.d < 0.08 ? 0.8 : best.d < 0.15 ? 0.45 : best.d < 0.22 ? 0.15 : 0;
            won = Math.random() < chance ? best.p : null;
            if (won) { carried = makePlush(won.color); carried.position.set(0, -0.28, 0); c.head.add(carried); }
            phase = 'lift';
          }
        } else if (phase === 'lift') {
          drop -= dt * 0.6;
          if (won && Math.random() < dt * 0.15) { won = null; c.head.remove(carried); carried = null; this.hud.toast('It slipped!', 'bad'); this.audio.thud(); }
          if (drop <= 0) { drop = 0; phase = 'carry'; }
        } else if (phase === 'carry') {
          const tx = -0.32, tz = 0.3; const dx = tx - x, dz = tz - z; const d = Math.hypot(dx, dz);
          if (d < 0.01) { phase = 'release'; t = 0; } else { const st = Math.min(d, 0.35 * dt); x += dx / d * st; z += dz / d * st; }
        } else if (phase === 'release') {
          grip = Math.max(0, grip - dt * 3);
          if (carried) { carried.position.y -= dt * 1.2; if (carried.position.y < -0.9) { c.head.remove(carried); carried = null; } }
          if (t === 0) {
            this.audio.motor(false);
            if (won) { const names = ['Pink', 'Blue', 'Yellow', 'Green', 'White', 'Purple', 'Orange']; const prize = `${names[won.color % names.length]} Plush`; addPrize({ name: prize, from: 'Prize Claw', emoji: '🧸' }); this.audio.win(true); this.hud.toast(`You won a ${prize}!`, 'win', 5000); addTickets(25); this.hud.toast('Bonus: +25 tickets', 'win'); }
            else { this.audio.lose(); this.hud.toast('So close! Try again.', 'bad'); }
          }
          t += dt; if (t > 1.6) { phase = 'reset'; }
        } else if (phase === 'reset') {
          x += (0 - x) * Math.min(1, dt * 3); z += (0 - z) * Math.min(1, dt * 3); finishT += dt; if (finishT > 1.2) session.done = true;
        }
        setClaw();
      },
      key: (code, down) => { if (down) keys.add(code); else keys.delete(code); if (down && (code === 'Space' || code === 'KeyE') && phase === 'move') { phase = 'drop'; this.audio.click(); } },
      end: () => { keys.clear(); this.audio.motor(false); if (carried) c.head.remove(carried); x = 0; z = 0; drop = 0; grip = 0; setClaw(); },
    };
    this.session = session;
  }

  // ---------------- Prize wheel ----------------
  startWheel(rec) {
    if (!this.pay(rec.cost, 'Mega Spin')) return;
    this.mode = 'station';
    const pose = this.worldPose(rec.group, rec.standPose);
    const n = WHEEL_SEGMENTS.length;
    let started = false, omega = 0, theta = rec.wheel.rotation.z, lastSeg = -1, done = false, finishT = 0, flapT = 0;
    // Segment under the top pointer for the wheel's current rotation (calibrated against the cap UV mapping).
    const segUnderPointer = () => { const i = Math.floor((theta / (Math.PI * 2)) * n) + 12; return ((i % n) + n) % n; };
    this.hud.game({ title: 'MEGA SPIN', score: 0, help: 'Spinning… &nbsp;·&nbsp; <kbd>Q</kbd> walk away' });
    this.rig.dock(pose.pos, pose.look, () => { started = true; omega = 9 + Math.random() * 6; rec.bulbs.setMode('chase', 14); this.audio.click(); }, 0.8);
    const session = {
      docked: true,
      update: (dt) => {
        if (!started) return;
        if (!done) {
          theta += omega * dt; omega = Math.max(0, omega - (0.9 + omega * 0.22) * dt);
          rec.wheel.rotation.z = theta;
          const seg = segUnderPointer();
          if (seg !== lastSeg) { lastSeg = seg; this.audio.tick(); flapT = 0.12; }
          flapT -= dt; rec.flap.rotation.x = flapT > 0 ? 0.5 : 0;
          if (omega <= 0.01) {
            done = true; const s = WHEEL_SEGMENTS[seg];
            this.hud.gameUpdate({ score: s.value });
            this.award(s.value, s.jackpot ? 'JACKPOT!!!' : 'Mega Spin');
            if (s.jackpot) { this.audio.win(true); this.audio.cheer(); rec.bulbs.setMode('blink', 20); } else this.audio.win(s.value >= 100);
          }
        } else { finishT += dt; if (finishT > 3) { session.done = true; } }
      },
      end: () => { rec.bulbs.setMode('alternate', 5); rec.flap.rotation.x = 0; },
    };
    this.session = session;
  }

  // ---------------- Prize counter modal ----------------
  openPrizes() {
    this.mode = 'modal';
    this.controller.enabled = false;
    this.controller.unlock();
    const render = () => {
      const body = this.hud.modal("Winner's Circle — Prize Redemption", `<p class="modal-note">You have <b style="color:var(--ticket)">${state.tickets}</b> tickets. Prizes you redeem are added to your Power Card.</p><div class="prize-grid">${PRIZES.map((p, i) => `<div class="prize"><div class="emoji">${p.emoji}</div><div class="name">${p.name}</div><div class="cost">${p.cost.toLocaleString()} tickets</div><button class="small" data-i="${i}" ${state.tickets < p.cost ? 'disabled' : ''}>Redeem</button></div>`).join('')}</div>${state.prizes.length ? `<p class="modal-note" style="margin-top:12px">Your prizes: ${state.prizes.map(p => `${p.emoji || '🎁'} ${p.name}`).join(', ')}</p>` : ''}`);
      body.querySelectorAll('button[data-i]').forEach(btn => btn.addEventListener('click', () => {
        const p = PRIZES[+btn.dataset.i];
        if (spendTickets(p.cost)) { addPrize({ name: p.name, emoji: p.emoji, from: "Winner's Circle" }); this.audio.win(p.cost >= 3000); this.hud.toast(`Redeemed: ${p.emoji} ${p.name}`, 'win'); render(); }
        else this.audio.deny();
      }));
    };
    render();
    this.session = { docked: false, end: () => { this.hud.closeModal(); } };
    this.hud.onModalClose = () => { if (this.mode === 'modal') { this.hud.onModalClose = null; this.quit(); this.controller.lock(); } };
  }

  // ---------------- Kiosk modal ----------------
  openKiosk() {
    this.mode = 'modal';
    this.controller.enabled = false;
    this.controller.unlock();
    const opts = [[10, 50], [25, 150], [50, 350], [100, 800]];
    const body = this.hud.modal('Power Card Recharge Station', `<p class="modal-note">Tap a package to load chips onto your card. (No real money changes hands in the simulator.)</p><div class="kiosk-options">${opts.map(([d, c], i) => `<button data-i="${i}">$${d}<b>${c} chips</b></button>`).join('')}</div><p class="modal-note" style="margin-top:14px">Card balance: <b>${state.chips}</b> chips · <b>${state.tickets}</b> tickets · ${state.stats.gamesPlayed} games played</p>`);
    body.querySelectorAll('button[data-i]').forEach(btn => btn.addEventListener('click', () => {
      const [d, c] = opts[+btn.dataset.i];
      addChips(c); this.audio.coin(); this.hud.toast(`+${c} chips loaded ($${d})`, 'win');
      body.querySelector('.modal-note:last-child').innerHTML = `Card balance: <b>${state.chips}</b> chips · <b>${state.tickets}</b> tickets · ${state.stats.gamesPlayed} games played`;
    }));
    this.session = { docked: false, end: () => { this.hud.closeModal(); } };
    this.hud.onModalClose = () => { if (this.mode === 'modal') { this.hud.onModalClose = null; this.quit(); this.controller.lock(); } };
  }

  orderDrink() {
    const now = performance.now() / 1000;
    if (now - this.lastDrink < 6) { this.hud.toast('The bartender is on it…'); return; }
    this.lastDrink = now;
    const d = DRINKS[Math.floor(Math.random() * DRINKS.length)];
    this.audio.pop();
    this.hud.toast(`You order ${d}. The bartender slides it over. Cheers! 🍻`, 'win', 4500);
    if (Math.random() < 0.3) { addChips(5); this.hud.toast('Happy hour bonus: +5 chips on your card', 'win'); }
  }
}
