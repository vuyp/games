// Procedural canvas textures. Everything in the arcade is generated at runtime:
// no external image assets are required.
import * as THREE from 'three';

// ---------- small utilities ----------
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeCanvas(w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  return { canvas, ctx };
}

export function toTexture(canvas, { repeat = [1, 1], srgb = true, wrap = true, aniso = 8, filter = true } = {}) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  if (wrap) {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeat[0], repeat[1]);
  } else {
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  }
  tex.anisotropy = aniso;
  if (!filter) {
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
  }
  tex.needsUpdate = true;
  return tex;
}

// Value noise (tileable) drawn straight into an ImageData buffer.
function fillNoise(ctx, w, h, { base = 128, amp = 40, scale = 64, octaves = 3, seed = 1, tint = null } = {}) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const rnd = mulberry32(seed);
  const gridSize = 64;
  const grid = new Float32Array(gridSize * gridSize);
  for (let i = 0; i < grid.length; i++) grid[i] = rnd();
  const lerp = (a, b, t) => a + (b - a) * (t * t * (3 - 2 * t));
  const sample = (x, y) => {
    const gx = ((x % gridSize) + gridSize) % gridSize;
    const gy = ((y % gridSize) + gridSize) % gridSize;
    const x0 = Math.floor(gx), y0 = Math.floor(gy);
    const x1 = (x0 + 1) % gridSize, y1 = (y0 + 1) % gridSize;
    const tx = gx - x0, ty = gy - y0;
    return lerp(lerp(grid[y0 * gridSize + x0], grid[y0 * gridSize + x1], tx), lerp(grid[y1 * gridSize + x0], grid[y1 * gridSize + x1], tx), ty);
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let v = 0, a = 1, f = 1, norm = 0;
      for (let o = 0; o < octaves; o++) {
        v += a * sample((x / scale) * f * (gridSize / (w / scale)), (y / scale) * f * (gridSize / (h / scale)));
        norm += a;
        a *= 0.5;
        f *= 2;
      }
      v = v / norm - 0.5;
      const i = (y * w + x) * 4;
      const val = base + v * amp * 2;
      if (tint) {
        d[i] = Math.max(0, Math.min(255, val * tint[0]));
        d[i + 1] = Math.max(0, Math.min(255, val * tint[1]));
        d[i + 2] = Math.max(0, Math.min(255, val * tint[2]));
      } else {
        d[i] = d[i + 1] = d[i + 2] = Math.max(0, Math.min(255, val));
      }
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

function speckle(ctx, w, h, count, colors, sizeMin, sizeMax, rnd) {
  for (let i = 0; i < count; i++) {
    ctx.fillStyle = colors[Math.floor(rnd() * colors.length)];
    const s = sizeMin + rnd() * (sizeMax - sizeMin);
    ctx.fillRect(rnd() * w, rnd() * h, s, s);
  }
}

// ---------- floor / wall surfaces ----------
export function carpetTexture() {
  // Classic "cosmic" arcade carpet: near-black indigo with neon confetti, swirls, planets and stars.
  const w = 1024, h = 1024;
  const { canvas, ctx } = makeCanvas(w, h);
  fillNoise(ctx, w, h, { base: 30, amp: 8, scale: 8, octaves: 2, seed: 7, tint: [0.55, 0.5, 1.15] });
  const rnd = mulberry32(42);
  const neon = ['#ff2d95', '#22e5ff', '#ffd400', '#ff6a00', '#8a3dff', '#3dff7a'];
  // fibre texture
  speckle(ctx, w, h, 26000, ['rgba(255,255,255,0.05)', 'rgba(0,0,0,0.25)', 'rgba(80,60,160,0.35)'], 1, 3, rnd);
  // swirls / squiggles
  ctx.lineCap = 'round';
  for (let i = 0; i < 70; i++) {
    ctx.strokeStyle = neon[Math.floor(rnd() * neon.length)];
    ctx.lineWidth = 3 + rnd() * 5;
    ctx.globalAlpha = 0.85;
    const x = rnd() * w, y = rnd() * h, r = 12 + rnd() * 30;
    ctx.beginPath();
    for (let a = 0; a < Math.PI * 3; a += 0.25) {
      const rr = r * (a / (Math.PI * 3));
      const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
      if (a === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
  // zigzags
  for (let i = 0; i < 60; i++) {
    ctx.strokeStyle = neon[Math.floor(rnd() * neon.length)];
    ctx.lineWidth = 4 + rnd() * 3;
    const x = rnd() * w, y = rnd() * h, ang = rnd() * Math.PI, len = 40 + rnd() * 50;
    ctx.beginPath();
    for (let k = 0; k <= 6; k++) {
      const t = (k / 6) * len;
      const off = (k % 2 ? 8 : -8);
      ctx.lineTo(x + Math.cos(ang) * t - Math.sin(ang) * off, y + Math.sin(ang) * t + Math.cos(ang) * off);
    }
    ctx.stroke();
  }
  // planets & stars & triangles
  for (let i = 0; i < 90; i++) {
    const x = rnd() * w, y = rnd() * h;
    const c = neon[Math.floor(rnd() * neon.length)];
    ctx.fillStyle = c;
    ctx.strokeStyle = c;
    const kind = rnd();
    if (kind < 0.3) {
      const r = 8 + rnd() * 14;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(x, y, r * 1.9, r * 0.5, rnd() * Math.PI, 0, Math.PI * 2); ctx.stroke();
    } else if (kind < 0.65) {
      const r = 6 + rnd() * 10;
      ctx.beginPath();
      for (let k = 0; k < 10; k++) {
        const a = (k / 10) * Math.PI * 2, rr = k % 2 ? r * 0.45 : r;
        ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      }
      ctx.closePath(); ctx.fill();
    } else {
      const s = 10 + rnd() * 16;
      ctx.beginPath(); ctx.moveTo(x, y - s); ctx.lineTo(x + s, y + s); ctx.lineTo(x - s, y + s); ctx.closePath(); ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  // wear / dimming
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fillRect(0, 0, w, h);
  const map = toTexture(canvas, { repeat: [1, 1] });
  // roughness / bump from luminance
  const { canvas: c2, ctx: x2 } = makeCanvas(256, 256);
  fillNoise(x2, 256, 256, { base: 215, amp: 25, scale: 6, octaves: 3, seed: 3 });
  const rough = toTexture(c2, { srgb: false });
  return { map, rough };
}

export function tileTexture() {
  // Large-format dark porcelain tiles with grout, used in the lobby & bar.
  const w = 1024, h = 1024;
  const { canvas, ctx } = makeCanvas(w, h);
  fillNoise(ctx, w, h, { base: 74, amp: 12, scale: 90, octaves: 4, seed: 11, tint: [1, 1, 1.08] });
  const rnd = mulberry32(5);
  const tiles = 4, ts = w / tiles;
  for (let i = 0; i < tiles; i++) for (let j = 0; j < tiles; j++) {
    const v = 60 + rnd() * 22;
    ctx.fillStyle = `rgba(${v},${v},${v + 4},0.5)`;
    ctx.fillRect(i * ts, j * ts, ts, ts);
    // faint veins
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 2;
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      ctx.moveTo(i * ts + rnd() * ts, j * ts + rnd() * ts);
      ctx.bezierCurveTo(i * ts + rnd() * ts, j * ts + rnd() * ts, i * ts + rnd() * ts, j * ts + rnd() * ts, i * ts + rnd() * ts, j * ts + rnd() * ts);
      ctx.stroke();
    }
  }
  ctx.strokeStyle = '#1d1d22';
  ctx.lineWidth = 6;
  for (let i = 0; i <= tiles; i++) {
    ctx.beginPath(); ctx.moveTo(i * ts, 0); ctx.lineTo(i * ts, h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i * ts); ctx.lineTo(w, i * ts); ctx.stroke();
  }
  const map = toTexture(canvas);
  // roughness: grout rough, tile glossy
  const { canvas: c2, ctx: x2 } = makeCanvas(512, 512);
  x2.fillStyle = '#404040'; x2.fillRect(0, 0, 512, 512);
  fillNoise(x2, 512, 512, { base: 70, amp: 25, scale: 40, octaves: 3, seed: 9 });
  x2.strokeStyle = '#e0e0e0'; x2.lineWidth = 3;
  for (let i = 0; i <= tiles; i++) {
    x2.beginPath(); x2.moveTo(i * 128, 0); x2.lineTo(i * 128, 512); x2.stroke();
    x2.beginPath(); x2.moveTo(0, i * 128); x2.lineTo(512, i * 128); x2.stroke();
  }
  const rough = toTexture(c2, { srgb: false });
  return { map, rough };
}

export function concreteTexture(tone = 120, tint = [1, 1, 1]) {
  const w = 512, h = 512;
  const { canvas, ctx } = makeCanvas(w, h);
  fillNoise(ctx, w, h, { base: tone, amp: 18, scale: 48, octaves: 4, seed: 21, tint });
  const rnd = mulberry32(77);
  speckle(ctx, w, h, 4000, ['rgba(0,0,0,0.25)', 'rgba(255,255,255,0.12)'], 1, 3, rnd);
  for (let i = 0; i < 12; i++) {
    ctx.fillStyle = `rgba(0,0,0,${0.04 + rnd() * 0.08})`;
    ctx.beginPath(); ctx.ellipse(rnd() * w, rnd() * h, 30 + rnd() * 90, 20 + rnd() * 60, rnd() * 3, 0, Math.PI * 2); ctx.fill();
  }
  const map = toTexture(canvas);
  const { canvas: c2, ctx: x2 } = makeCanvas(256, 256);
  fillNoise(x2, 256, 256, { base: 200, amp: 30, scale: 20, octaves: 3, seed: 22 });
  const rough = toTexture(c2, { srgb: false });
  return { map, rough };
}

export function sidewalkTexture() {
  const w = 512, h = 512;
  const { canvas, ctx } = makeCanvas(w, h);
  fillNoise(ctx, w, h, { base: 135, amp: 14, scale: 40, octaves: 4, seed: 31, tint: [1, 0.98, 0.94] });
  const rnd = mulberry32(3);
  speckle(ctx, w, h, 5000, ['rgba(0,0,0,0.2)', 'rgba(255,255,255,0.15)'], 1, 2, rnd);
  ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(w, 0); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.moveTo(0, 0); ctx.lineTo(0, h); ctx.stroke();
  return { map: toTexture(canvas) };
}

export function asphaltTexture() {
  const w = 512, h = 512;
  const { canvas, ctx } = makeCanvas(w, h);
  fillNoise(ctx, w, h, { base: 38, amp: 10, scale: 30, octaves: 4, seed: 41, tint: [1, 1, 1.05] });
  const rnd = mulberry32(8);
  speckle(ctx, w, h, 9000, ['rgba(255,255,255,0.08)', 'rgba(0,0,0,0.35)'], 1, 2, rnd);
  return { map: toTexture(canvas) };
}

export function paintedWallTexture(rgb = [34, 28, 48]) {
  const w = 512, h = 512;
  const { canvas, ctx } = makeCanvas(w, h);
  fillNoise(ctx, w, h, { base: 128, amp: 6, scale: 64, octaves: 3, seed: 51, tint: [rgb[0] / 128, rgb[1] / 128, rgb[2] / 128] });
  const rnd = mulberry32(12);
  speckle(ctx, w, h, 3000, ['rgba(255,255,255,0.03)', 'rgba(0,0,0,0.06)'], 1, 2, rnd);
  return { map: toTexture(canvas) };
}

export function brickTexture() {
  const w = 512, h = 512;
  const { canvas, ctx } = makeCanvas(w, h);
  ctx.fillStyle = '#2a2320'; ctx.fillRect(0, 0, w, h);
  const rnd = mulberry32(99);
  const bh = 32, bw = 96;
  for (let row = 0; row < h / bh; row++) {
    const off = row % 2 ? bw / 2 : 0;
    for (let col = -1; col < w / bw + 1; col++) {
      const v = 70 + rnd() * 40;
      ctx.fillStyle = `rgb(${v + 20},${v * 0.55},${v * 0.42})`;
      ctx.fillRect(col * bw + off + 2, row * bh + 2, bw - 4, bh - 4);
    }
  }
  speckle(ctx, w, h, 6000, ['rgba(0,0,0,0.25)', 'rgba(255,255,255,0.06)'], 1, 3, rnd);
  return { map: toTexture(canvas) };
}

export function brushedMetalTexture(base = 150) {
  const w = 512, h = 512;
  const { canvas, ctx } = makeCanvas(w, h);
  ctx.fillStyle = `rgb(${base},${base},${base + 4})`; ctx.fillRect(0, 0, w, h);
  const rnd = mulberry32(61);
  for (let i = 0; i < 4000; i++) {
    const y = rnd() * h;
    ctx.strokeStyle = `rgba(${rnd() > 0.5 ? 255 : 0},${rnd() > 0.5 ? 255 : 0},${rnd() > 0.5 ? 255 : 0},${0.03 + rnd() * 0.05})`;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y + (rnd() - 0.5) * 2); ctx.stroke();
  }
  const map = toTexture(canvas);
  const { canvas: c2, ctx: x2 } = makeCanvas(256, 256);
  x2.fillStyle = '#6a6a6a'; x2.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1500; i++) {
    x2.strokeStyle = `rgba(${rnd() > 0.5 ? 255 : 0},255,255,${0.04 + rnd() * 0.06})`;
    x2.beginPath(); const y = rnd() * 256; x2.moveTo(0, y); x2.lineTo(256, y); x2.stroke();
  }
  const rough = toTexture(c2, { srgb: false });
  return { map, rough };
}

export function woodTexture(hue = [120, 78, 44]) {
  const w = 512, h = 512;
  const { canvas, ctx } = makeCanvas(w, h);
  ctx.fillStyle = `rgb(${hue[0]},${hue[1]},${hue[2]})`; ctx.fillRect(0, 0, w, h);
  const rnd = mulberry32(71);
  for (let i = 0; i < 260; i++) {
    const y = rnd() * h;
    const dark = rnd() > 0.5;
    ctx.strokeStyle = dark ? `rgba(20,10,5,${0.1 + rnd() * 0.2})` : `rgba(255,220,170,${0.05 + rnd() * 0.1})`;
    ctx.lineWidth = 1 + rnd() * 3;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= w; x += 32) ctx.lineTo(x, y + Math.sin(x / 60 + i) * 3 + (rnd() - 0.5) * 2);
    ctx.stroke();
  }
  // plank seams
  ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 3;
  for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(0, i * 128); ctx.lineTo(w, i * 128); ctx.stroke(); }
  return { map: toTexture(canvas) };
}

export function noiseRoughness(base = 180, amp = 50, seed = 5) {
  const { canvas, ctx } = makeCanvas(256, 256);
  fillNoise(ctx, 256, 256, { base, amp, scale: 16, octaves: 3, seed });
  return toTexture(canvas, { srgb: false });
}

export function ceilingTexture() {
  const w = 512, h = 512;
  const { canvas, ctx } = makeCanvas(w, h);
  fillNoise(ctx, w, h, { base: 18, amp: 6, scale: 40, octaves: 3, seed: 81, tint: [1, 1, 1.1] });
  return { map: toTexture(canvas) };
}

// ---------- glow / gradient sprites ----------
export function radialGlowTexture(inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)', size = 256) {
  const { canvas, ctx } = makeCanvas(size, size);
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, inner);
  g.addColorStop(0.35, inner.replace(/[\d.]+\)$/, '0.45)'));
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return toTexture(canvas, { wrap: false });
}

