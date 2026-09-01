// Playable canvas games rendered onto cabinet screens: shooter, breakout, racer, rhythm, brawl, light-gun, pinball.
const FONT = '"Bungee", Impact, "Arial Black", sans-serif';
const MONO = '"Share Tech Mono", ui-monospace, monospace';
const pad = (n, l) => String(Math.max(0, Math.floor(n))).padStart(l, '0');

class Base {
  constructor(ctx, w, h, io) { this.ctx = ctx; this.w = w; this.h = h; this.io = io; this.score = 0; this.done = false; this.t = 0; this.endTimer = 0; this.keys = new Set(); }
  key(code, down) { if (down) this.keys.add(code); else this.keys.delete(code); if (down) this.press?.(code); }
  mouseMove() {}
  mouseDown() {}
  mouseUp() {}
  left() { return this.keys.has('ArrowLeft') || this.keys.has('KeyA'); }
  right() { return this.keys.has('ArrowRight') || this.keys.has('KeyD'); }
  up() { return this.keys.has('ArrowUp') || this.keys.has('KeyW'); }
  downKey() { return this.keys.has('ArrowDown') || this.keys.has('KeyS'); }
  banner(text, sub, color = '#ffd400') {
    const { ctx, w, h } = this;
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, h / 2 - 40, w, 80);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `${Math.round(h * 0.11)}px ${FONT}`; ctx.lineWidth = 6; ctx.strokeStyle = '#000'; ctx.strokeText(text, w / 2, h / 2 - 8);
    ctx.fillStyle = color; ctx.fillText(text, w / 2, h / 2 - 8);
    if (sub) { ctx.font = `${Math.round(h * 0.05)}px ${MONO}`; ctx.fillStyle = '#fff'; ctx.fillText(sub, w / 2, h / 2 + 26); }
    ctx.textBaseline = 'alphabetic';
  }
  finish(text, sub) {
    if (this.over) return;
    this.over = true; this.overText = text; this.overSub = sub;
    this.io.onOver?.();
  }
  tickOver(dt) { if (this.over) { this.endTimer += dt; if (this.endTimer > 2.5) this.done = true; } }
}

