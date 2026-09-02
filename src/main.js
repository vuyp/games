// D&B Arcade Simulator — entry point.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { initMaterials, M } from './materials.js';
import { Batcher, updatables, player } from './world.js';
import { ScreenManager } from './screens.js';
import { buildBuilding, HALL } from './building.js';
import { buildLayout } from './layout.js';
import { PlayerController, CameraRig } from './player.js';
import { GameManager } from './stations.js';
import { HUD } from './hud.js';
import { ArcadeAudio } from './audio.js';
import * as S from './state.js';
import { TouchControls, isTouchDevice } from './touch.js';
import { buildAtmosphere } from './atmosphere.js';

(async () => {

const params = new URLSearchParams(location.search);
const debug = params.has('debug');
const QUALITY = {
  low: { bloom: false, shadows: false, reflect: false, tier: 1, pr: 1, smaa: false },
  medium: { bloom: true, shadows: true, reflect: false, tier: 2, pr: 1.25, smaa: false },
  high: { bloom: true, shadows: true, reflect: true, tier: 3, pr: 1.5, smaa: true },
  mobile: { bloom: true, shadows: false, reflect: false, tier: 1, pr: 1, smaa: false, bloomStrength: 0.42 },
};
const touch = isTouchDevice();

const hud = new HUD();
const audio = new ArcadeAudio();
const storage = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage unavailable */ } } };
const wanted = params.get('quality') || storage.get('db-arcade-quality') || (touch ? 'mobile' : 'medium');
let quality = QUALITY[wanted] ? wanted : 'medium';
hud.el.quality.value = quality;
document.body.classList.toggle('touch', touch);
if (touch) hud.el.start.textContent = 'TAP TO ENTER';

// ---------- renderer ----------
const renderer = new THREE.WebGLRenderer({ antialias: !debug, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('app').appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05040a);
scene.fog = new THREE.FogExp2(0x07050e, 0.011);
const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.08, 260);
camera.rotation.order = 'YXZ';
scene.add(camera);

// ---------- build ----------
hud.setStatus('Generating textures…');
await new Promise(r => setTimeout(r, 30));
initMaterials();
const batcher = new Batcher(scene);
const screens = new ScreenManager();
hud.setStatus('Building the venue…');
await new Promise(r => setTimeout(r, 30));
const venue = buildBuilding(scene, batcher, screens, quality);
hud.setStatus('Rolling in the games…');
await new Promise(r => setTimeout(r, 30));
const layout = buildLayout(scene, batcher, screens);
hud.setStatus('Merging geometry…');
await new Promise(r => setTimeout(r, 30));
const staticMeshes = batcher.finalize();
if (layout.mid.extraLights) venue.lights.push(...layout.mid.extraLights);
const atmosphere = buildAtmosphere(scene, venue.lights, quality);
void atmosphere;

// reflective lobby floor (high quality)
let reflector = null;
function setupReflector(on) {
  if (on && !reflector) {
    reflector = new Reflector(new THREE.PlaneGeometry(20, 8), { textureWidth: 1024, textureHeight: 512, color: 0x777777, clipBias: 0.003 });
    reflector.rotation.x = -Math.PI / 2; reflector.position.set(0, 0.004, 4);
    scene.add(reflector);
    tileOverlay = new THREE.Mesh(new THREE.PlaneGeometry(20, 8), M.tile.clone());
    tileOverlay.material.transparent = true; tileOverlay.material.opacity = 0.72;
    tileOverlay.rotation.x = -Math.PI / 2; tileOverlay.position.set(0, 0.014, 4);
    tileOverlay.material.map = M.tile.map.clone(); tileOverlay.material.map.repeat.set(10, 4); tileOverlay.material.map.needsUpdate = true;
    tileOverlay.material.roughnessMap = M.tile.roughnessMap.clone(); tileOverlay.material.roughnessMap.repeat.set(10, 4); tileOverlay.material.roughnessMap.needsUpdate = true;
    tileOverlay.receiveShadow = true;
    scene.add(tileOverlay);
  }
  if (reflector) { reflector.visible = on; tileOverlay.visible = on; }
}
let tileOverlay = null;

