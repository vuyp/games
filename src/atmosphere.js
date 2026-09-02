// Atmosphere & realism: volumetric light cones, drifting dust, neon flicker, street traffic outside.
import * as THREE from 'three';
import { updatables } from './world.js';
import { radialGlowTexture } from './textures.js';
import { M } from './materials.js';
import { glowMat } from './neon.js';

const coneVert = `varying vec2 vUv; varying vec3 vN; varying vec3 vV;
void main() { vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`;
const coneFrag = `uniform vec3 color; uniform float intensity; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
void main() { float edge = pow(abs(dot(vN, vV)), 1.6); float a = pow(vUv.y, 1.8) * (1.0 - 0.45 * vUv.y) * edge * intensity; gl_FragColor = vec4(color * a, a); }`;

export function buildAtmosphere(scene, lights, quality) {
  const group = new THREE.Group();
  scene.add(group);
  // ---- light cones under the indoor spotlights ----
  const cones = [];
  for (const l of lights) {
    if (!l.isSpotLight || l.position.y < 4 || l.position.z > 8) continue;
    const h = l.position.y - 0.05;
    const r = Math.tan(l.angle * 0.55) * h;
    const geo = new THREE.ConeGeometry(r, h, 24, 1, true);
    const mat = new THREE.ShaderMaterial({ uniforms: { color: { value: new THREE.Color(l.color).multiplyScalar(0.9) }, intensity: { value: 0.07 } }, vertexShader: coneVert, fragmentShader: coneFrag, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.FrontSide });
    const cone = new THREE.Mesh(geo, mat);
    cone.position.set(l.position.x, l.position.y - h / 2, l.position.z);
    cone.renderOrder = 3;
    cone.userData.light = l;
    group.add(cone);
    cones.push(cone);
  }
  // ---- dust motes ----
  const N = quality === 'low' || quality === 'mobile' ? 250 : 700;
  const pos = new Float32Array(N * 3);
  const seed = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    pos[i * 3] = -26 + Math.random() * 52;
    pos[i * 3 + 1] = 0.3 + Math.random() * 4.6;
    pos[i * 3 + 2] = -40 + Math.random() * 46;
    seed[i] = Math.random() * 100;
  }
  const pg = new THREE.BufferGeometry();
  pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const dust = new THREE.Points(pg, new THREE.PointsMaterial({ size: 0.045, map: radialGlowTexture('rgba(255,240,220,1)', 'rgba(255,240,220,0)', 64), transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true, color: 0xffe9d0 }));
  dust.frustumCulled = false;
  group.add(dust);
  // ---- street with passing traffic ----
  const street = new THREE.Mesh(new THREE.PlaneGeometry(220, 12), M.asphalt);
  street.rotation.x = -Math.PI / 2; street.position.set(0, -0.11, 64); group.add(street);
  const dashMat = new THREE.MeshBasicMaterial({ color: 0xd8d0a0 });
  for (let x = -100; x < 100; x += 6) { const d = new THREE.Mesh(new THREE.PlaneGeometry(3, 0.14), dashMat); d.rotation.x = -Math.PI / 2; d.position.set(x, -0.105, 64); group.add(d); }
  const curb = new THREE.Mesh(new THREE.BoxGeometry(220, 0.14, 0.3), M.concrete); curb.position.set(0, -0.06, 57.9); group.add(curb);
  const cars = [];
  const mkCar = (color, dir) => {
    const g = new THREE.Group();
    const body = new THREE.MeshPhysicalMaterial({ color, roughness: 0.3, metalness: 0.6, clearcoat: 1 });
    const b1 = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.55, 1.9), body); b1.position.y = 0.5; g.add(b1);
    const b2 = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.5, 1.7), M.tintedGlass); b2.position.set(-0.2, 1.02, 0); g.add(b2);
    const top = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.06, 1.6), body); top.position.set(-0.2, 1.29, 0); g.add(top);
    for (const [dx, dz] of [[1.4, 0.85], [1.4, -0.85], [-1.4, 0.85], [-1.4, -0.85]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.22, 12), M.rubber); w.rotation.x = Math.PI / 2; w.position.set(dx, 0.33, dz); g.add(w); }
    const hl = glowMat(0xfff4d0, 4), tl = glowMat(0xff3020, 2.5);
    for (const dz of [-0.7, 0.7]) {
      const h = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.16, 0.3), hl); h.position.set(2.21, 0.62, dz); g.add(h);
      const t = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.12, 0.3), tl); t.position.set(-2.21, 0.66, dz); g.add(t);
    }
    const lamp = new THREE.PointLight(0xfff0c0, 18, 14, 2); lamp.position.set(2.6, 0.7, 0); g.add(lamp);
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(9, 5), new THREE.MeshBasicMaterial({ map: radialGlowTexture('rgba(255,240,200,1)', 'rgba(255,240,200,0)', 128), transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    glow.rotation.x = -Math.PI / 2; glow.position.set(5.5, -0.1, 0); g.add(glow);
    g.rotation.y = dir > 0 ? 0 : Math.PI;
    g.position.set(dir > 0 ? -120 : 120, -0.12, dir > 0 ? 66.5 : 61.5);
    group.add(g);
    return { g, dir, speed: 11 + Math.random() * 5, wait: Math.random() * 12 };
  };
  cars.push(mkCar(0x2a3a6a, 1), mkCar(0x8a1a1a, -1), mkCar(0xcfd2d8, 1));
  // ---- neon flicker on a couple of signs ----
  const flickerTexts = new Set(['ICE COLD BEER', 'VR ZONE', 'WELCOME']);
  const flicker = [];
  scene.traverse(o => { if (o.userData?.neonText && flickerTexts.has(o.userData.neonText)) flicker.push({ mesh: o, base: o.material.color.clone(), phase: Math.random() * 10 }); });

  updatables.push({ update(dt, t) {
    // dust drift
    const p = pg.attributes.position.array;
    for (let i = 0; i < N; i++) {
      const s = seed[i];
      p[i * 3] += Math.sin(t * 0.3 + s) * 0.002;
      p[i * 3 + 1] += Math.cos(t * 0.2 + s * 1.3) * 0.0015 + 0.0006;
      p[i * 3 + 2] += Math.sin(t * 0.25 + s * 0.7) * 0.002;
      if (p[i * 3 + 1] > 5) p[i * 3 + 1] = 0.3;
    }
    pg.attributes.position.needsUpdate = true;
    // cones follow light visibility
    for (const c of cones) c.visible = c.userData.light.visible;
    // traffic
    for (const c of cars) {
      if (c.wait > 0) { c.wait -= dt; c.g.visible = false; continue; }
      c.g.visible = true;
      c.g.position.x += c.dir * c.speed * dt;
      if (Math.abs(c.g.position.x) > 125) { c.g.position.x = -c.dir * 120; c.wait = 6 + Math.random() * 16; c.speed = 11 + Math.random() * 5; }
    }
    // flicker
    for (const f of flicker) {
      const n = Math.sin(t * 37 + f.phase) * Math.sin(t * 5.3 + f.phase * 2) * Math.sin(t * 0.9 + f.phase);
      const k = n > 0.72 ? 0.25 + Math.random() * 0.3 : 1;
      f.mesh.material.color.copy(f.base).multiplyScalar(k);
    }
  } });
  return { group, cones, dust };
}