// ---------------- Space shooter ----------------
export class Shooter extends Base {
  constructor(ctx, w, h, io, variant = 0) {
    super(ctx, w, h, io);
    this.title = variant ? 'STAR RAIDERS' : 'GALAXY DEFENDER';
    this.help = '<kbd>←</kbd><kbd>→</kbd> move &nbsp; <kbd>Space</kbd> fire';
    this.variant = variant; this.px = w / 2; this.lives = 3; this.wave = 1; this.bullets = []; this.ebullets = []; this.booms = []; this.cool = 0; this.inv = 0;
    this.stars = Array.from({ length: 70 }, () => ({ x: Math.random() * w, y: Math.random() * h, s: 0.5 + Math.random() * 1.5 }));
    this.spawn();
  }
  spawn() { this.enemies = []; for (let r = 0; r < 4; r++) for (let c = 0; c < 8; c++) this.enemies.push({ c, r, alive: true }); this.dir = 1; this.ox = 0; this.oy = 0; this.espeed = 26 + this.wave * 8; }
  press(code) { if (code === 'Space') this.fire(); }
  fire() { if (this.over || this.cool > 0) return; this.bullets.push({ x: this.px, y: this.h - 40 }); this.cool = 0.28; this.io.audio.laser(); }
  update(dt) {
    const { ctx, w, h } = this; this.t += dt; this.cool -= dt; this.inv -= dt;
    if (!this.over) {
      if (this.left()) this.px -= 190 * dt; if (this.right()) this.px += 190 * dt;
      if (this.keys.has('Space') && this.cool <= 0) this.fire();
      this.px = Math.max(16, Math.min(w - 16, this.px));
      this.ox += this.dir * this.espeed * dt;
      const alive = this.enemies.filter(e => e.alive);
      if (alive.length) {
        const minC = Math.min(...alive.map(e => e.c)), maxC = Math.max(...alive.map(e => e.c));
        const lx = w / 2 - 105 + minC * 30 + this.ox - 12, rx = w / 2 - 105 + maxC * 30 + this.ox + 12;
        if ((this.dir > 0 && rx > w - 6) || (this.dir < 0 && lx < 6)) { this.dir *= -1; this.oy += 8; }
        if (Math.random() < dt * (0.6 + this.wave * 0.25)) { const e = alive[Math.floor(Math.random() * alive.length)]; this.ebullets.push({ x: w / 2 - 105 + e.c * 30 + this.ox, y: 40 + this.oy + e.r * 24 }); }
      } else { this.wave++; this.score += 500; this.spawn(); this.io.audio.win(); }
      for (const b of this.bullets) b.y -= 320 * dt;
      for (const b of this.ebullets) b.y += 130 * dt;
      for (const b of this.bullets) {
        for (const e of this.enemies) {
          if (!e.alive) continue;
          const ex = w / 2 - 105 + e.c * 30 + this.ox, ey = 40 + this.oy + e.r * 24;
          if (Math.abs(b.x - ex) < 12 && Math.abs(b.y - ey) < 8) { e.alive = false; b.y = -99; this.score += 100 + (3 - e.r) * 25; this.booms.push({ x: ex, y: ey, a: 1 }); this.io.audio.explosion(); }
        }
      }
      for (const b of this.ebullets) {
        if (this.inv <= 0 && Math.abs(b.x - this.px) < 12 && b.y > h - 40 && b.y < h - 14) { b.y = h + 99; this.lives--; this.inv = 1.5; this.booms.push({ x: this.px, y: h - 28, a: 1 }); this.io.audio.explosion(); if (this.lives <= 0) this.finish('GAME OVER', `SCORE ${this.score}`); }
      }
      if (this.enemies.some(e => e.alive && 40 + this.oy + e.r * 24 > h - 50)) { this.lives = 0; this.finish('INVADED!', `SCORE ${this.score}`); }
      this.bullets = this.bullets.filter(b => b.y > -10); this.ebullets = this.ebullets.filter(b => b.y < h + 10);
    }
    this.tickOver(dt);
    // draw
    ctx.fillStyle = this.variant ? '#03000f' : '#000308'; ctx.fillRect(0, 0, w, h);
    for (const s of this.stars) { s.y += s.s * 60 * dt; if (s.y > h) { s.y = 0; s.x = Math.random() * w; } ctx.fillStyle = 'rgba(200,220,255,0.7)'; ctx.fillRect(s.x, s.y, s.s, s.s); }
    const cols = this.variant ? ['#ff3cac', '#ffd23f', '#26e5ff', '#8cff5a'] : ['#ff5a5a', '#ffb02e', '#5ad2ff', '#c46bff'];
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const x = w / 2 - 105 + e.c * 30 + this.ox, y = 40 + this.oy + e.r * 24 + Math.sin(this.t * 3 + e.c) * 2;
      ctx.fillStyle = cols[e.r]; ctx.fillRect(x - 8, y - 4, 16, 8); ctx.fillRect(x - 12, y, 4, 6); ctx.fillRect(x + 8, y, 4, 6);
      ctx.fillStyle = '#000'; ctx.fillRect(x - 5, y - 2, 3, 3); ctx.fillRect(x + 2, y - 2, 3, 3);
    }
    if (this.lives > 0 && (this.inv <= 0 || Math.floor(this.t * 12) % 2)) {
      ctx.fillStyle = this.variant ? '#26e5ff' : '#7dff6a'; ctx.beginPath(); ctx.moveTo(this.px, h - 40); ctx.lineTo(this.px + 14, h - 16); ctx.lineTo(this.px - 14, h - 16); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.fillRect(this.px - 2, h - 34, 4, 10);
    }
    ctx.fillStyle = '#fff'; for (const b of this.bullets) ctx.fillRect(b.x - 1, b.y, 2, 10);
    ctx.fillStyle = '#ff5a5a'; for (const b of this.ebullets) ctx.fillRect(b.x - 1.5, b.y, 3, 8);
    this.booms = this.booms.filter(b => b.a > 0);
    for (const b of this.booms) { ctx.strokeStyle = `rgba(255,${160 + b.a * 90},60,${b.a})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(b.x, b.y, (1 - b.a) * 24, 0, Math.PI * 2); ctx.stroke(); b.a -= dt * 3; }
    ctx.font = `12px ${FONT}`; ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.fillText(`SCORE ${pad(this.score, 6)}`, 8, 16);
    ctx.textAlign = 'right'; ctx.fillStyle = '#ffd23f'; ctx.fillText(`WAVE ${this.wave}   ${'♥'.repeat(Math.max(0, this.lives))}`, w - 8, 16);
    if (this.over) this.banner(this.overText, this.overSub);
  }
  tickets() { return Math.floor(this.score / 150) + (this.wave - 1) * 5; }
}

// ---------------- Breakout ----------------
export class Breakout extends Base {
  constructor(ctx, w, h, io) {
    super(ctx, w, h, io);
    this.title = 'NEON BREAKER';
    this.help = '<kbd>←</kbd><kbd>→</kbd> or mouse to move paddle &nbsp; <kbd>Space</kbd> launch';
    this.px = w / 2; this.lives = 3; this.level = 1; this.pal = ['#ff2d95', '#ff6a00', '#ffd400', '#3dff7a', '#22e5ff', '#8a3dff'];
    this.reset(); this.buildBricks();
  }
  reset() { this.ball = { x: this.px, y: this.h - 26, vx: 0, vy: 0, stuck: true }; }
  buildBricks() { this.bricks = []; const cols = 10, rows = 6; this.bw = (this.w - 20) / cols; for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (!((c + r + this.level) % 7 === 0 && this.level > 1)) this.bricks.push({ c, r, alive: true }); }
  press(code) { if (code === 'Space') this.launch(); }
  mouseMove(dx) { this.px += dx * 0.6; }
  mouseDown() { this.launch(); }
  launch() { if (this.ball.stuck && !this.over) { this.ball.stuck = false; const a = -Math.PI / 2 + (Math.random() - 0.5) * 0.8; const sp = 170 + this.level * 15; this.ball.vx = Math.cos(a) * sp; this.ball.vy = Math.sin(a) * sp; this.io.audio.pop(); } }
  update(dt) {
    const { ctx, w, h } = this; this.t += dt;
    if (!this.over) {
      if (this.left()) this.px -= 260 * dt; if (this.right()) this.px += 260 * dt;
      this.px = Math.max(28, Math.min(w - 28, this.px));
      const b = this.ball;
      if (b.stuck) { b.x = this.px; b.y = h - 26; }
      else {
        b.x += b.vx * dt; b.y += b.vy * dt;
        if (b.x < 4) { b.x = 4; b.vx = Math.abs(b.vx); this.io.audio.tick(); } if (b.x > w - 4) { b.x = w - 4; b.vx = -Math.abs(b.vx); this.io.audio.tick(); }
        if (b.y < 4) { b.y = 4; b.vy = Math.abs(b.vy); this.io.audio.tick(); }
        if (b.vy > 0 && b.y > h - 22 && b.y < h - 12 && Math.abs(b.x - this.px) < 30) { const rel = (b.x - this.px) / 30; const sp = Math.hypot(b.vx, b.vy) * 1.02; const a = -Math.PI / 2 + rel * 1.1; b.vx = Math.cos(a) * sp; b.vy = Math.sin(a) * sp; this.io.audio.hit(); }
        if (b.y > h + 6) { this.lives--; this.io.audio.lose(); if (this.lives <= 0) this.finish('GAME OVER', `SCORE ${this.score}`); else this.reset(); }
        for (const br of this.bricks) {
          if (!br.alive) continue;
          const x = 10 + br.c * this.bw, y = 30 + br.r * 15;
          if (b.x > x - 4 && b.x < x + this.bw + 4 && b.y > y - 4 && b.y < y + 12 + 4) {
            br.alive = false; this.score += 10 + (5 - br.r) * 4; this.io.audio.hit();
            const fromSide = b.x < x || b.x > x + this.bw; if (fromSide) b.vx *= -1; else b.vy *= -1;
            break;
          }
        }
        if (!this.bricks.some(br => br.alive)) { this.level++; this.score += 300; this.buildBricks(); this.reset(); this.io.audio.win(); }
      }
    }
    this.tickOver(dt);
    ctx.fillStyle = '#05020c'; ctx.fillRect(0, 0, w, h);
    for (const br of this.bricks) { if (!br.alive) continue; ctx.fillStyle = this.pal[br.r]; ctx.shadowColor = this.pal[br.r]; ctx.shadowBlur = 6; ctx.fillRect(10 + br.c * this.bw + 1, 30 + br.r * 15, this.bw - 2, 12); }
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff'; ctx.shadowColor = '#22e5ff'; ctx.shadowBlur = 10; ctx.fillRect(this.px - 30, h - 16, 60, 6);
    ctx.beginPath(); ctx.arc(this.ball.x, this.ball.y, 4, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    ctx.font = `12px ${FONT}`; ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.fillText(`SCORE ${pad(this.score, 5)}`, 8, 16);
    ctx.textAlign = 'right'; ctx.fillStyle = '#ffd400'; ctx.fillText(`LV ${this.level}  ${'●'.repeat(Math.max(0, this.lives))}`, w - 8, 16);
    if (this.ball.stuck && !this.over) { ctx.textAlign = 'center'; ctx.fillStyle = Math.floor(this.t * 2) % 2 ? '#fff' : '#ff2d95'; ctx.fillText('SPACE TO LAUNCH', w / 2, h / 2 + 30); }
    if (this.over) this.banner(this.overText, this.overSub);
  }
  tickets() { return Math.floor(this.score / 40); }
}

// ---------------- Pseudo-3D racer ----------------
export class Racer extends Base {
  constructor(ctx, w, h, io, variant = 0) {
    super(ctx, w, h, io);
    this.title = variant ? 'NITRO RUSH' : 'TURBO DRIFT GP';
    this.help = '<kbd>←</kbd><kbd>→</kbd> steer &nbsp; <kbd>↑</kbd> gas &nbsp; <kbd>↓</kbd> brake &nbsp; 60s time trial';
    this.variant = variant; this.speed = 0; this.pos = 0; this.x = 0; this.time = 60; this.dist = 0; this.gates = 0; this.nextGate = 400;
    this.cars = Array.from({ length: 6 }, (_, i) => ({ z: 200 + i * 300, x: (Math.random() - 0.5) * 1.4, spd: 60 + Math.random() * 50, col: ['#ffd400', '#3d9cff', '#ff3d5a', '#3dff7a'][i % 4] }));
    this.crash = 0;
  }
  curveAt(z) { return Math.sin(z * 0.0025) * 1.1 + Math.sin(z * 0.0009) * 0.6; }
  update(dt) {
    const { ctx, w, h } = this; this.t += dt;
    if (!this.over) {
      this.time -= dt;
      const accel = this.up() ? 90 : (this.downKey() ? -160 : -25);
      this.speed = Math.max(0, Math.min(260, this.speed + accel * dt));
      if (this.crash > 0) { this.crash -= dt; this.speed = Math.min(this.speed, 60); }
      const curve = this.curveAt(this.pos);
      this.x -= curve * (this.speed / 260) * 1.3 * dt;
      if (this.left()) this.x -= 1.8 * dt * (0.3 + this.speed / 260); if (this.right()) this.x += 1.8 * dt * (0.3 + this.speed / 260);
      if (Math.abs(this.x) > 1.15) { this.speed = Math.max(0, this.speed - 200 * dt); this.x = Math.max(-1.3, Math.min(1.3, this.x)); }
      this.pos += this.speed * dt; this.dist += this.speed * dt;
      this.score = Math.floor(this.dist / 10);
      if (this.dist > this.nextGate) { this.nextGate += 400; this.gates++; this.time += 4; this.io.audio.win(); }
      for (const c of this.cars) {
        c.z -= (this.speed - c.spd) * dt;
        if (c.z < -30) { c.z += 1800; c.x = (Math.random() - 0.5) * 1.4; }
        if (c.z > 1800) c.z -= 1800;
        if (c.z > -4 && c.z < 8 && Math.abs(c.x - this.x) < 0.42 && this.crash <= 0) { this.crash = 1.2; this.speed *= 0.3; this.io.audio.explosion(); c.z += 40; }
      }
      this.io.audio.engine(this.speed / 260);
      if (this.time <= 0) { this.time = 0; this.io.audio.engine(null); this.finish('TIME UP', `${Math.floor(this.dist)} M   ${this.gates} GATES`); }
    }
    this.tickOver(dt);
    // render
    const horizon = h * 0.42;
    const sky = ctx.createLinearGradient(0, 0, 0, horizon);
    sky.addColorStop(0, this.variant ? '#0a0530' : '#1a0a40'); sky.addColorStop(1, this.variant ? '#ff6a3d' : '#ff2d95');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, w, horizon);
    const curve = this.curveAt(this.pos);
    ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(w / 2 - curve * 60, horizon - 22, 34, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#12082a'; ctx.beginPath(); ctx.moveTo(0, horizon);
    for (let x = 0; x <= w; x += 20) ctx.lineTo(x, horizon - 20 - Math.abs(Math.sin((x + curve * 100) * 0.03 + 1)) * 30);
    ctx.lineTo(w, horizon); ctx.closePath(); ctx.fill();
    const carX = this.x;
    for (let y = Math.floor(horizon); y < h; y++) {
      const p = (y - horizon) / (h - horizon);
      const z = 1 / (p + 0.02);
      const stripe = Math.floor(z * 3 - this.pos * 0.08) % 2 === 0;
      ctx.fillStyle = stripe ? '#2e8b3a' : '#267a30'; ctx.fillRect(0, y, w, 1);
      const roadW = p * w * 0.95 + 6;
      const cx = w / 2 + curve * (1 - p) * (1 - p) * w * 0.5 - carX * roadW * 0.5;
      ctx.fillStyle = stripe ? '#4a4a55' : '#454550'; ctx.fillRect(cx - roadW / 2, y, roadW, 1);
      ctx.fillStyle = stripe ? '#fff' : '#d8202a'; ctx.fillRect(cx - roadW / 2 - roadW * 0.05, y, roadW * 0.05, 1); ctx.fillRect(cx + roadW / 2, y, roadW * 0.05, 1);
      if (stripe) { ctx.fillStyle = '#eee'; ctx.fillRect(cx - roadW * 0.01, y, roadW * 0.02, 1); }
    }
    const sorted = [...this.cars].filter(c => c.z > -5 && c.z < 900).sort((a, b) => b.z - a.z);
    for (const c of sorted) {
      const p = Math.max(0.02, 1 / (c.z / 25 + 1.05) - 0.02); // 0 far .. ~0.93 near
      const y = horizon + p * (h - horizon), roadW = p * w * 0.95 + 6;
      const cx = w / 2 + curve * (1 - p) * (1 - p) * w * 0.5 - carX * roadW * 0.5 + c.x * roadW * 0.5;
      const s = roadW * 0.3;
      ctx.fillStyle = c.col; ctx.fillRect(cx - s / 2, y - s * 0.5, s, s * 0.5);
      ctx.fillStyle = '#111'; ctx.fillRect(cx - s / 2, y - s * 0.1, s * 0.25, s * 0.15); ctx.fillRect(cx + s / 4, y - s * 0.1, s * 0.25, s * 0.15);
      ctx.fillStyle = '#ff3020'; ctx.fillRect(cx - s * 0.45, y - s * 0.42, s * 0.15, s * 0.08); ctx.fillRect(cx + s * 0.3, y - s * 0.42, s * 0.15, s * 0.08);
    }
    const pcx = w / 2 + (this.crash > 0 ? Math.sin(this.t * 40) * 6 : 0);
    ctx.fillStyle = this.variant ? '#22e5ff' : '#d8202a'; ctx.fillRect(pcx - 40, h - 46, 80, 30);
    ctx.fillStyle = '#111'; ctx.fillRect(pcx - 46, h - 30, 16, 16); ctx.fillRect(pcx + 30, h - 30, 16, 16);
    ctx.fillStyle = '#88ccff'; ctx.fillRect(pcx - 26, h - 44, 52, 10);
    ctx.textAlign = 'left'; ctx.font = `14px ${FONT}`; ctx.fillStyle = '#fff'; ctx.fillText(`${Math.floor(this.speed)} MPH`, 10, 22);
    ctx.textAlign = 'right'; ctx.fillStyle = '#ffd400'; ctx.fillText(`${Math.floor(this.dist)} M`, w - 10, 22);
    ctx.textAlign = 'center'; ctx.fillStyle = this.time < 10 ? '#ff2d95' : '#fff'; ctx.fillText(`TIME ${pad(this.time, 2)}`, w / 2, 22);
    if (this.over) this.banner(this.overText, this.overSub);
  }
  tickets() { return Math.floor(this.dist / 120) + this.gates * 6; }
  destroy() { this.io.audio.engine(null); }
}

// ---------------- Rhythm ----------------
export class Rhythm extends Base {
  constructor(ctx, w, h, io, variant = 0) {
    super(ctx, w, h, io);
    this.title = variant ? 'DANCE FEVER' : 'BEAT RUSH';
    this.help = '<kbd>D</kbd><kbd>F</kbd><kbd>J</kbd><kbd>K</kbd> or <kbd>←</kbd><kbd>↓</kbd><kbd>↑</kbd><kbd>→</kbd> hit the notes';
    this.variant = variant; this.combo = 0; this.maxCombo = 0; this.hits = 0; this.miss = 0; this.notes = []; this.flash = [0, 0, 0, 0]; this.judge = null; this.judgeT = 0;
    const bpm = 128, beat = 60 / bpm; this.duration = 45;
    let tt = 2.0, i = 0;
    while (tt < this.duration - 2) { const lane = (i * 7 + Math.floor(i / 3)) % 4; this.notes.push({ t: tt, lane, hit: false, missed: false }); if (i % 4 === 3) this.notes.push({ t: tt, lane: (lane + 2) % 4, hit: false, missed: false }); tt += (i % 5 === 4) ? beat / 2 : beat; i++; }
    this.laneKeys = { KeyD: 0, KeyF: 1, KeyJ: 2, KeyK: 3, ArrowLeft: 0, ArrowDown: 1, ArrowUp: 2, ArrowRight: 3 };
  }
  press(code) {
    const lane = this.laneKeys[code]; if (lane == null || this.over) return;
    this.flash[lane] = 0.15;
    let best = null;
    for (const n of this.notes) { if (n.lane !== lane || n.hit || n.missed) continue; const d = Math.abs(n.t - this.t); if (d < 0.22 && (!best || d < Math.abs(best.t - this.t))) best = n; }
    if (best) {
      best.hit = true; const d = Math.abs(best.t - this.t); const perfect = d < 0.09;
      this.combo++; this.maxCombo = Math.max(this.maxCombo, this.combo); this.hits++;
      this.score += (perfect ? 300 : 150) + Math.min(this.combo, 50) * 10;
      this.judge = perfect ? 'PERFECT' : 'GREAT'; this.judgeT = 0.4; this.io.audio.tone(perfect ? 1046 : 784, { type: 'square', dur: 0.08, vol: 0.12 });
    } else { this.combo = 0; this.judge = 'MISS'; this.judgeT = 0.4; this.io.audio.tone(200, { type: 'sawtooth', dur: 0.12, vol: 0.08 }); }
  }
  update(dt) {
    const { ctx, w, h } = this; this.t += dt; this.judgeT -= dt;
    if (!this.over) {
      for (const n of this.notes) if (!n.hit && !n.missed && this.t - n.t > 0.22) { n.missed = true; this.miss++; this.combo = 0; this.judge = 'MISS'; this.judgeT = 0.4; }
      if (this.t > this.duration) this.finish(this.hits > this.miss * 2 ? 'CLEARED!' : 'FAILED', `SCORE ${this.score}   MAX COMBO ${this.maxCombo}`);
    }
    this.tickOver(dt);
    ctx.fillStyle = this.variant ? '#100418' : '#080312'; ctx.fillRect(0, 0, w, h);
    const lanes = 4, lw = w * 0.14, x0 = w / 2 - (lanes * lw) / 2;
    const pal = ['#ff2d95', '#22e5ff', '#ffd400', '#3dff7a'];
    const hitY = h - 40, speed = h * 0.5;
    for (let l = 0; l < lanes; l++) {
      ctx.fillStyle = this.flash[l] > 0 ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.05)'; ctx.fillRect(x0 + l * lw, 0, lw - 2, h); this.flash[l] -= dt;
      ctx.strokeStyle = pal[l]; ctx.lineWidth = 2; ctx.strokeRect(x0 + l * lw + 4, hitY - 8, lw - 10, 16);
    }
    for (const n of this.notes) {
      if (n.hit) continue;
      const y = hitY - (n.t - this.t) * speed;
      if (y < -10 || y > h + 10) continue;
      ctx.fillStyle = n.missed ? '#553' : pal[n.lane]; ctx.shadowColor = pal[n.lane]; ctx.shadowBlur = n.missed ? 0 : 8;
      ctx.fillRect(x0 + n.lane * lw + 4, y - 5, lw - 10, 10);
    }
    ctx.shadowBlur = 0;
    ctx.textAlign = 'center'; ctx.font = `20px ${FONT}`;
    if (this.judgeT > 0 && this.judge) { ctx.fillStyle = this.judge === 'MISS' ? '#ff5a5a' : (this.judge === 'PERFECT' ? '#ffd400' : '#22e5ff'); ctx.fillText(this.judge, w / 2, h / 2); }
    ctx.font = `24px ${FONT}`; ctx.fillStyle = '#fff'; if (this.combo > 1) ctx.fillText(`${this.combo} COMBO`, w / 2, h / 2 + 30);
    ctx.font = `12px ${FONT}`; ctx.textAlign = 'left'; ctx.fillText(`SCORE ${pad(this.score, 6)}`, 8, 16);
    ctx.textAlign = 'right'; ctx.fillStyle = '#ffd400'; ctx.fillText(`${pad(Math.max(0, this.duration - this.t), 2)}s`, w - 8, 16);
    const keyLabels = ['D', 'F', 'J', 'K'];
    ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = `12px ${FONT}`;
    for (let l = 0; l < lanes; l++) ctx.fillText(keyLabels[l], x0 + l * lw + lw / 2, h - 8);
    if (this.over) this.banner(this.overText, this.overSub);
  }
  tickets() { return Math.floor(this.score / 400) + (this.hits > this.miss * 2 ? 15 : 0); }
}

// ---------------- Fighting game ----------------
export class Brawl extends Base {
  constructor(ctx, w, h, io) {
    super(ctx, w, h, io);
    this.title = 'STREET BRAWLERS II';
    this.help = '<kbd>A</kbd><kbd>D</kbd> move &nbsp; <kbd>Space</kbd> punch &nbsp; <kbd>S</kbd> block';
    this.p = { x: w * 0.3, hp: 100, punch: 0, block: false, cd: 0, hitT: 0 };
    this.e = { x: w * 0.7, hp: 100, punch: 0, block: false, cd: 0, hitT: 0, ai: 0 };
    this.round = 1; this.timer = 60; this.wins = 0;
  }
  press(code) { if (code === 'Space') this.attack(this.p, this.e); }
  attack(a, d) {
    if (a.cd > 0 || this.over || this.roundOver) return;
    a.punch = 0.22; a.cd = 0.42;
    const dist = Math.abs(a.x - d.x);
    if (dist < 52) {
      if (d.block) { this.io.audio.tick(); d.hp -= 2; } else { d.hp -= 9 + Math.random() * 4; d.hitT = 0.25; this.io.audio.hit(); if (a === this.p) this.score += 120; }
      if (d.hp <= 0) this.endRound(a === this.p);
    } else this.io.audio.swish();
  }
  endRound(won) {
    this.roundOver = 1.8; this.roundText = won ? 'K.O.!' : 'YOU LOSE';
    if (won) { this.wins++; this.score += 500 + Math.floor(this.timer) * 5; this.io.audio.win(); } else this.io.audio.lose();
    if (this.wins >= 2 || (!won && this.round >= 3)) { this.finish(this.wins >= 2 ? 'YOU WIN!' : 'DEFEAT', `SCORE ${this.score}`); this.roundOver = 99; }
  }
  update(dt) {
    const { ctx, w, h } = this; this.t += dt;
    const p = this.p, e = this.e;
    if (!this.over) {
      if (this.roundOver) { this.roundOver -= dt; if (this.roundOver <= 0) { this.roundOver = 0; this.round++; p.hp = 100; e.hp = 100; this.timer = 60; p.x = w * 0.3; e.x = w * 0.7; } }
      else {
        this.timer -= dt;
        if (this.timer <= 0) this.endRound(p.hp >= e.hp);
        p.block = this.downKey();
        if (!p.block) { if (this.left()) p.x -= 120 * dt; if (this.right()) p.x += 120 * dt; }
        // enemy AI
        e.ai -= dt;
        const dist = e.x - p.x;
        if (e.ai <= 0) { e.ai = 0.3 + Math.random() * 0.5; e.mode = Math.random() < 0.25 ? 'block' : (Math.random() < 0.6 ? 'attack' : 'retreat'); }
        e.block = e.mode === 'block';
        if (e.mode === 'attack') { if (Math.abs(dist) > 46) e.x -= Math.sign(dist) * 95 * dt; else if (Math.random() < dt * 2.5) this.attack(e, p); }
        else if (e.mode === 'retreat' && Math.abs(dist) < 90) e.x += Math.sign(dist) * 70 * dt;
        p.x = Math.max(24, Math.min(w - 24, p.x)); e.x = Math.max(24, Math.min(w - 24, e.x));
        if (Math.abs(e.x - p.x) < 30) { const m = (p.x + e.x) / 2; p.x = m - 15 * Math.sign(e.x - p.x || 1); e.x = m + 15 * Math.sign(e.x - p.x || 1); }
      }
      for (const f of [p, e]) { f.punch -= dt; f.cd -= dt; f.hitT -= dt; }
    }
    this.tickOver(dt);
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#2a0a3a'); g.addColorStop(0.6, '#ff6a3d'); g.addColorStop(0.61, '#5a3a2a'); g.addColorStop(1, '#2a1a12');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#1a0a20';
    for (let i = 0; i < 20; i++) { const x = i * 17, y = h * 0.5 + Math.sin(this.t * 5 + i) * 3; ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(x - 9, y, 18, 20); }
    const floorY = h * 0.85;
    const draw = (f, dir, col) => {
      const y = floorY + Math.sin(this.t * 10 + dir) * 2;
      ctx.fillStyle = f.hitT > 0 ? '#fff' : col;
      ctx.fillRect(f.x - 12, y - 60, 24, 34); ctx.fillRect(f.x - 6, y - 26, 10, 26); ctx.fillRect(f.x + 2, y - 26, 10, 26);
      ctx.beginPath(); ctx.arc(f.x, y - 70, 10, 0, Math.PI * 2); ctx.fill();
      if (f.block) { ctx.fillStyle = '#ffd400'; ctx.fillRect(f.x + dir * 14, y - 66, dir * 6, 34); }
      else ctx.fillRect(f.x + dir * (f.punch > 0 ? 12 : 6), y - 56, dir * (f.punch > 0 ? 30 : 12), 8);
    };
    draw(p, p.x < e.x ? 1 : -1, '#3d9cff'); draw(e, e.x < p.x ? 1 : -1, '#ff3d5a');
    ctx.fillStyle = '#111'; ctx.fillRect(10, 12, w / 2 - 30, 10); ctx.fillRect(w / 2 + 20, 12, w / 2 - 30, 10);
    ctx.fillStyle = '#ffd400'; ctx.fillRect(10, 12, (w / 2 - 30) * Math.max(0, p.hp) / 100, 10);
    const ew = (w / 2 - 30) * Math.max(0, e.hp) / 100; ctx.fillRect(w - 10 - ew, 12, ew, 10);
    ctx.textAlign = 'center'; ctx.font = `16px ${FONT}`; ctx.fillStyle = '#fff'; ctx.fillText(pad(this.timer, 2), w / 2, 22);
    ctx.font = `10px ${FONT}`; ctx.fillText(`ROUND ${this.round}   WINS ${this.wins}`, w / 2, 36);
    if (this.roundOver && !this.over) this.banner(this.roundText, '');
    if (this.over) this.banner(this.overText, this.overSub);
  }
  tickets() { return Math.floor(this.score / 60) + this.wins * 10; }
}

// ---------------- Light-gun shooter ----------------
export class Gun extends Base {
  constructor(ctx, w, h, io) {
    super(ctx, w, h, io);
    this.title = 'ZOMBIE ALLEY';
    this.help = 'Mouse to aim &nbsp; <kbd>Click</kbd> shoot &nbsp; <kbd>R</kbd> reload';
    this.cx = w / 2; this.cy = h / 2; this.ammo = 6; this.reloading = 0; this.hp = 3; this.time = 45; this.zs = []; this.flash = 0; this.spawnT = 0; this.kills = 0;
  }
  mouseMove(dx, dy) { this.cx = Math.max(0, Math.min(this.w, this.cx + dx * 0.55)); this.cy = Math.max(0, Math.min(this.h, this.cy + dy * 0.55)); }
  press(code) { if (code === 'KeyR') this.reload(); if (code === 'Space') this.mouseDown(); }
  reload() { if (this.reloading <= 0 && this.ammo < 6) { this.reloading = 0.9; this.io.audio.tick(); } }
  mouseDown() {
    if (this.over || this.reloading > 0) return;
    if (this.ammo <= 0) { this.reload(); return; }
    this.ammo--; this.flash = 0.06; this.io.audio.laser(); this.io.audio.noise({ dur: 0.15, vol: 0.2, freq: 800, type: 'lowpass' });
    let hit = null;
    for (const z of this.zs) { const s = 0.5 + z.y; const yy = this.h * 0.35 + z.y * (this.h * 0.6); if (Math.abs(this.cx - z.x) < 16 * s && this.cy > yy - 70 * s && this.cy < yy) { if (!hit || z.y > hit.y) hit = z; } }
    if (hit) { hit.dead = 0.3; this.kills++; this.score += 100 + Math.floor((1 - hit.y) * 200); this.io.audio.explosion(); }
    if (this.ammo === 0) this.reload();
  }
  update(dt) {
    const { ctx, w, h } = this; this.t += dt; this.flash -= dt;
    if (!this.over) {
      this.time -= dt; this.spawnT -= dt;
      if (this.reloading > 0) { this.reloading -= dt; if (this.reloading <= 0) this.ammo = 6; }
      if (this.spawnT <= 0) { this.spawnT = Math.max(0.5, 1.6 - this.t * 0.02); this.zs.push({ x: 40 + Math.random() * (w - 80), y: 0.05, spd: 0.06 + Math.random() * 0.06 + this.t * 0.001, p: Math.random() * 6 }); }
      for (const z of this.zs) {
        if (z.dead != null) { z.dead -= dt; continue; }
        z.y += z.spd * dt; z.x += Math.sin(this.t * 1.5 + z.p) * 12 * dt;
        if (z.y > 0.95) { z.dead = 0.01; this.hp--; this.io.audio.thud(); if (this.hp <= 0) this.finish('YOU DIED', `SCORE ${this.score}`); }
      }
      this.zs = this.zs.filter(z => z.dead == null || z.dead > 0);
      if (this.time <= 0) { this.time = 0; this.finish('SURVIVED!', `SCORE ${this.score}   ${this.kills} KILLS`); }
    }
    this.tickOver(dt);
    const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#02050a'); g.addColorStop(1, '#0d1a12');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(120,160,120,0.25)'; ctx.lineWidth = 1;
    for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.moveTo(w / 2, h * 0.35); ctx.lineTo((i / 8) * w, h); ctx.stroke(); }
    const flick = 0.5 + Math.sin(this.t * 30) * 0.15 + Math.sin(this.t * 7) * 0.2;
    ctx.fillStyle = `rgba(200,255,200,${0.05 * flick})`; ctx.fillRect(0, 0, w, h);
    for (const z of [...this.zs].sort((a, b) => a.y - b.y)) {
      const s = 0.5 + z.y; const yy = h * 0.35 + z.y * (h * 0.6);
      ctx.fillStyle = z.dead != null ? '#a03030' : '#1f3a22';
      ctx.fillRect(z.x - 10 * s, yy - 50 * s, 20 * s, 40 * s);
      ctx.beginPath(); ctx.arc(z.x, yy - 58 * s, 10 * s, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ff2020'; ctx.fillRect(z.x - 5 * s, yy - 60 * s, 3 * s, 3 * s); ctx.fillRect(z.x + 2 * s, yy - 60 * s, 3 * s, 3 * s);
      ctx.fillStyle = z.dead != null ? '#a03030' : '#1f3a22'; ctx.fillRect(z.x - 16 * s, yy - 44 * s, 12 * s, 5 * s); ctx.fillRect(z.x + 4 * s, yy - 44 * s, 12 * s, 5 * s);
    }
    if (this.flash > 0) { ctx.fillStyle = 'rgba(255,255,200,0.45)'; ctx.fillRect(0, 0, w, h); }
    ctx.strokeStyle = this.reloading > 0 ? '#ff5a5a' : '#3dff7a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(this.cx, this.cy, 14, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(this.cx - 22, this.cy); ctx.lineTo(this.cx + 22, this.cy); ctx.moveTo(this.cx, this.cy - 22); ctx.lineTo(this.cx, this.cy + 22); ctx.stroke();
    ctx.font = `12px ${FONT}`; ctx.textAlign = 'left'; ctx.fillStyle = '#3dff7a'; ctx.fillText(this.reloading > 0 ? 'RELOADING' : `AMMO ${'|'.repeat(this.ammo)}`, 8, h - 8);
    ctx.textAlign = 'right'; ctx.fillStyle = '#fff'; ctx.fillText(`SCORE ${pad(this.score, 5)}   ${'♥'.repeat(Math.max(0, this.hp))}`, w - 8, 16);
    ctx.textAlign = 'center'; ctx.fillStyle = '#ffd400'; ctx.fillText(`${pad(this.time, 2)}`, w / 2, 16);
    if (this.over) this.banner(this.overText, this.overSub);
  }
  tickets() { return Math.floor(this.score / 120) + (this.hp > 0 && this.time <= 0 ? 20 : 0); }
}

// ---------------- Pinball ----------------
export class Pinball extends Base {
  constructor(ctx, w, h, io, variant = 0) {
    super(ctx, w, h, io);
    this.title = variant ? 'DRAGON FIRE' : 'COSMIC PINBALL';
    this.help = '<kbd>←</kbd><kbd>→</kbd> flippers &nbsp; hold <kbd>Space</kbd> plunger';
    this.variant = variant; this.balls = 3; this.pal = variant ? ['#0a0a3a', '#ff6a00', '#ffd400'] : ['#1a0030', '#ff2d95', '#22e5ff'];
    this.bumpers = [{ x: w * 0.35, y: h * 0.28, r: 14, f: 0 }, { x: w * 0.65, y: h * 0.28, r: 14, f: 0 }, { x: w * 0.5, y: h * 0.42, r: 14, f: 0 }, { x: w * 0.25, y: h * 0.5, r: 10, f: 0 }, { x: w * 0.75, y: h * 0.5, r: 10, f: 0 }];
    this.flipL = 0; this.flipR = 0; this.plunge = 0; this.newBall();
  }
  newBall() { this.ball = { x: this.w - 18, y: this.h - 60, vx: 0, vy: 0, inLane: true }; this.ballsUsed = (this.ballsUsed || 0); }
  update(dt) {
    const { ctx, w, h } = this; this.t += dt;
    const b = this.ball, G = 380;
    if (!this.over) {
      const fl = this.left(), fr = this.right();
      this.flipL += ((fl ? 1 : 0) - this.flipL) * Math.min(1, dt * 22); this.flipR += ((fr ? 1 : 0) - this.flipR) * Math.min(1, dt * 22);
      if (b.inLane) {
        if (this.keys.has('Space')) this.plunge = Math.min(1, this.plunge + dt * 1.2);
        else if (this.plunge > 0) { b.vy = -(320 + this.plunge * 380); b.inLane = false; this.plunge = 0; this.io.audio.pop(); }
      }
      if (!b.inLane || b.vy !== 0) {
        b.vy += G * dt; b.x += b.vx * dt; b.y += b.vy * dt;
        // walls
        const leftW = 12, rightW = b.y < h * 0.2 ? w - 12 : w - 30;
        if (b.x < leftW) { b.x = leftW; b.vx = Math.abs(b.vx) * 0.7; }
        if (b.x > rightW && !(b.y > h * 0.8 && b.x > w - 30)) { b.x = rightW; b.vx = -Math.abs(b.vx) * 0.7; }
        if (b.x > w - 30 && b.y > h * 0.2 && b.vy > 0 && b.x < w - 12) { /* falling back into lane */ }
        if (b.y < 14) { b.y = 14; b.vy = Math.abs(b.vy) * 0.6; }
        // top arch: nudge to the left off the lane
        if (b.y < h * 0.12 && b.x > w - 40) b.vx -= 200 * dt;
        // bumpers
        for (const bp of this.bumpers) {
          const dx = b.x - bp.x, dy = b.y - bp.y, d = Math.hypot(dx, dy);
          if (d < bp.r + 5) { const nx = dx / d, ny = dy / d; b.x = bp.x + nx * (bp.r + 5); const dot = b.vx * nx + b.vy * ny; b.vx = (b.vx - 2 * dot * nx) * 0.9 + nx * 160; b.vy = (b.vy - 2 * dot * ny) * 0.9 + ny * 160; this.score += 100; bp.f = 0.15; this.io.audio.tone(900 + Math.random() * 300, { type: 'square', dur: 0.06, vol: 0.1 }); }
          bp.f -= dt;
        }
        // slanted lower guides
        const guideY = (x) => (x < w / 2 ? h * 0.72 + (x - 12) * 0.35 : h * 0.72 + (w - 30 - x) * 0.35);
        if (b.y > guideY(b.x) && (b.x < w * 0.28 || b.x > w * 0.72) && b.x < w - 30) { b.y = guideY(b.x); const s = b.x < w / 2 ? 1 : -1; b.vx += s * 60 * dt + s * 30; b.vy = -Math.abs(b.vy) * 0.3; }
        // flippers: segments from pivots
        const fy = h * 0.86, len = 40;
        const flip = (px, dir, amt) => {
          const ang = dir * (0.55 - amt * 1.1);
          const ex = px + dir * Math.cos(ang) * len, ey = fy + Math.sin(ang) * len;
          const abx = ex - px, aby = ey - fy; const t = Math.max(0, Math.min(1, ((b.x - px) * abx + (b.y - fy) * aby) / (abx * abx + aby * aby)));
          const cx = px + abx * t, cy = fy + aby * t; const dx = b.x - cx, dy = b.y - cy, d = Math.hypot(dx, dy);
          if (d < 8 && d > 0) { const nx = dx / d, ny = dy / d; b.x = cx + nx * 8; b.y = cy + ny * 8; const dot = b.vx * nx + b.vy * ny; if (dot < 0) { b.vx -= 2 * dot * nx * 0.8; b.vy -= 2 * dot * ny * 0.8; } if (amt > 0.3 && ny < 0) { b.vy -= 380 * (0.5 + t); b.vx += dir * 80; this.io.audio.tick(); } }
          return [px, fy, ex, ey];
        };
        this.segL = flip(w * 0.3, 1, this.flipL); this.segR = flip(w * 0.7, -1, this.flipR);
        // drain
        if (b.y > h + 10) { this.balls--; this.io.audio.lose(); if (this.balls <= 0) this.finish('GAME OVER', `SCORE ${this.score}`); else this.newBall(); }
        // lane re-entry
        if (b.x > w - 30 && b.y > h * 0.5 && b.vy > 0) { b.inLane = true; b.x = w - 18; b.vx = 0; b.vy = 0; b.y = Math.min(b.y, h - 60); }
        if (b.inLane && b.vy !== 0) { b.y += b.vy * dt; if (b.y > h - 60) { b.y = h - 60; b.vy = 0; } }
      }
    }
    this.tickOver(dt);
    // draw
    ctx.fillStyle = this.pal[0]; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = this.pal[2]; ctx.lineWidth = 3; ctx.strokeRect(6, 6, w - 12, h);
    ctx.beginPath(); ctx.moveTo(w - 30, h * 0.2); ctx.lineTo(w - 30, h); ctx.stroke();
    for (const bp of this.bumpers) { ctx.fillStyle = bp.f > 0 ? '#fff' : this.pal[1]; ctx.beginPath(); ctx.arc(bp.x, bp.y, bp.r, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = this.pal[2]; ctx.stroke(); }
    ctx.strokeStyle = this.pal[2]; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(12, h * 0.72); ctx.lineTo(w * 0.28, h * 0.72 + (w * 0.28 - 12) * 0.35); ctx.moveTo(w - 30, h * 0.72); ctx.lineTo(w * 0.72, h * 0.72 + (w - 30 - w * 0.72) * 0.35); ctx.stroke();
    ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.strokeStyle = '#ffd400';
    for (const s of [this.segL, this.segR]) if (s) { ctx.beginPath(); ctx.moveTo(s[0], s[1]); ctx.lineTo(s[2], s[3]); ctx.stroke(); }
    ctx.lineCap = 'butt';
    ctx.fillStyle = '#ddd'; ctx.beginPath(); ctx.arc(b.x, b.y, 6, 0, Math.PI * 2); ctx.fill();
    if (b.inLane) { ctx.fillStyle = '#ff5a5a'; ctx.fillRect(w - 24, h - 50 + this.plunge * 20, 12, 30 - this.plunge * 20); }
    ctx.font = `12px ${FONT}`; ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.fillText(`${pad(this.score, 7)}`, 12, 20);
    ctx.textAlign = 'right'; ctx.fillStyle = '#ffd400'; ctx.fillText(`BALL ${4 - this.balls}/3`, w - 36, 20);
    if (b.inLane && !this.over && this.plunge === 0) { ctx.textAlign = 'center'; ctx.fillStyle = Math.floor(this.t * 2) % 2 ? '#fff' : this.pal[1]; ctx.fillText('HOLD SPACE', w / 2, h * 0.6); }
    if (this.over) this.banner(this.overText, this.overSub);
  }
  tickets() { return Math.floor(this.score / 350); }
}

export function createMiniGame(kind, ctx, w, h, io, variant = 0) {
  switch (kind) {
    case 'shooter': return new Shooter(ctx, w, h, io, variant);
    case 'breakout': return new Breakout(ctx, w, h, io);
    case 'racer': return new Racer(ctx, w, h, io, variant);
    case 'rhythm': return new Rhythm(ctx, w, h, io, variant);
    case 'brawl': return new Brawl(ctx, w, h, io);
    case 'gun': return new Gun(ctx, w, h, io);
    case 'pinball': return new Pinball(ctx, w, h, io, variant);
    default: return new Shooter(ctx, w, h, io, variant);
  }
}