// ---------- lights per quality ----------
function applyQuality(q) {
  quality = q; storage.set('db-arcade-quality', q);
  const Q = QUALITY[q];
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, Q.pr));
  renderer.shadowMap.enabled = Q.shadows;
  for (const l of venue.lights) {
    l.visible = (l.userData.tier || 1) <= Q.tier;
    if (l.isSpotLight || l.isPointLight) {
      l.castShadow = Q.shadows && !!l.userData.shadow;
      if (l.castShadow) { l.shadow.mapSize.set(q === 'high' ? 2048 : 1024, q === 'high' ? 2048 : 1024); l.shadow.bias = -0.0006; l.shadow.normalBias = 0.02; l.shadow.camera.near = 0.3; l.shadow.camera.far = 22; }
    }
  }
  bloomPass.enabled = Q.bloom;
  bloomPass.strength = Q.bloomStrength ?? 0.55;
  screens.perFrame = q === 'mobile' || q === 'low' ? 2 : 4;
  smaaPass.enabled = Q.smaa;
  setupReflector(Q.reflect);
  scene.traverse(o => { if (o.material) o.material.needsUpdate = true; });
  composer.setSize(window.innerWidth, window.innerHeight);
}

// ---------- post-processing ----------
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.55, 0.6, 0.86);
composer.addPass(bloomPass);
const smaaPass = new SMAAPass();
composer.addPass(smaaPass);
composer.addPass(new OutputPass());

// ---------- environment reflections captured from inside the arcade ----------
const pmrem = new THREE.PMREMGenerator(renderer);
function captureEnvironment() {
  const rt = new THREE.WebGLCubeRenderTarget(256, { type: THREE.HalfFloatType });
  const cube = new THREE.CubeCamera(0.5, 120, rt);
  cube.position.set(0, 2.2, -9);
  const fog = scene.fog; scene.fog = null;
  const refl = reflector?.visible; if (reflector) reflector.visible = false;
  cube.update(renderer, scene);
  if (reflector) reflector.visible = refl;
  scene.fog = fog;
  const env = pmrem.fromCubemap(rt.texture).texture;
  scene.environment = env;
  scene.environmentIntensity = 0.55;
  rt.dispose();
}

// ---------- player, games ----------
const controller = new PlayerController(camera, renderer.domElement);
const rig = new CameraRig(camera, controller);
const games = new GameManager({ scene, camera, controller, rig, hud, audio, screens });
controller.setPose(venue.spawn.pos.x, venue.spawn.pos.y, venue.spawn.pos.z, venue.spawn.yaw, venue.spawn.pitch);
controller.update(0);
S.onChange((st, what) => hud.card(st, what));
S.load();

controller.moveListeners.push((dx, dy) => { if (games.busy()) games.mouseMove(dx, dy); });
const touchControls = touch ? new TouchControls({
  controller, games, hud,
  onInteract: () => { if (controller.target && !games.busy()) games.interact(controller.target); },
  onQuit: () => games.quit(),
  onPause: () => { hud.showOverlay({ title: 'PAUSED', button: 'TAP TO RESUME', status: 'Your Power Card is saved automatically.' }); },
}) : null;
controller.lockListeners.push((locked) => {
  if (!locked && !games.busy() && playing) {
    hud.showOverlay({ title: 'PAUSED', button: 'CLICK TO RESUME', status: 'Your Power Card is saved automatically.' });
  }
});

let playing = false;
function start() {
  audio.init();
  audio.setEnabled(hud.el.audio.checked);
  hud.hideOverlay();
  playing = true;
  if (touch) {
    touchControls.enable();
    try { document.documentElement.requestFullscreen?.()?.catch?.(() => {}); } catch (e) { /* not allowed */ }
    try { screen.orientation?.lock?.('landscape')?.catch?.(() => {}); } catch (e) { /* unsupported */ }
  } else controller.lock();
  if (!started) {
    started = true;
    hud.hint(touch ? 'Left thumb walks, right thumb looks. Walk through the doors and tap PLAY at any machine.' : 'Walk through the doors. Your Power Card has chips — play games to win tickets!', 7000);
  }
}
let started = false;
hud.el.start.addEventListener('click', start);
hud.el.overlay.addEventListener('click', (e) => { if (playing && e.target === hud.el.overlay) start(); });
hud.el.quality.addEventListener('change', () => applyQuality(hud.el.quality.value));
hud.el.audio.addEventListener('change', () => audio.setEnabled(hud.el.audio.checked));
hud.el.reset.addEventListener('click', () => { S.reset(); hud.toast('Power Card reset', ''); });