export function softRectGlowTexture(size = 256) {
  const { canvas, ctx } = makeCanvas(size, size);
  const g = ctx.createRadialGradient(size / 2, size / 2, size * 0.05, size / 2, size / 2, size * 0.5);
  g.addColorStop(0, 'rgba(255,255,255,0.9)');
  g.addColorStop(0.5, 'rgba(255,255,255,0.28)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
  return toTexture(canvas, { wrap: false });
}

// ---------- text & signage ----------
export function textTexture(text, {
  font = 'bold 120px "Bungee", Impact, "Arial Black", sans-serif',
  color = '#ffffff', glow = null, glowSize = 30, bg = null, width = 1024, height = 256,
  letterSpacing = 0, stroke = null, strokeWidth = 4, align = 'center', padding = 0,
} = {}) {
  const { canvas, ctx } = makeCanvas(width, height);
  if (bg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, width, height); }
  ctx.font = font;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${letterSpacing}px`;
  const x = align === 'center' ? width / 2 : align === 'left' ? padding : width - padding;
  if (glow) {
    ctx.shadowColor = glow;
    ctx.shadowBlur = glowSize;
    ctx.fillStyle = glow;
    for (let i = 0; i < 3; i++) ctx.fillText(text, x, height / 2);
    ctx.shadowBlur = glowSize * 0.4;
  }
  if (stroke) { ctx.lineWidth = strokeWidth; ctx.strokeStyle = stroke; ctx.lineJoin = 'round'; ctx.strokeText(text, x, height / 2); }
  ctx.fillStyle = color;
  ctx.fillText(text, x, height / 2);
  ctx.shadowBlur = 0;
  const tex = toTexture(canvas, { wrap: false });
  return tex;
}

// Measures the pixel width text will need so sign planes can be sized to fit.
export function measureText(text, font, letterSpacing = 0) {
  const { ctx } = makeCanvas(8, 8);
  ctx.font = font;
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${letterSpacing}px`;
  return ctx.measureText(text).width;
}

