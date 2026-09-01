// Procedural Web Audio: ambience (HVAC hum, crowd murmur, random machine blips), music loop, SFX.
export class ArcadeAudio {
  constructor() {
    this.ctx = null; this.ready = false; this.enabled = true; this.musicOn = true; this.indoor = false;
    this.nextBlip = 0; this.musicStep = 0; this.musicNext = 0;
  }
  init() {
    if (this.ready) { this.ctx.resume?.(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = this.ctx = new AC();
    this.master = ctx.createGain(); this.master.gain.value = this.enabled ? 0.9 : 0; this.master.connect(ctx.destination);
    this.sfxBus = ctx.createGain(); this.sfxBus.gain.value = 0.9; this.sfxBus.connect(this.master);
    this.ambBus = ctx.createGain(); this.ambBus.gain.value = 0.0; this.ambBus.connect(this.master);
    this.musicBus = ctx.createGain(); this.musicBus.gain.value = 0.0; this.musicBus.connect(this.master);
    this.blipBus = ctx.createGain(); this.blipBus.gain.value = 0.0; this.blipBus.connect(this.master);
    // noise buffer
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
    this.noiseBuf = buf;
    const white = ctx.createBuffer(1, len, ctx.sampleRate);
    const wd = white.getChannelData(0);
    for (let i = 0; i < len; i++) wd[i] = Math.random() * 2 - 1;
    this.whiteBuf = white;
    // HVAC hum
    const hum = ctx.createBufferSource(); hum.buffer = buf; hum.loop = true;
    const humF = ctx.createBiquadFilter(); humF.type = 'lowpass'; humF.frequency.value = 180;
    const humG = ctx.createGain(); humG.gain.value = 0.35;
    hum.connect(humF).connect(humG).connect(this.ambBus); hum.start();
    // crowd murmur: bandpassed noise with slow amplitude wobble
    const crowd = ctx.createBufferSource(); crowd.buffer = white; crowd.loop = true;
    const cf = ctx.createBiquadFilter(); cf.type = 'bandpass'; cf.frequency.value = 520; cf.Q.value = 0.6;
    const cf2 = ctx.createBiquadFilter(); cf2.type = 'lowpass'; cf2.frequency.value = 1400;
    const cg = ctx.createGain(); cg.gain.value = 0.09;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.17; const lg = ctx.createGain(); lg.gain.value = 0.03;
    lfo.connect(lg).connect(cg.gain); lfo.start();
    crowd.connect(cf).connect(cf2).connect(cg).connect(this.ambBus); crowd.start();
    // outdoor traffic bed
    this.outBus = ctx.createGain(); this.outBus.gain.value = 0.25; this.outBus.connect(this.master);
    const traffic = ctx.createBufferSource(); traffic.buffer = buf; traffic.loop = true;
    const tf = ctx.createBiquadFilter(); tf.type = 'lowpass'; tf.frequency.value = 300;
    const tg = ctx.createGain(); tg.gain.value = 0.5;
    traffic.connect(tf).connect(tg).connect(this.outBus); traffic.start();
    this.ready = true;
    this.setIndoor(this.indoor, true);
  }
  setEnabled(on) { this.enabled = on; if (this.master) this.master.gain.setTargetAtTime(on ? 0.9 : 0, this.ctx.currentTime, 0.05); }
  setMusic(on) { this.musicOn = on; if (this.musicBus) this.musicBus.gain.setTargetAtTime(on && this.indoor ? 0.16 : (on ? 0.05 : 0), this.ctx.currentTime, 0.3); }
  setIndoor(indoor, immediate = false) {
    this.indoor = indoor;
    if (!this.ready) return;
    const t = this.ctx.currentTime, tc = immediate ? 0.01 : 0.6;
    this.ambBus.gain.setTargetAtTime(indoor ? 0.9 : 0.25, t, tc);
    this.blipBus.gain.setTargetAtTime(indoor ? 0.55 : 0.12, t, tc);
    this.outBus.gain.setTargetAtTime(indoor ? 0.05 : 0.35, t, tc);
    this.musicBus.gain.setTargetAtTime(this.musicOn ? (indoor ? 0.16 : 0.05) : 0, t, tc);
  }
  update(t) {
    if (!this.ready || !this.enabled) return;
    const now = this.ctx.currentTime;
    // random machine blips from around the room
    if (now > this.nextBlip) {
      this.nextBlip = now + 0.12 + Math.random() * (this.indoor ? 0.5 : 1.5);
      this.blip(now);
    }
    // music scheduler (lookahead 0.2s)
    while (this.musicNext < now + 0.25) {
      if (this.musicNext < now - 1) this.musicNext = now;
      this.musicTick(this.musicNext);
      this.musicNext += 0.25; // 16th notes at 120bpm
      this.musicStep++;
    }
  }
  // ---- helpers ----
  tone(freq, { type = 'square', dur = 0.12, vol = 0.2, at = 0, slide = 0, pan = 0, bus = null, attack = 0.005, decay = null } = {}) {
    if (!this.ready) return;
    const ctx = this.ctx, t0 = ctx.currentTime + at;
    const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t0 + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + attack); g.gain.exponentialRampToValueAtTime(0.0005, t0 + (decay || dur));
    let node = g;
    if (pan && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = pan; g.connect(p); node = p; }
    node.connect(bus || this.sfxBus);
    o.connect(g); o.start(t0); o.stop(t0 + (decay || dur) + 0.05);
  }
  noise({ dur = 0.2, vol = 0.2, at = 0, freq = 2000, q = 1, type = 'bandpass', pan = 0, bus = null } = {}) {
    if (!this.ready) return;
    const ctx = this.ctx, t0 = ctx.currentTime + at;
    const s = ctx.createBufferSource(); s.buffer = this.whiteBuf;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain(); g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0005, t0 + dur);
    let node = g;
    if (pan && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = pan; g.connect(p); node = p; }
    node.connect(bus || this.sfxBus);
    s.connect(f).connect(g); s.start(t0); s.stop(t0 + dur + 0.05);
  }
  blip() {
    const pan = Math.random() * 1.6 - 0.8;
    const kind = Math.random();
    const base = [220, 330, 440, 523, 659, 880][Math.floor(Math.random() * 6)];
    if (kind < 0.4) this.tone(base, { type: 'square', dur: 0.08, vol: 0.05, pan, bus: this.blipBus, slide: base * (Math.random() > 0.5 ? 0.5 : -0.3) });
    else if (kind < 0.6) { for (let i = 0; i < 3; i++) this.tone(base * (1 + i * 0.25), { type: 'triangle', dur: 0.07, vol: 0.05, at: i * 0.07, pan, bus: this.blipBus }); }
    else if (kind < 0.75) this.noise({ dur: 0.12, vol: 0.05, freq: 3000 + Math.random() * 3000, pan, bus: this.blipBus });
    else if (kind < 0.9) this.tone(base * 2, { type: 'sawtooth', dur: 0.25, vol: 0.03, pan, bus: this.blipBus, slide: -base });
    else { for (let i = 0; i < 6; i++) this.tone(1200 + i * 60, { type: 'square', dur: 0.03, vol: 0.03, at: i * 0.045, pan, bus: this.blipBus }); }
  }
  // Lo-fi synth loop: pad chords + bass + arpeggio.
  musicTick(t) {
    const ctx = this.ctx;
    const chords = [[0, 4, 7, 11], [5, 9, 12, 16], [3, 7, 10, 14], [7, 11, 14, 17]]; // Cmaj7 F Eb G
    const bar = Math.floor(this.musicStep / 16) % 4;
    const step = this.musicStep % 16;
    const root = 130.81; // C3
    const chord = chords[bar];
    const hz = (semi) => root * Math.pow(2, semi / 12);
    const mk = (freq, type, vol, dur, at, detune = 0) => {
      const o = ctx.createOscillator(); o.type = type; o.frequency.value = freq; o.detune.value = detune;
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(vol, at + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
      o.connect(g).connect(this.musicBus); o.start(at); o.stop(at + dur + 0.05);
    };
    if (step === 0) {
      for (const s of chord) { mk(hz(s + 12), 'triangle', 0.08, 3.9, t, 4); mk(hz(s + 12), 'sine', 0.06, 3.9, t, -6); }
    }
    if (step % 4 === 0) mk(hz(chord[0] - 12), 'square', 0.07, 0.4, t);
    if (step % 4 === 2) mk(hz(chord[0] - 12), 'square', 0.05, 0.2, t);
    const arp = chord[(step + bar) % 4] + 24;
    mk(hz(arp), 'square', 0.035, 0.18, t);
    if (step % 8 === 4) { this.noise({ dur: 0.08, vol: 0.05, freq: 6000, at: t - ctx.currentTime, bus: this.musicBus }); }
  }
  // ---- SFX ----
  click() { this.tone(900, { type: 'square', dur: 0.04, vol: 0.12 }); }
  swipe() { this.tone(1046, { type: 'sine', dur: 0.09, vol: 0.2 }); this.tone(1568, { type: 'sine', dur: 0.14, vol: 0.2, at: 0.09 }); }
  deny() { this.tone(220, { type: 'square', dur: 0.15, vol: 0.15 }); this.tone(180, { type: 'square', dur: 0.25, vol: 0.15, at: 0.15 }); }
  coin() { this.tone(1975, { type: 'square', dur: 0.06, vol: 0.15 }); this.tone(2637, { type: 'square', dur: 0.25, vol: 0.15, at: 0.06 }); }
  tickets(n) { const c = Math.min(24, Math.max(3, Math.round(n / 4))); for (let i = 0; i < c; i++) { this.noise({ dur: 0.03, vol: 0.12, freq: 3200, q: 3, at: i * 0.05 }); this.tone(2400, { type: 'square', dur: 0.012, vol: 0.05, at: i * 0.05 }); } }
  win(big = false) {
    const seq = big ? [523, 659, 784, 1046, 1318, 1568] : [659, 784, 1046];
    seq.forEach((f, i) => this.tone(f, { type: 'square', dur: 0.14, vol: 0.14, at: i * 0.09 }));
    if (big) seq.forEach((f, i) => this.tone(f * 1.5, { type: 'triangle', dur: 0.3, vol: 0.08, at: 0.55 + i * 0.05 }));
  }
  lose() { [440, 370, 311, 220].forEach((f, i) => this.tone(f, { type: 'sawtooth', dur: 0.22, vol: 0.1, at: i * 0.18 })); }
  roll() { this.noise({ dur: 0.9, vol: 0.18, freq: 500, q: 0.7, type: 'lowpass' }); }
  thud() { this.tone(90, { type: 'sine', dur: 0.18, vol: 0.4, slide: -50 }); this.noise({ dur: 0.08, vol: 0.15, freq: 400, type: 'lowpass' }); }
  bounce() { this.tone(180, { type: 'sine', dur: 0.1, vol: 0.25, slide: -80 }); }
  swish() { this.noise({ dur: 0.25, vol: 0.2, freq: 2500, q: 0.5 }); }
  score(points) { const f = 600 + Math.min(points, 100) * 8; this.tone(f, { type: 'square', dur: 0.08, vol: 0.15 }); this.tone(f * 1.5, { type: 'square', dur: 0.16, vol: 0.15, at: 0.08 }); }
  laser() { this.tone(1400, { type: 'square', dur: 0.12, vol: 0.08, slide: -1100 }); }
  explosion() { this.noise({ dur: 0.35, vol: 0.2, freq: 300, type: 'lowpass' }); this.tone(80, { type: 'sawtooth', dur: 0.3, vol: 0.15, slide: -40 }); }
  hit() { this.noise({ dur: 0.06, vol: 0.15, freq: 1500 }); this.tone(300, { type: 'square', dur: 0.06, vol: 0.1 }); }
  pop() { this.tone(700, { type: 'sine', dur: 0.05, vol: 0.2, slide: 400 }); }
  tick() { this.noise({ dur: 0.02, vol: 0.12, freq: 4000, q: 4 }); }
  motor(on) {
    if (!this.ready) return;
    if (on && !this.motorNode) {
      const o = this.ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 55;
      const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 400;
      const g = this.ctx.createGain(); g.gain.value = 0.05;
      o.connect(f).connect(g).connect(this.sfxBus); o.start();
      this.motorNode = { o, g };
    } else if (!on && this.motorNode) {
      this.motorNode.g.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
      const n = this.motorNode; setTimeout(() => n.o.stop(), 300); this.motorNode = null;
    }
  }
  engine(level) {
    if (!this.ready) return;
    if (!this.engineNode) {
      const o = this.ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 60;
      const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500;
      const g = this.ctx.createGain(); g.gain.value = 0;
      o.connect(f).connect(g).connect(this.sfxBus); o.start();
      this.engineNode = { o, g };
    }
    const e = this.engineNode;
    if (level == null) { e.g.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1); return; }
    e.o.frequency.setTargetAtTime(50 + level * 160, this.ctx.currentTime, 0.05);
    e.g.gain.setTargetAtTime(0.03 + level * 0.05, this.ctx.currentTime, 0.05);
  }
  footstep(run) { this.noise({ dur: 0.07, vol: run ? 0.09 : 0.05, freq: 250 + Math.random() * 100, type: 'lowpass' }); }
  door() { this.noise({ dur: 0.5, vol: 0.12, freq: 900, q: 0.4, type: 'lowpass' }); }
  cheer() { this.noise({ dur: 1.2, vol: 0.12, freq: 900, q: 0.5 }); }
}