document.addEventListener('keydown', (e) => {
  if (!playing) return;
  if (e.code === 'Tab' || e.code === 'Space' && games.busy()) e.preventDefault();
  if (e.code === 'KeyM') { audio.setMusic(!audio.musicOn); hud.toast(`Music ${audio.musicOn ? 'on' : 'off'}`); return; }
  if (e.code === 'KeyF') { flashlight.visible = !flashlight.visible; return; }
  if (e.code === 'F3') { showFps = !showFps; hud.fps(showFps ? '…' : null); return; }
  if (games.busy()) {
    if (e.code === 'KeyQ' || (e.code === 'Escape' && games.mode === 'modal')) { games.quit(); if (games.mode === 'walk') controller.lock(); return; }
    games.key(e.code, true);
    return;
  }
  if (e.code === 'KeyE' && controller.target) games.interact(controller.target);
});
document.addEventListener('keyup', (e) => { if (playing && games.busy()) games.key(e.code, false); });
renderer.domElement.addEventListener('mousedown', (e) => {
  if (!playing) return;
  if (touch) return;
  if (!controller.locked && !games.busy()) { controller.lock(); return; }
  if (e.button === 0) { if (games.busy()) games.mouseDown(); else if (controller.target) games.interact(controller.target); }
});
document.addEventListener('mouseup', (e) => { if (playing && e.button === 0 && games.busy()) games.mouseUp(); });
document.addEventListener('contextmenu', (e) => e.preventDefault());

// flashlight (F)
const flashlight = new THREE.SpotLight(0xfff2dd, 0, 18, 0.5, 0.6, 1.5);
flashlight.visible = false; flashlight.intensity = 30;
camera.add(flashlight); camera.add(flashlight.target); flashlight.position.set(0.2, -0.15, 0); flashlight.target.position.set(0, 0, -5);

// ---------- loop ----------
const clock = new THREE.Clock();
let showFps = false, frames = 0, fpsT = 0, indoor = false, stepT = 0, envCaptured = false, statsCache = null;
function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, clock.getDelta());
  const t = clock.elapsedTime;
  if (playing || debug) {
    controller.update(dt);
    rig.update(dt);
    games.update(dt, t);
    touchControls?.update();
    for (let i = 0; i < updatables.length; i++) updatables[i].update(dt, t);
    if (!games.busy()) {
      const target = controller.pick();
      if (target) { const it = target.userData.interact; hud.prompt(`${it.label}${it.cost ? ` · ${it.cost} chips` : ''}`); }
      else hud.prompt(null);
    }
    // indoor / outdoor ambience & footsteps
    const inside = player.pos.z < HALL.maxZ;
    if (inside !== indoor) { indoor = inside; audio.setIndoor(indoor); if (indoor) hud.hint('Welcome to the Million Dollar Midway. Press E on any game to play.', 6000); }
    if (controller.speed > 0.5 && controller.enabled && !controller.lookOnly) { stepT += dt * (controller.running ? 1.9 : 1.4); if (stepT > 1) { stepT = 0; audio.footstep(controller.running); } }
    audio.update(t);
  }
  if (!envCaptured && t > 0.5) { envCaptured = true; captureEnvironment(); }
  composer.render();
  if (showFps) { frames++; fpsT += dt; if (fpsT > 0.5) { hud.fps(`${Math.round(frames / fpsT)} fps · ${renderer.info.render.calls} calls · ${(renderer.info.render.triangles / 1000).toFixed(0)}k tris`); frames = 0; fpsT = 0; } }
}
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight); composer.setSize(window.innerWidth, window.innerHeight);
});
applyQuality(quality);
hud.setStatus('Ready. Click to enter.');
hud.el.start.disabled = false;
frame();

// ---------- debug API used by the screenshot harness ----------
window.ARCADE = {
  ready: true, scene, camera, controller, games, renderer, screens, layout, venue,
  debugStart(x, y, z, yaw, pitch) { hud.hideOverlay(); playing = true; controller.setPose(x, y, z, yaw, pitch); controller.update(0); },
  renderOnce() { controller.update(0); composer.render(); },
  // Advance game logic without rendering (used by the headless playtest).
  simulate(seconds, step = 1 / 30) {
    let t = clock.elapsedTime;
    for (let s = 0; s < seconds; s += step) { t += step; controller.update(step); rig.update(step); games.update(step, t); for (let i = 0; i < updatables.length; i++) if (!updatables[i].skipInSim) updatables[i].update(step, t); }
  },
  stats() { return { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures, staticMeshes: staticMeshes.length, lights: venue.lights.length, updatables: updatables.length }; },
};

})();