const PALETTES = [
  ['#ff2d95', '#7a00ff', '#22e5ff'],
  ['#ff6a00', '#ffd400', '#ff2d2d'],
  ['#22e5ff', '#0044ff', '#00ffb3'],
  ['#3dff7a', '#00b36b', '#ffd400'],
  ['#ffd400', '#ff6a00', '#7a00ff'],
  ['#ff2d2d', '#ff2d95', '#ffffff'],
];

export function marqueeTexture(title, seed = 0, subtitle = '') {
  const w = 512, h = 160;
  const { canvas, ctx } = makeCanvas(w, h);
  const rnd = mulberry32(100 + seed);
  const pal = PALETTES[seed % PALETTES.length];
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, pal[0]); g.addColorStop(0.55, pal[1]); g.addColorStop(1, pal[2]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  // burst rays
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    ctx.beginPath(); ctx.moveTo(w / 2, h / 2);
    ctx.lineTo(w / 2 + Math.cos(a) * w, h / 2 + Math.sin(a) * w);
    ctx.lineTo(w / 2 + Math.cos(a + 0.12) * w, h / 2 + Math.sin(a + 0.12) * w);
    ctx.closePath(); ctx.fill();
  }
  ctx.globalAlpha = 1;
  // sparkles
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = `rgba(255,255,255,${0.3 + rnd() * 0.6})`;
    const x = rnd() * w, y = rnd() * h, s = 1 + rnd() * 3;
    ctx.fillRect(x, y, s, s);
  }
  let fs = 64;
  ctx.font = `${fs}px "Bungee", Impact, "Arial Black", sans-serif`;
  while (fs > 26 && ctx.measureText(title).width > w - 60) { fs -= 4; ctx.font = `${fs}px "Bungee", Impact, "Arial Black", sans-serif`; }
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 12; ctx.strokeStyle = '#120018';
  ctx.strokeText(title, w / 2, h / 2 - (subtitle ? 10 : 0));
  const tg = ctx.createLinearGradient(0, h * 0.25, 0, h * 0.75);
  tg.addColorStop(0, '#ffffff'); tg.addColorStop(0.5, '#fff3a0'); tg.addColorStop(1, '#ffb300');
  ctx.fillStyle = tg;
  ctx.fillText(title, w / 2, h / 2 - (subtitle ? 10 : 0));
  if (subtitle) {
    ctx.font = '22px "Rubik", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(subtitle, w / 2, h / 2 + 42);
  }
  // border
  ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 8; ctx.strokeRect(0, 0, w, h);
  return toTexture(canvas, { wrap: false });
}

