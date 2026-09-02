// Touch controls for phones and tablets: virtual joystick, look/drag zone, context buttons and per-game pads.
export const isTouchDevice = () => (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) || navigator.maxTouchPoints > 0;

const PAD_LAYOUTS = {
  shooter:  { left: 'ArrowLeft', right: 'ArrowRight', a: ['Space', 'FIRE'] },
  breakout: { left: 'ArrowLeft', right: 'ArrowRight', a: ['Space', 'LAUNCH'], drag: true },
  racer:    { left: 'ArrowLeft', right: 'ArrowRight', a: ['ArrowUp', 'GAS'], b: ['ArrowDown', 'BRAKE'] },
  rhythm:   { lanes: [['KeyD', '←'], ['KeyF', '↓'], ['KeyJ', '↑'], ['KeyK', '→']] },
  brawl:    { left: 'KeyA', right: 'KeyD', a: ['Space', 'PUNCH'], b: ['KeyS', 'BLOCK'] },
  gun:      { a: ['mouse', 'SHOOT'], b: ['KeyR', 'RELOAD'], drag: true },
  pinball:  { left: 'ArrowLeft', right: 'ArrowRight', a: ['Space', 'PLUNGE'] },
  claw:     { dpad: true, a: ['Space', 'DROP'] },
  skee:     { hold: ['mouse', 'HOLD TO ROLL'], drag: true },
  hoops:    { hold: ['mouse', 'HOLD TO SHOOT'], look: true },
};

