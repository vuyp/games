// Animated canvas "attract mode" screens shared across cabinets of the same game,
// plus private canvases handed to playable games.
import * as THREE from 'three';
import { makeCanvas, mulberry32 } from './textures.js';
import { updatables } from './world.js';

const FONT = '"Bungee", Impact, "Arial Black", sans-serif';
const MONO = '"Share Tech Mono", ui-monospace, monospace';

function pad(n, len) { return String(Math.floor(n)).padStart(len, '0'); }
function blink(t, rate = 1) { return Math.floor(t * rate) % 2 === 0; }

function starsInit(state, w, h, rnd, count = 90) {
  state.stars = Array.from({ length: count }, () => ({ x: rnd() * w, y: rnd() * h, s: 0.5 + rnd() * 1.6, b: 0.3 + rnd() * 0.7 }));
}

export const ATTRACT = {
  galaxy(ctx, w, h, t, st, v) {
    if (!st.stars) { starsInit(st, w, h, st.rnd); st.booms = []; }
    ctx.fillStyle = v === 1 ? '#03000f' : '#000308'; ctx.fillRect(0, 0, w, h);
    for (const s of st.stars) {
      s.y += s.s * 1.6; if (s.y > h) { s.y = 0; s.x = st.rnd() * w; }
      ctx.fillStyle = `rgba(200,220,255,${s.b})`; ctx.fillRect(s.x, s.y, s.s, s.s);
    }
    // enemy formation
    const ox = Math.sin(t * 0.9) * 30, oy = 40 + Math.sin(t * 0.4) * 8;
    const colors = v === 1 ? ['#ff3cac', '#ffd23f', '#26e5ff', '#8cff5a'] : ['#ff5a5a', '#ffb02e', '#5ad2ff', '#c46bff'];
    for (let r = 0; r < 4; r++) for (let c = 0; c < 8; c++) {
      const x = w / 2 - 105 + c * 30 + ox, y = oy + r * 24 + Math.sin(t * 3 + c) * 2;
      if ((c * 7 + r * 3 + Math.floor(t / 2)) % 11 === 0) continue; // "destroyed" gaps
      ctx.fillStyle = colors[r];
      ctx.fillRect(x - 8, y - 4, 16, 8); ctx.fillRect(x - 12, y, 4, 6); ctx.fillRect(x + 8, y, 4, 6);
      ctx.fillStyle = '#000'; ctx.fillRect(x - 5, y - 2, 3, 3); ctx.fillRect(x + 2, y - 2, 3, 3);
    }
    // player
    const px = w / 2 + Math.sin(t * 1.3) * 90;
    ctx.fillStyle = v === 1 ? '#26e5ff' : '#7dff6a';
    ctx.beginPath(); ctx.moveTo(px, h - 40); ctx.lineTo(px + 14, h - 16); ctx.lineTo(px - 14, h - 16); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillRect(px - 2, h - 34, 4, 10);
    // bullets
    for (let i = 0; i < 3; i++) {
      const by = h - 40 - ((t * 260 + i * 90) % (h - 40));
      ctx.fillStyle = '#fff'; ctx.fillRect(px - 1 + Math.sin(t * 1.3 + i) * 0, by, 2, 10);
    }
    // explosions
    if (st.rnd() < 0.05) st.booms.push({ x: w / 2 - 105 + Math.floor(st.rnd() * 8) * 30 + ox, y: oy + Math.floor(st.rnd() * 4) * 24, a: 1 });
    st.booms = st.booms.filter(b => b.a > 0);
    for (const b of st.booms) {
      ctx.strokeStyle = `rgba(255,${160 + b.a * 90},60,${b.a})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(b.x, b.y, (1 - b.a) * 24, 0, Math.PI * 2); ctx.stroke(); b.a -= 0.08;
    }
    // hud
    ctx.font = `12px ${FONT}`; ctx.fillStyle = '#fff'; ctx.textAlign = 'left';
    ctx.fillText(`1UP  ${pad(4520 + Math.floor(t * 37) % 9000, 6)}`, 8, 16);
    ctx.textAlign = 'right'; ctx.fillStyle = '#ffd23f'; ctx.fillText(`HI  ${v === 1 ? '412900' : '128900'}`, w - 8, 16);
    if (t % 12 < 4) {
      ctx.textAlign = 'center';
      ctx.font = `${v === 1 ? 26 : 30}px ${FONT}`;
      ctx.lineWidth = 6; ctx.strokeStyle = '#1a0040'; ctx.strokeText(v === 1 ? 'STAR RAIDERS' : 'GALAXY DEFENDER', w / 2, h / 2 + 8);
      ctx.fillStyle = v === 1 ? '#ffd23f' : '#26e5ff'; ctx.fillText(v === 1 ? 'STAR RAIDERS' : 'GALAXY DEFENDER', w / 2, h / 2 + 8);
    }
    if (blink(t, 1.5)) { ctx.textAlign = 'center'; ctx.font = `12px ${FONT}`; ctx.fillStyle = '#fff'; ctx.fillText('SWIPE CARD TO PLAY', w / 2, h - 4); }
  },

  breaker(ctx, w, h, t, st) {
    if (!st.ball) st.ball = { x: w / 2, y: h * 0.6, vx: 2.4, vy: -3 };
    ctx.fillStyle = '#05020c'; ctx.fillRect(0, 0, w, h);
    const cols = 10, rows = 6, bw = (w - 20) / cols, bh = 12;
    const pal = ['#ff2d95', '#ff6a00', '#ffd400', '#3dff7a', '#22e5ff', '#8a3dff'];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      if ((c * 5 + r * 3 + Math.floor(t / 1.5)) % 9 === 0) continue;
      ctx.fillStyle = pal[r];
      ctx.shadowColor = pal[r]; ctx.shadowBlur = 6;
      ctx.fillRect(10 + c * bw + 1, 30 + r * (bh + 3), bw - 2, bh);
    }
    ctx.shadowBlur = 0;
    const b = st.ball;
    b.x += b.vx; b.y += b.vy;
    if (b.x < 4 || b.x > w - 4) b.vx *= -1;
    if (b.y < 4) b.vy *= -1;
    if (b.y > h - 22) { b.vy = -Math.abs(b.vy); }
    if (b.y < 30 + rows * (bh + 3) && b.y > 30 && st.rnd() < 0.08) b.vy *= -1;
    const px = b.x + Math.sin(t * 2) * 10;
    ctx.fillStyle = '#fff'; ctx.shadowColor = '#22e5ff'; ctx.shadowBlur = 10;
    ctx.fillRect(px - 26, h - 16, 52, 6);
    ctx.beginPath(); ctx.arc(b.x, b.y, 4, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.font = `12px ${FONT}`; ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.fillText(`SCORE ${pad((t * 91) % 99999, 5)}`, 8, 16);
    ctx.textAlign = 'right'; ctx.fillStyle = '#ffd400'; ctx.fillText('LEVEL 7', w - 8, 16);
    if (t % 10 < 3) {
      ctx.textAlign = 'center'; ctx.font = `30px ${FONT}`;
      ctx.lineWidth = 6; ctx.strokeStyle = '#3a0060'; ctx.strokeText('NEON BREAKER', w / 2, h / 2 + 30);
      ctx.fillStyle = '#ff2d95'; ctx.fillText('NEON BREAKER', w / 2, h / 2 + 30);
    }
  },

  racer(ctx, w, h, t, st, v) {
    // Pseudo-3D road
    const horizon = h * 0.42;
    const sky = ctx.createLinearGradient(0, 0, 0, horizon);
    sky.addColorStop(0, v === 1 ? '#0a0530' : '#1a0a40'); sky.addColorStop(1, v === 1 ? '#ff6a3d' : '#ff2d95');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, w, horizon);
    // sun
    ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(w / 2 + Math.sin(t * 0.3) * 40, horizon - 20, 34, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = v === 1 ? '#ff6a3d' : '#ff2d95';
    for (let i = 0; i < 5; i++) ctx.fillRect(w / 2 + Math.sin(t * 0.3) * 40 - 40, horizon - 22 + i * 7, 80, 3);
    // mountains
    ctx.fillStyle = '#12082a';
    ctx.beginPath(); ctx.moveTo(0, horizon);
    for (let x = 0; x <= w; x += 20) ctx.lineTo(x, horizon - 20 - Math.abs(Math.sin(x * 0.03 + 1)) * 30);
    ctx.lineTo(w, horizon); ctx.closePath(); ctx.fill();
    const curve = Math.sin(t * 0.5) * 0.8;
    for (let y = Math.floor(horizon); y < h; y++) {
      const p = (y - horizon) / (h - horizon); // 0 near horizon, 1 at bottom
      const z = 1 / (p + 0.02);
      const stripe = Math.floor(z * 3 - t * 12) % 2 === 0;
      ctx.fillStyle = stripe ? '#2e8b3a' : '#267a30';
      ctx.fillRect(0, y, w, 1);
      const roadW = p * w * 0.95 + 6;
      const cx = w / 2 + curve * (1 - p) * (1 - p) * w * 0.5;
      ctx.fillStyle = stripe ? '#4a4a55' : '#454550';
      ctx.fillRect(cx - roadW / 2, y, roadW, 1);
      ctx.fillStyle = stripe ? '#fff' : '#d8202a';
      ctx.fillRect(cx - roadW / 2 - roadW * 0.05, y, roadW * 0.05, 1);
      ctx.fillRect(cx + roadW / 2, y, roadW * 0.05, 1);
      if (stripe) { ctx.fillStyle = '#eee'; ctx.fillRect(cx - roadW * 0.01, y, roadW * 0.02, 1); }
    }
    // rival car
    const rp = 0.55 + Math.sin(t * 0.8) * 0.15;
    const ry = horizon + rp * (h - horizon), rs = rp * 70 + 6;
    const rcx = w / 2 + curve * (1 - rp) * (1 - rp) * w * 0.5 + Math.sin(t) * 30 * rp;
    ctx.fillStyle = '#ffd400'; ctx.fillRect(rcx - rs / 2, ry - rs * 0.5, rs, rs * 0.5);
    ctx.fillStyle = '#111'; ctx.fillRect(rcx - rs / 2, ry - rs * 0.1, rs * 0.25, rs * 0.15); ctx.fillRect(rcx + rs / 4, ry - rs * 0.1, rs * 0.25, rs * 0.15);
    // player car
    const pcx = w / 2 + Math.sin(t * 1.7) * 14;
    ctx.fillStyle = v === 1 ? '#22e5ff' : '#d8202a';
    ctx.fillRect(pcx - 40, h - 46, 80, 30);
    ctx.fillStyle = '#111'; ctx.fillRect(pcx - 46, h - 30, 16, 16); ctx.fillRect(pcx + 30, h - 30, 16, 16);
    ctx.fillStyle = '#88ccff'; ctx.fillRect(pcx - 26, h - 44, 52, 10);
    // hud
    ctx.textAlign = 'left'; ctx.font = `14px ${FONT}`; ctx.fillStyle = '#fff';
    ctx.fillText(`${Math.floor(190 + Math.sin(t * 2) * 20)} MPH`, 10, 22);
    ctx.textAlign = 'right'; ctx.fillStyle = '#ffd400'; ctx.fillText(`LAP 2/3`, w - 10, 22);
    ctx.textAlign = 'center'; ctx.fillStyle = blink(t, 2) ? '#fff' : '#ff2d95'; ctx.font = `12px ${FONT}`;
    ctx.fillText(`TIME ${pad(60 - (t % 60), 2)}`, w / 2, 22);
    if (t % 14 < 4) {
      ctx.font = `34px ${FONT}`; ctx.lineWidth = 8; ctx.strokeStyle = '#2a0040';
      const title = v === 1 ? 'NITRO RUSH' : 'TURBO DRIFT GP';
      ctx.strokeText(title, w / 2, h / 2 + 10); ctx.fillStyle = '#ffd23f'; ctx.fillText(title, w / 2, h / 2 + 10);
    }
  },

  beat(ctx, w, h, t, st) {
    ctx.fillStyle = '#080312'; ctx.fillRect(0, 0, w, h);
    const lanes = 4, lw = 40, x0 = w / 2 - (lanes * lw) / 2;
    const pal = ['#ff2d95', '#22e5ff', '#ffd400', '#3dff7a'];
    for (let l = 0; l < lanes; l++) {
      ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fillRect(x0 + l * lw, 0, lw - 2, h);
      for (let k = 0; k < 6; k++) {
        const y = ((t * 160 + k * 63 + l * 37) % (h + 20)) - 10;
        ctx.fillStyle = pal[l]; ctx.shadowColor = pal[l]; ctx.shadowBlur = 8;
        ctx.fillRect(x0 + l * lw + 4, y, lw - 10, 8);
      }
    }
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff'; ctx.fillRect(x0 - 6, h - 40, lanes * lw + 10, 3);
    for (let l = 0; l < lanes; l++) { ctx.strokeStyle = pal[l]; ctx.lineWidth = 2; ctx.strokeRect(x0 + l * lw + 4, h - 46, lw - 10, 14); }
    ctx.textAlign = 'center'; ctx.font = `16px ${FONT}`;
    const words = ['PERFECT', 'GREAT', 'PERFECT', 'COOL'];
    ctx.fillStyle = pal[Math.floor(t * 3) % 4]; ctx.fillText(words[Math.floor(t * 3) % 4], w / 2, h / 2);
    ctx.font = `22px ${FONT}`; ctx.fillStyle = '#fff'; ctx.fillText(`${Math.floor(t * 4) % 999} COMBO`, w / 2, h / 2 + 26);
    ctx.font = `12px ${FONT}`; ctx.textAlign = 'left'; ctx.fillText('BEAT RUSH', 8, 16);
    ctx.textAlign = 'right'; ctx.fillStyle = '#ffd400'; ctx.fillText(`${pad((t * 777) % 999999, 6)}`, w - 8, 16);
    // audio bars
    for (let i = 0; i < 16; i++) {
      const bh = 6 + Math.abs(Math.sin(t * 6 + i * 0.8)) * 26;
      ctx.fillStyle = pal[i % 4]; ctx.fillRect(8 + i * 8, h - 8 - bh, 6, bh);
    }
  },

  brawl(ctx, w, h, t, st) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#2a0a3a'); g.addColorStop(0.6, '#ff6a3d'); g.addColorStop(0.61, '#5a3a2a'); g.addColorStop(1, '#2a1a12');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    // crowd silhouettes
    ctx.fillStyle = '#1a0a20';
    for (let i = 0; i < 20; i++) { const x = i * 17, y = h * 0.5 + Math.sin(t * 5 + i) * 3; ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(x - 9, y, 18, 20); }
    const floorY = h * 0.85;
    const fighter = (x, dir, col, bob) => {
      const y = floorY + Math.sin(t * 10 + bob) * 3;
      ctx.fillStyle = col; ctx.fillRect(x - 12, y - 60, 24, 34);
      ctx.fillRect(x - 6, y - 26, 10, 26); ctx.fillRect(x + 2, y - 26, 10, 26);
      ctx.beginPath(); ctx.arc(x, y - 70, 10, 0, Math.PI * 2); ctx.fill();
      const punch = Math.sin(t * 6 + bob) > 0.6;
      ctx.fillRect(x + dir * (punch ? 12 : 6), y - 56, dir * (punch ? 26 : 12), 8);
    };
    const d = Math.sin(t * 1.5) * 20;
    fighter(w * 0.35 + d, 1, '#3d9cff', 0);
    fighter(w * 0.65 - d, -1, '#ff3d5a', 2);
    // health bars
    ctx.fillStyle = '#111'; ctx.fillRect(10, 12, w / 2 - 30, 10); ctx.fillRect(w / 2 + 20, 12, w / 2 - 30, 10);
    ctx.fillStyle = '#ffd400'; ctx.fillRect(10, 12, (w / 2 - 30) * (0.5 + Math.sin(t) * 0.3), 10);
    ctx.fillRect(w / 2 + 20 + (w / 2 - 30) * (0.3 - Math.sin(t * 0.7) * 0.25), 12, (w / 2 - 30) * (0.7 + Math.sin(t * 0.7) * 0.25), 10);
    ctx.textAlign = 'center'; ctx.font = `16px ${FONT}`; ctx.fillStyle = '#fff'; ctx.fillText(pad(99 - (t % 99), 2), w / 2, 22);
    if (t % 8 < 1.5) { ctx.font = `40px ${FONT}`; ctx.lineWidth = 8; ctx.strokeStyle = '#000'; ctx.strokeText('K.O.', w / 2, h / 2); ctx.fillStyle = '#ffd400'; ctx.fillText('K.O.', w / 2, h / 2); }
    else if (t % 8 > 6) { ctx.font = `24px ${FONT}`; ctx.lineWidth = 6; ctx.strokeStyle = '#000'; ctx.strokeText('STREET BRAWLERS II', w / 2, h / 2); ctx.fillStyle = '#ff3d5a'; ctx.fillText('STREET BRAWLERS II', w / 2, h / 2); }
  },

  zombie(ctx, w, h, t, st) {
    if (!st.z) st.z = Array.from({ length: 5 }, (_, i) => ({ x: 60 + i * 90, y: 0.4 + (i % 3) * 0.2, p: i }));
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#02050a'); g.addColorStop(1, '#0d1a12');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    // alley perspective
    ctx.strokeStyle = 'rgba(120,160,120,0.25)'; ctx.lineWidth = 1;
    for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.moveTo(w / 2, h * 0.35); ctx.lineTo((i / 8) * w, h); ctx.stroke(); }
    // flicker light
    const flick = 0.5 + Math.sin(t * 30) * 0.15 + Math.sin(t * 7) * 0.2;
    ctx.fillStyle = `rgba(200,255,200,${0.05 * flick})`; ctx.fillRect(0, 0, w, h);
    for (const z of st.z) {
      const s = 0.5 + z.y; const yy = h * 0.35 + z.y * (h * 0.6);
      const x = z.x + Math.sin(t * 1.5 + z.p) * 20;
      ctx.fillStyle = '#1f3a22'; ctx.fillRect(x - 10 * s, yy - 50 * s, 20 * s, 40 * s);
      ctx.beginPath(); ctx.arc(x, yy - 58 * s, 10 * s, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ff2020'; ctx.fillRect(x - 5 * s, yy - 60 * s, 3 * s, 3 * s); ctx.fillRect(x + 2 * s, yy - 60 * s, 3 * s, 3 * s);
      ctx.fillStyle = '#1f3a22'; ctx.fillRect(x - 16 * s, yy - 44 * s, 12 * s, 5 * s); ctx.fillRect(x + 4 * s, yy - 44 * s, 12 * s, 5 * s);
      z.y += 0.0015; if (z.y > 0.95) z.y = 0.2;
    }
    // crosshair
    const cx = w / 2 + Math.sin(t * 1.1) * 100, cy = h / 2 + Math.sin(t * 2.3) * 40;
    ctx.strokeStyle = '#3dff7a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, 14, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - 22, cy); ctx.lineTo(cx + 22, cy); ctx.moveTo(cx, cy - 22); ctx.lineTo(cx, cy + 22); ctx.stroke();
    if (Math.sin(t * 9) > 0.9) { ctx.fillStyle = 'rgba(255,255,200,0.5)'; ctx.fillRect(0, 0, w, h); }
    ctx.font = `12px ${FONT}`; ctx.textAlign = 'left'; ctx.fillStyle = '#3dff7a'; ctx.fillText(`AMMO ${Math.floor(6 - (t * 2) % 6)}/6`, 8, h - 8);
    ctx.textAlign = 'right'; ctx.fillStyle = '#fff'; ctx.fillText(`SCORE ${pad((t * 130) % 99999, 5)}`, w - 8, 16);
    if (t % 9 < 3) { ctx.textAlign = 'center'; ctx.font = `30px ${FONT}`; ctx.lineWidth = 6; ctx.strokeStyle = '#000'; ctx.strokeText('ZOMBIE ALLEY', w / 2, h / 2 - 40); ctx.fillStyle = '#7dff6a'; ctx.fillText('ZOMBIE ALLEY', w / 2, h / 2 - 40); }
  },

  dance(ctx, w, h, t, st) {
    ctx.fillStyle = '#100418'; ctx.fillRect(0, 0, w, h);
    // spotlight sweeps
    for (let i = 0; i < 3; i++) {
      const a = t * 0.8 + i * 2;
      const gx = w / 2 + Math.sin(a) * w * 0.4;
      const rg = ctx.createRadialGradient(gx, h * 0.6, 0, gx, h * 0.6, 120);
      rg.addColorStop(0, ['rgba(255,45,149,0.35)', 'rgba(34,229,255,0.35)', 'rgba(255,212,0,0.3)'][i]); rg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = rg; ctx.fillRect(0, 0, w, h);
    }
    const cols = 4, cw = 44, x0 = w / 2 - cols * cw / 2;
    const arrows = ['←', '↓', '↑', '→'];
    ctx.font = `28px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let c = 0; c < cols; c++) {
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillText(arrows[c], x0 + c * cw + cw / 2, 30);
      for (let k = 0; k < 5; k++) {
        const y = h - ((t * 150 + k * 80 + c * 50) % (h + 30));
        ctx.fillStyle = ['#ff2d95', '#22e5ff', '#3dff7a', '#ffd400'][(k + c) % 4];
        ctx.fillText(arrows[c], x0 + c * cw + cw / 2, y);
      }
    }
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = blink(t, 3) ? '#fff' : '#ffd400'; ctx.font = `20px ${FONT}`; ctx.fillText('PERFECT!!', w / 2, h / 2 + 40);
    ctx.font = `12px ${FONT}`; ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.fillText('DANCE FEVER', 8, h - 8);
  },

  scoreboard(ctx, w, h, t, st) {
    // Big 7-seg style readout used by hoops & skee-ball. st.live = {score, time, label}
    ctx.fillStyle = '#050505'; ctx.fillRect(0, 0, w, h);
    const live = st.live;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (live) {
      ctx.font = `14px ${FONT}`; ctx.fillStyle = '#ffb02e'; ctx.fillText(live.label || 'SCORE', w / 2, 18);
      ctx.font = `64px ${MONO}`; ctx.fillStyle = '#ff2a2a'; ctx.shadowColor = '#ff2a2a'; ctx.shadowBlur = 14;
      ctx.fillText(pad(live.score, 3), w / 2, h / 2 + 6);
      ctx.shadowBlur = 0;
      if (live.time != null) { ctx.font = `18px ${MONO}`; ctx.fillStyle = '#ffd400'; ctx.fillText(`TIME ${pad(live.time, 2)}`, w / 2, h - 16); }
    } else {
      ctx.font = `64px ${MONO}`; ctx.fillStyle = '#5a0a0a'; ctx.fillText('888', w / 2, h / 2 + 6);
      ctx.fillStyle = '#ff2a2a'; ctx.shadowColor = '#ff2a2a'; ctx.shadowBlur = 14;
      ctx.fillText(blink(t, 0.7) ? '000' : pad(st.hi || 120, 3), w / 2, h / 2 + 6);
      ctx.shadowBlur = 0;
      ctx.font = `12px ${FONT}`; ctx.fillStyle = blink(t, 1.2) ? '#ffb02e' : '#553300'; ctx.fillText('SWIPE CARD', w / 2, h - 14);
      ctx.fillStyle = '#ffd400'; ctx.fillText(blink(t, 0.7) ? '' : 'HIGH SCORE', w / 2, 18);
    }
    ctx.textBaseline = 'alphabetic';
  },

  tv(ctx, w, h, t, st, v) {
    if (!st.p) { st.p = Array.from({ length: 10 }, (_, i) => ({ x: st.rnd() * w, y: h * 0.3 + st.rnd() * h * 0.6, team: i % 2, ph: st.rnd() * 6 })); st.ball = { x: w / 2, y: h / 2 }; }
    // pitch / court
    ctx.fillStyle = v === 1 ? '#b8743a' : '#2f8f3a'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = v === 1 ? '#c98246' : '#35a044';
    for (let i = 0; i < 8; i++) if (i % 2) ctx.fillRect(i * w / 8, 0, w / 8, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2;
    ctx.strokeRect(20, h * 0.2, w - 40, h * 0.7);
    ctx.beginPath(); ctx.moveTo(w / 2, h * 0.2); ctx.lineTo(w / 2, h * 0.9); ctx.stroke();
    ctx.beginPath(); ctx.arc(w / 2, h * 0.55, 40, 0, Math.PI * 2); ctx.stroke();
    // players
    const b = st.ball; b.x = w / 2 + Math.sin(t * 0.7) * w * 0.35; b.y = h * 0.55 + Math.sin(t * 1.3) * h * 0.25;
    for (const p of st.p) {
      p.x += (b.x - p.x) * 0.01 + Math.sin(t * 2 + p.ph) * 0.8; p.y += (b.y - p.y) * 0.01 + Math.cos(t * 1.7 + p.ph) * 0.8;
      ctx.fillStyle = p.team ? '#ffffff' : (v === 1 ? '#1946d8' : '#d8202a');
      ctx.fillRect(p.x - 3, p.y - 8, 6, 8); ctx.beginPath(); ctx.arc(p.x, p.y - 11, 3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = v === 1 ? '#e8641b' : '#fff'; ctx.beginPath(); ctx.arc(b.x, b.y, 3, 0, Math.PI * 2); ctx.fill();
    // score bug
    ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillRect(10, 10, 170, 26);
    ctx.fillStyle = '#d8202a'; ctx.fillRect(10, 10, 6, 26);
    ctx.font = `12px ${FONT}`; ctx.textAlign = 'left'; ctx.fillStyle = '#fff';
    ctx.fillText(v === 1 ? `DAL 84   LAL 79` : `TEX 2   NYC 1`, 24, 28);
    ctx.fillStyle = '#ffd400'; ctx.fillText(v === 1 ? `Q4 ${pad(11 - (t % 11), 2)}:${pad((59 - t * 3) % 60, 2)}` : `2H ${pad(70 + (t / 60) % 20, 2)}'`, 120, 28);
    ctx.fillStyle = '#d8202a'; ctx.fillRect(w - 50, 10, 40, 16); ctx.fillStyle = '#fff'; ctx.font = `10px ${FONT}`; ctx.fillText('LIVE', w - 44, 22);
    // ticker
    ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fillRect(0, h - 22, w, 22);
    ctx.fillStyle = '#fff'; ctx.font = `11px ${MONO}`;
    const ticker = 'SPORTS TONIGHT  •  FINALS GAME 5 TONIGHT 8PM  •  HAPPY HOUR 4-7  •  HALF-PRICE GAMES WEDNESDAYS  •  ';
    const off = (t * 60) % 900;
    ctx.fillText(ticker + ticker, w - off, h - 7);
  },

  kiosk(ctx, w, h, t, st) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#1b1650'); g.addColorStop(1, '#0a0620');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.textAlign = 'center';
    ctx.font = `34px ${FONT}`; ctx.fillStyle = '#fff'; ctx.fillText('POWER CARD', w / 2, 60);
    ctx.font = `16px ${FONT}`; ctx.fillStyle = '#26e5ff'; ctx.fillText('RECHARGE STATION', w / 2, 88);
    const opts = [['$10', '50 CHIPS'], ['$25', '150 CHIPS'], ['$50', '350 CHIPS']];
    opts.forEach(([a, b], i) => {
      const y = 120 + i * 40;
      ctx.fillStyle = Math.floor(t) % 3 === i ? '#ff6a00' : '#2a2470';
      ctx.fillRect(40, y - 26, w - 80, 34);
      ctx.fillStyle = '#fff'; ctx.font = `18px ${FONT}`; ctx.textAlign = 'left'; ctx.fillText(a, 56, y);
      ctx.textAlign = 'right'; ctx.fillText(b, w - 56, y);
    });
    ctx.textAlign = 'center'; ctx.font = `14px ${FONT}`; ctx.fillStyle = blink(t, 1.5) ? '#ffd400' : '#7a6a00';
    ctx.fillText('TAP CARD OR PRESS  E', w / 2, h - 16);
  },

  prizeboard(ctx, w, h, t, st) {
    ctx.fillStyle = '#100a04'; ctx.fillRect(0, 0, w, h);
    ctx.textAlign = 'center'; ctx.font = `26px ${FONT}`; ctx.fillStyle = '#ffd400'; ctx.fillText("WINNER'S CIRCLE", w / 2, 40);
    const items = [['PLUSH KEYCHAIN', 250], ['LIGHT-UP YO-YO', 600], ['GIANT PLUSH', 4500], ['WIRELESS SPEAKER', 12000], ['GAME CONSOLE', 90000], ['CANDY', 100]];
    const off = (t * 20) % (items.length * 34);
    ctx.font = `15px ${MONO}`;
    items.concat(items).forEach(([n, c], i) => {
      const y = 80 + i * 34 - off;
      if (y < 60 || y > h - 10) return;
      ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.fillText(n, 20, y);
      ctx.textAlign = 'right'; ctx.fillStyle = '#ffd400'; ctx.fillText(`${c} TIX`, w - 20, y);
    });
  },

  pinball(ctx, w, h, t, st, v) {
    const pal = v === 1 ? ['#0a0a3a', '#ff6a00', '#ffd400'] : ['#1a0030', '#ff2d95', '#22e5ff'];
    ctx.fillStyle = pal[0]; ctx.fillRect(0, 0, w, h);
    const rnd = st.rnd;
    if (!st.stars) starsInit(st, w, h, rnd, 60);
    for (const s of st.stars) { ctx.fillStyle = `rgba(255,255,255,${s.b * (0.6 + Math.sin(t * 4 + s.x) * 0.4)})`; ctx.fillRect(s.x, s.y, s.s * 2, s.s * 2); }
    // planet
    const pg = ctx.createRadialGradient(w * 0.7, h * 0.4, 5, w * 0.7, h * 0.4, 60);
    pg.addColorStop(0, pal[2]); pg.addColorStop(1, pal[1]);
    ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(w * 0.7, h * 0.4, 60, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = pal[2]; ctx.lineWidth = 6; ctx.beginPath(); ctx.ellipse(w * 0.7, h * 0.4, 95, 24, -0.4, 0, Math.PI * 2); ctx.stroke();
    ctx.textAlign = 'center'; ctx.font = `36px ${FONT}`; ctx.lineWidth = 8; ctx.strokeStyle = '#000';
    const title = v === 1 ? 'DRAGON FIRE' : 'COSMIC PINBALL';
    ctx.strokeText(title, w / 2, h * 0.3); ctx.fillStyle = blink(t, 2) ? '#fff' : pal[2]; ctx.fillText(title, w / 2, h * 0.3);
    ctx.fillStyle = '#000'; ctx.fillRect(w / 2 - 110, h - 60, 220, 40);
    ctx.font = `28px ${MONO}`; ctx.fillStyle = '#ff9a1a'; ctx.fillText(blink(t, 1) ? pad((t * 5310) % 99999999, 8) : 'PRESS START', w / 2, h - 30);
  },

  jackpot(ctx, w, h, t, st) {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#3a0000'); g.addColorStop(1, '#5a2a00');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.textAlign = 'center'; ctx.font = `20px ${FONT}`; ctx.fillStyle = '#fff'; ctx.fillText('WIN UP TO', w / 2, 40);
    ctx.font = `54px ${FONT}`; ctx.lineWidth = 8; ctx.strokeStyle = '#3a0000'; ctx.strokeText('1000', w / 2, h / 2 + 12);
    ctx.fillStyle = blink(t, 3) ? '#ffd400' : '#ff6a00'; ctx.fillText('1000', w / 2, h / 2 + 12);
    ctx.font = `20px ${FONT}`; ctx.fillStyle = '#fff'; ctx.fillText('TICKETS!', w / 2, h / 2 + 46);
    ctx.font = `14px ${MONO}`; ctx.fillStyle = '#ffd400'; ctx.fillText(`BONUS  ${pad(400 + Math.floor(t * 3) % 600, 3)}`, w / 2, h - 18);
  },
};

export class ScreenManager {
  constructor() {
    this.entries = new Map();
    this.list = [];
    this.perFrame = 4;
    this.cursor = 0;
    this.fps = 15;
    this.skipInSim = true;
    updatables.push(this);
  }
  // Shared screen for a given attract kind & variant. Returns { texture, material, canvas }.
  get(kind, variant = 0, w = 320, h = 240) {
    const key = `${kind}:${variant}:${w}x${h}`;
    if (this.entries.has(key)) return this.entries.get(key);
    const { canvas, ctx } = makeCanvas(w, h);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    const material = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: texture, emissiveIntensity: 1.35, roughness: 0.6, metalness: 0 });
    material.userData.noShadow = true;
    const entry = { key, kind, variant, w, h, canvas, ctx, texture, material, state: { rnd: mulberry32(this.list.length * 13 + 7) }, draw: ATTRACT[kind], last: -1, phase: this.list.length * 0.37 };
    this.entries.set(key, entry);
    this.list.push(entry);
    entry.draw(ctx, w, h, entry.phase, entry.state, variant);
    texture.needsUpdate = true;
    return entry;
  }
  // Dedicated canvas for a playable session (not round-robin updated; the game drives it).
  createPrivate(w, h) {
    const { canvas, ctx } = makeCanvas(w, h);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    const material = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: texture, emissiveIntensity: 1.35, roughness: 0.6 });
    return { canvas, ctx, texture, material, w, h };
  }
  update(dt, t) {
    const n = this.list.length;
    if (!n) return;
    let drawn = 0;
    for (let k = 0; k < n && drawn < this.perFrame; k++) {
      const e = this.list[(this.cursor + k) % n];
      if (t - e.last >= 1 / this.fps) {
        e.draw(e.ctx, e.w, e.h, t + e.phase * 10, e.state, e.variant);
        e.texture.needsUpdate = true;
        e.last = t;
        drawn++;
      }
    }
    this.cursor = (this.cursor + drawn) % n;
  }
}