export function sideArtTexture(title, seed = 0) {
  const w = 256, h = 512;
  const { canvas, ctx } = makeCanvas(w, h);
  const pal = PALETTES[seed % PALETTES.length];
  ctx.fillStyle = '#0b0b10'; ctx.fillRect(0, 0, w, h);
  const g = ctx.createLinearGradient(0, h, w, 0);
  g.addColorStop(0, pal[0]); g.addColorStop(0.5, pal[1]); g.addColorStop(1, pal[2]);
  ctx.fillStyle = g;
  ctx.globalAlpha = 0.85;
  // diagonal slash
  ctx.beginPath(); ctx.moveTo(0, h * 0.55); ctx.lineTo(w, h * 0.15); ctx.lineTo(w, h * 0.45); ctx.lineTo(0, h * 0.85); ctx.closePath(); ctx.fill();
  ctx.globalAlpha = 0.55;
  ctx.beginPath(); ctx.moveTo(0, h * 0.95); ctx.lineTo(w, h * 0.55); ctx.lineTo(w, h * 0.65); ctx.lineTo(0, h); ctx.closePath(); ctx.fill();
  ctx.globalAlpha = 1;
  // vertical title
  ctx.save();
  ctx.translate(w / 2, h * 0.32);
  ctx.rotate(-Math.PI / 2);
  ctx.font = '44px "Bungee", Impact, "Arial Black", sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineWidth = 8; ctx.strokeStyle = '#000'; ctx.lineJoin = 'round';
  ctx.strokeText(title, 0, 0);
  ctx.fillStyle = '#fff';
  ctx.fillText(title, 0, 0);
  ctx.restore();
  return toTexture(canvas, { wrap: false });
}