export class TouchControls {
  constructor({ controller, games, hud, onInteract, onQuit, onPause }) {
    Object.assign(this, { controller, games, hud, onInteract, onQuit, onPause });
    this.enabled = false;
    this.layout = null;
    this.root = document.createElement('div');
    this.root.id = 'touch';
    this.root.innerHTML = `
      <div id="joy"><div id="joy-base"><div id="joy-knob"></div></div></div>
      <div id="look"></div>
      <button id="tb-pause" class="tb tb-small" aria-label="Menu">☰</button>
      <button id="tb-interact" class="tb tb-main" hidden>PLAY</button>
      <button id="tb-quit" class="tb tb-small" hidden>LEAVE</button>
      <div id="pad" hidden></div>`;
    document.body.appendChild(this.root);
    this.root.hidden = true;
    this.joy = this.root.querySelector('#joy');
    this.joyBase = this.root.querySelector('#joy-base');
    this.knob = this.root.querySelector('#joy-knob');
    this.look = this.root.querySelector('#look');
    this.btnInteract = this.root.querySelector('#tb-interact');
    this.btnQuit = this.root.querySelector('#tb-quit');
    this.pad = this.root.querySelector('#pad');
    this.joyPointer = null; this.lookPointer = null;
    this.move = { x: 0, y: 0 };
    this.bind();
  }
  enable() {
    this.enabled = true;
    this.root.hidden = false;
    document.body.classList.add('touch');
    this.controller.touchMove = this.move;
  }
  bind() {
    const joy = this.joy, look = this.look;
    const prevent = (e) => { e.preventDefault(); };
    joy.addEventListener('pointerdown', (e) => {
      if (this.joyPointer != null) return;
      this.joyPointer = e.pointerId; joy.setPointerCapture(e.pointerId);
      const r = joy.getBoundingClientRect();
      this.joyCenter = { x: e.clientX, y: e.clientY };
      this.joyBase.style.left = `${e.clientX - r.left}px`; this.joyBase.style.top = `${e.clientY - r.top}px`; this.joyBase.classList.add('live');
      prevent(e);
    });
    joy.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.joyPointer) return;
      const dx = e.clientX - this.joyCenter.x, dy = e.clientY - this.joyCenter.y;
      const R = 48, len = Math.hypot(dx, dy) || 1, k = Math.min(1, len / R);
      const nx = dx / len * k, ny = dy / len * k;
      this.move.x = nx; this.move.y = -ny;
      this.knob.style.transform = `translate(${nx * R}px, ${ny * R}px)`;
      prevent(e);
    });
    const joyEnd = (e) => { if (e.pointerId !== this.joyPointer) return; this.joyPointer = null; this.move.x = 0; this.move.y = 0; this.knob.style.transform = ''; this.joyBase.classList.remove('live'); };
    joy.addEventListener('pointerup', joyEnd); joy.addEventListener('pointercancel', joyEnd);

    // Look / drag zone: look around while walking; in games it feeds mouse moves and hold/tap actions.
    look.addEventListener('pointerdown', (e) => {
      if (this.lookPointer != null) return;
      this.lookPointer = e.pointerId; look.setPointerCapture(e.pointerId);
      this.lookLast = { x: e.clientX, y: e.clientY }; this.lookStart = { x: e.clientX, y: e.clientY, t: performance.now() }; this.lookMoved = 0;
      if (this.games.busy() && this.layout?.hold) this.games.mouseDown();
      prevent(e);
    });
    look.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.lookPointer) return;
      const dx = e.clientX - this.lookLast.x, dy = e.clientY - this.lookLast.y;
      this.lookLast = { x: e.clientX, y: e.clientY }; this.lookMoved += Math.abs(dx) + Math.abs(dy);
      const busy = this.games.busy();
      if (!busy || this.layout?.look) this.controller.touchLook(dx * 1.6, dy * 1.6);
      if (busy) this.games.mouseMove(dx * 2.2, dy * 2.2);
      prevent(e);
    });
    const lookEnd = (e) => {
      if (e.pointerId !== this.lookPointer) return;
      this.lookPointer = null;
      const busy = this.games.busy();
      if (busy && this.layout?.hold) this.games.mouseUp();
      else if (busy && this.lookMoved < 12 && performance.now() - this.lookStart.t < 300) { this.games.mouseDown(); setTimeout(() => this.games.mouseUp(), 40); }
      else if (!busy && this.lookMoved < 12 && performance.now() - this.lookStart.t < 300 && this.controller.target) this.onInteract();
    };
    look.addEventListener('pointerup', lookEnd); look.addEventListener('pointercancel', lookEnd);

    this.btnInteract.addEventListener('pointerdown', (e) => { prevent(e); this.onInteract(); });
    this.btnQuit.addEventListener('pointerdown', (e) => { prevent(e); this.onQuit(); });
    this.root.querySelector('#tb-pause').addEventListener('pointerdown', (e) => { prevent(e); this.onPause(); });
    this.root.addEventListener('contextmenu', prevent);
  }
  // Build the on-screen pad for the active session.
  setLayout(kind) {
    this.layout = PAD_LAYOUTS[kind] || null;
    this.pad.innerHTML = '';
    if (!this.layout) { this.pad.hidden = true; return; }
    const L = this.layout;
    const mk = (label, code, cls) => {
      const b = document.createElement('button'); b.className = `tb pb ${cls || ''}`; b.textContent = label;
      const down = (e) => { e.preventDefault(); b.classList.add('on'); if (code === 'mouse') this.games.mouseDown(); else this.games.key(code, true); };
      const up = (e) => { e.preventDefault(); b.classList.remove('on'); if (code === 'mouse') this.games.mouseUp(); else this.games.key(code, false); };
      b.addEventListener('pointerdown', down); b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('pointerleave', up);
      return b;
    };
    const leftGroup = document.createElement('div'); leftGroup.className = 'pgroup left';
    const rightGroup = document.createElement('div'); rightGroup.className = 'pgroup right';
    if (L.dpad) {
      const g = document.createElement('div'); g.className = 'dpad';
      g.append(mk('▲', 'KeyW', 'up'), mk('◀', 'KeyA', 'l'), mk('▶', 'KeyD', 'r'), mk('▼', 'KeyS', 'dn'));
      leftGroup.append(g);
    } else if (L.left) { leftGroup.append(mk('◀', L.left), mk('▶', L.right)); }
    if (L.lanes) { const g = document.createElement('div'); g.className = 'lanes'; L.lanes.forEach(([c, l]) => g.append(mk(l, c))); rightGroup.append(g); }
    if (L.b) rightGroup.append(mk(L.b[1], L.b[0], 'b'));
    if (L.a) rightGroup.append(mk(L.a[1], L.a[0], 'a'));
    if (L.hold) { const h = document.createElement('div'); h.className = 'hint-hold'; h.textContent = `${L.hold[1]} — drag anywhere on the right`; rightGroup.append(h); }
    this.pad.append(leftGroup, rightGroup);
    this.pad.hidden = false;
  }
  update() {
    if (!this.enabled) return;
    const busy = this.games.busy();
    const modal = this.games.mode === 'modal';
    const target = !busy && this.controller.target;
    this.btnInteract.hidden = !target;
    if (target) { const it = this.controller.target.userData.interact; this.btnInteract.textContent = it.cost ? `PLAY · ${it.cost}` : (it.kind === 'bar' ? 'ORDER' : it.kind === 'kiosk' ? 'RECHARGE' : 'OPEN'); }
    this.btnQuit.hidden = !busy || modal;
    this.joy.style.visibility = busy ? 'hidden' : 'visible';
    const kind = busy ? this.games.session?.touchKind : null;
    if (kind !== this.currentKind) { this.currentKind = kind; this.setLayout(kind); }
    this.look.style.pointerEvents = modal ? 'none' : 'auto';
  }
}