export function posterTexture(lines, seed = 0) {
  const w = 256, h = 384;
  const { canvas, ctx } = makeCanvas(w, h);
  const pal = PALETTES[seed % PALETTES.length];
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, pal[1]); g.addColorStop(1, '#0a0410');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  ctx.textAlign = 'center';
  lines.forEach((ln, i) => {
    ctx.font = i === 0 ? '34px "Bungee", Impact, sans-serif' : '20px "Rubik", sans-serif';
    ctx.fillStyle = i === 0 ? '#fff' : '#ffd400';
    ctx.fillText(ln, w / 2, 80 + i * 44);
  });
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.strokeRect(8, 8, w - 16, h - 16);
  return toTexture(canvas, { wrap: false });
}

// Round-cornered label like "PULL", "HOURS", etc.
export function labelTexture(lines, { bg = '#111', fg = '#fff', w = 256, h = 128, font = '28px "Rubik", sans-serif' } = {}) {
  const { canvas, ctx } = makeCanvas(w, h);
  ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = fg; ctx.font = font; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const lh = h / (lines.length + 1);
  lines.forEach((l, i) => ctx.fillText(l, w / 2, lh * (i + 1)));
  return toTexture(canvas, { wrap: false });
}

export function wheelFaceTexture(segments) {
  const size = 1024;
  const { canvas, ctx } = makeCanvas(size, size);
  const cx = size / 2, cy = size / 2, r = size / 2 - 8;
  const n = segments.length;
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2 - Math.PI / 2, a1 = ((i + 1) / n) * Math.PI * 2 - Math.PI / 2;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, a0, a1); ctx.closePath();
    ctx.fillStyle = segments[i].color; ctx.fill();
    ctx.strokeStyle = '#111'; ctx.lineWidth = 4; ctx.stroke();
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((a0 + a1) / 2);
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    ctx.font = `${segments[i].jackpot ? 54 : 64}px "Bungee", Impact, sans-serif`;
    ctx.lineWidth = 8; ctx.strokeStyle = '#000'; ctx.lineJoin = 'round';
    ctx.strokeText(segments[i].label, r - 40, 0);
    ctx.fillStyle = '#fff'; ctx.fillText(segments[i].label, r - 40, 0);
    ctx.restore();
  }
  ctx.beginPath(); ctx.arc(cx, cy, 90, 0, Math.PI * 2); ctx.fillStyle = '#ffd400'; ctx.fill();
  ctx.lineWidth = 10; ctx.strokeStyle = '#7a4a00'; ctx.stroke();
  ctx.fillStyle = '#7a4a00'; ctx.font = '40px "Bungee", Impact, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('SPIN', cx, cy);
  return toTexture(canvas, { wrap: false });
}

export function skeeTargetTexture() {
  // Ring target for skee-ball: 10/20/30/40/50 with the 100 corner pockets.
  const w = 512, h = 512;
  const { canvas, ctx } = makeCanvas(w, h);
  ctx.fillStyle = '#1b4d8c'; ctx.fillRect(0, 0, w, h);
  const cx = w / 2, cy = h * 0.6;
  const rings = [[210, '#0d2f5a', ''], [165, '#2a6db5', '10'], [125, '#0d2f5a', '20'], [88, '#2a6db5', '30'], [55, '#0d2f5a', '40'], [26, '#111', '50']];
  rings.forEach(([r, c]) => { ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fillStyle = c; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.stroke(); });
  ctx.fillStyle = '#fff'; ctx.font = '26px "Bungee", Impact, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  [[188, '10'], [145, '20'], [107, '30'], [72, '40']].forEach(([r, t]) => ctx.fillText(t, cx, cy - r));
  ctx.fillText('50', cx, cy);
  // 100 pockets
  [[cx - 150, 70], [cx + 150, 70]].forEach(([x, y]) => {
    ctx.beginPath(); ctx.arc(x, y, 34, 0, Math.PI * 2); ctx.fillStyle = '#111'; ctx.fill(); ctx.strokeStyle = '#ff2d2d'; ctx.lineWidth = 5; ctx.stroke();
    ctx.fillStyle = '#ffd400'; ctx.font = '22px "Bungee", Impact, sans-serif'; ctx.fillText('100', x, y + 52);
  });
  return toTexture(canvas, { wrap: false });
}

export function airHockeyTexture() {
  const w = 512, h = 1024;
  const { canvas, ctx } = makeCanvas(w, h);
  ctx.fillStyle = '#f4f6fa'; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#d61f2d'; ctx.lineWidth = 8;
  ctx.strokeRect(20, 20, w - 40, h - 40);
  ctx.beginPath(); ctx.moveTo(20, h / 2); ctx.lineTo(w - 20, h / 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(w / 2, h / 2, 90, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(w / 2, 20, 120, 0, Math.PI); ctx.stroke();
  ctx.beginPath(); ctx.arc(w / 2, h - 20, 120, Math.PI, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#1b4d8c'; ctx.font = '48px "Bungee", Impact, sans-serif'; ctx.textAlign = 'center';
  ctx.save(); ctx.translate(w / 2, h * 0.28); ctx.rotate(-Math.PI / 2); ctx.globalAlpha = 0.25; ctx.fillText('AIR HOCKEY', 0, 0); ctx.restore();
  // air holes
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  for (let y = 40; y < h - 40; y += 24) for (let x = 40; x < w - 40; x += 24) { ctx.beginPath(); ctx.arc(x, y, 1.5, 0, Math.PI * 2); ctx.fill(); }
  return toTexture(canvas, { wrap: false });
}

export function basketballTexture() {
  const w = 256, h = 128;
  const { canvas, ctx } = makeCanvas(w, h);
  ctx.fillStyle = '#e8641b'; ctx.fillRect(0, 0, w, h);
  const rnd = mulberry32(19);
  speckle(ctx, w, h, 3000, ['rgba(0,0,0,0.15)', 'rgba(255,255,255,0.08)'], 1, 2, rnd);
  ctx.strokeStyle = '#1a0d05'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.stroke();
  [w * 0.25, w * 0.75].forEach(x => { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); });
  ctx.beginPath(); ctx.ellipse(w * 0.5, h / 2, w * 0.12, h * 0.6, 0, 0, Math.PI * 2); ctx.stroke();
  return toTexture(canvas);
}

export function wireMeshTexture() {
  const s = 128;
  const { canvas, ctx } = makeCanvas(s, s);
  ctx.clearRect(0, 0, s, s);
  ctx.strokeStyle = 'rgba(200,200,210,0.9)'; ctx.lineWidth = 3;
  for (let i = 0; i <= s; i += 32) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, s); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(s, i); ctx.stroke();
  }
  return toTexture(canvas, { repeat: [4, 4] });
}

export function prizeBoxTexture(name, seed) {
  const w = 256, h = 256;
  const { canvas, ctx } = makeCanvas(w, h);
  const pal = PALETTES[seed % PALETTES.length];
  ctx.fillStyle = pal[seed % 3]; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fillRect(24, 40, w - 48, h - 80);
  ctx.fillStyle = '#111'; ctx.font = '24px "Bungee", Impact, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(name, w / 2, h / 2);
  return toTexture(canvas, { wrap: false });
}

export function starSkyTexture() {
  const w = 1024, h = 512;
  const { canvas, ctx } = makeCanvas(w, h);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#02030c'); g.addColorStop(0.55, '#070a1f'); g.addColorStop(0.8, '#1b1230'); g.addColorStop(1, '#3a1c3a');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  const rnd = mulberry32(2024);
  for (let i = 0; i < 900; i++) {
    const y = rnd() * h * 0.7;
    const a = 0.3 + rnd() * 0.7;
    ctx.fillStyle = `rgba(255,255,255,${a})`;
    const s = rnd() < 0.1 ? 2 : 1;
    ctx.fillRect(rnd() * w, y, s, s);
  }
  return toTexture(canvas, { wrap: false });
}
