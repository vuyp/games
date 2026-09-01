// Venue architecture: exterior, facade & sign, lobby, main hall shell, ceiling rig, bar annex, lighting.
import * as THREE from 'three';
import { M, emissive, glowMat } from './materials.js';
import { neonText, boxSign, hangSign, BulbChaser, rectBulbs, lineBulbs } from './neon.js';
import { addCollider, interactionVolume, updatables, player, planeUVMeters } from './world.js';
import { starSkyTexture, labelTexture, posterTexture, radialGlowTexture } from './textures.js';

export const HALL = { minX: -28, maxX: 28, minZ: -42, maxZ: 8, height: 5.5 };

export function buildBuilding(scene, b, screens, quality) {
  const lights = [];
  const H = HALL;
  const wallT = 0.4;
  const ceilH = H.height;

  // ---------- sky & exterior ground ----------
  const sky = new THREE.Mesh(new THREE.SphereGeometry(220, 32, 16), new THREE.MeshBasicMaterial({ map: starSkyTexture(), side: THREE.BackSide, fog: false }));
  sky.position.y = -20;
  scene.add(sky);
  // asphalt lot
  b.plane(140, 80, M.asphalt, [0, -0.12, 54], [-Math.PI / 2, 0, 0], null, 4);
  b.plane(60, 60, M.asphalt, [-64, -0.12, 20], [-Math.PI / 2, 0, 0], null, 4);
  b.plane(60, 60, M.asphalt, [64, -0.12, 20], [-Math.PI / 2, 0, 0], null, 4);
  // sidewalk with curb
  b.box(80, 0.15, 6.5, M.sidewalk, [0, -0.075, 11.2], [0, 0, 0], null, 2);
  b.box(80, 0.15, 0.12, M.concrete, [0, -0.075, 14.5], [0, 0, 0], null, 1);
  // parking stripes
  for (let i = -6; i <= 6; i++) {
    b.box(0.12, 0.005, 5, M.paperWhite, [i * 3.2, -0.117, 24], [0, 0, 0]);
    b.box(0.12, 0.005, 5, M.paperWhite, [i * 3.2, -0.117, 34], [0, 0, 0]);
  }
  // distant skyline silhouettes
  for (let i = 0; i < 26; i++) {
    const x = -120 + i * 9.5 + ((i * 37) % 5);
    const w = 6 + (i * 13) % 7, h = 8 + (i * 29) % 22;
    b.box(w, h, 6, M.blackMatte, [x, h / 2 - 0.2, 95], [0, 0, 0]);
    for (let k = 0; k < Math.floor(h / 3); k++) {
      if ((i * 7 + k * 5) % 3 === 0) b.plane(0.7, 0.5, glowMat(0xffd28a, 1.2), [x - w / 2 + 1 + ((k * 11) % Math.max(1, w - 2)), 1.5 + k * 2.6, 91.95], [0, Math.PI, 0]);
    }
  }
  // lamp posts
  const lampGlow = radialGlowTexture('rgba(255,190,110,1)', 'rgba(255,190,110,0)', 128);
  const lampSpriteMat = new THREE.SpriteMaterial({ map: lampGlow, color: 0xffb060, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.55 });
  for (const [x, z] of [[-14, 24], [14, 24], [-14, 42], [14, 42]]) {
    b.cyl(0.07, 0.1, 7, M.steelDark, [x, 3.4, z], [0, 0, 0], null, 8);
    b.box(0.6, 0.18, 0.4, M.steelDark, [x, 7.0, z], [0, 0, 0]);
    b.plane(0.5, 0.3, glowMat(0xffc27a, 3), [x, 6.9, z], [Math.PI / 2, 0, 0]);
    const sp = new THREE.Sprite(lampSpriteMat); sp.scale.set(2.6, 2.6, 1); sp.position.set(x, 6.85, z); scene.add(sp);
    const pl = new THREE.PointLight(0xffb060, 30, 26, 2); pl.position.set(x, 6.6, z); pl.userData.tier = 2; lights.push(pl); scene.add(pl);
    b.plane(6, 6, new THREE.MeshBasicMaterial({ map: lampGlow, color: 0xff9a3a, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }), [x, -0.11, z], [-Math.PI / 2, 0, 0]);
  }
  // parked cars
  const carColors = [0x1a1c22, 0x5a0d12, 0x9aa0a8, 0x0c2a5a, 0x1f2f1f];
  const carMats = carColors.map(c => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.25, metalness: 0.6, clearcoat: 1, clearcoatRoughness: 0.1, envMapIntensity: 1.2 }));
  const carSpots = [[-11.2, 26.5, 0], [-8, 26.5, 0], [7.9, 26.5, 0], [11.2, 26.5, 0], [-4.8, 36.5, 0], [4.8, 36.5, 0], [14.4, 36.5, 0]];
  carSpots.forEach(([x, z], i) => {
    const m = carMats[i % carMats.length];
    b.box(1.9, 0.55, 4.4, m, [x, 0.5 - 0.12, z], [0, 0, 0]);
    b.box(1.7, 0.5, 2.4, M.tintedGlass, [x, 1.02 - 0.12, z - 0.2], [0, 0, 0]);
    b.box(1.6, 0.06, 2.3, m, [x, 1.29 - 0.12, z - 0.2], [0, 0, 0]);
    for (const [dx, dz] of [[-0.85, 1.4], [0.85, 1.4], [-0.85, -1.4], [0.85, -1.4]]) b.cyl(0.33, 0.33, 0.22, M.rubber, [x + dx, 0.33 - 0.12, z + dz], [0, 0, Math.PI / 2], null, 14);
    b.box(0.3, 0.12, 0.05, glowMat(0xff3020, 1.5), [x - 0.7, 0.7 - 0.12, z - 2.21], [0, 0, 0]);
    b.box(0.3, 0.12, 0.05, glowMat(0xff3020, 1.5), [x + 0.7, 0.7 - 0.12, z - 2.21], [0, 0, 0]);
  });
  // keep the player near the building
  addCollider(0, 17.5, 80, 1);
  addCollider(-32, 12, 1, 12);
  addCollider(32, 12, 1, 12);

  // ---------- facade ----------
  const facadeW = 68, facadeH = 8.2;
  // exterior wall face (outside of the front wall), full width, with parapet
  b.box((facadeW - 14.2) / 2, facadeH, 0.5, M.stucco, [-(14.2 + (facadeW - 14.2) / 2) / 2, facadeH / 2, H.maxZ + wallT + 0.25], [0, 0, 0], null, 3);
  b.box((facadeW - 14.2) / 2, facadeH, 0.5, M.stucco, [(14.2 + (facadeW - 14.2) / 2) / 2, facadeH / 2, H.maxZ + wallT + 0.25], [0, 0, 0], null, 3);
  b.box(14.4, facadeH - 3.4, 0.5, M.stucco, [0, 3.4 + (facadeH - 3.4) / 2, H.maxZ + wallT + 0.25], [0, 0, 0], null, 3);
  b.box(facadeW, 0.5, 1.0, M.concrete, [0, facadeH + 0.25, H.maxZ + wallT + 0.25], [0, 0, 0], null, 1);
  // entrance portal (brick surround around the glass storefront)
  b.box(16, 0.6, 0.9, M.brick, [0, 4.0, H.maxZ + wallT + 0.45], [0, 0, 0], null, 1.2);
  b.box(0.9, 4.3, 0.9, M.brick, [-7.55, 2.15, H.maxZ + wallT + 0.45], [0, 0, 0], null, 1.2);
  b.box(0.9, 4.3, 0.9, M.brick, [7.55, 2.15, H.maxZ + wallT + 0.45], [0, 0, 0], null, 1.2);
  // main sign: illuminated channel letters on a dark raceway
  b.box(15, 1.7, 0.25, M.blackPlastic, [0, 6.2, H.maxZ + wallT + 0.6], [0, 0, 0]);
  const mainSign = neonText("DAVE & BUSTER'S", { color: '#ffb02e', height: 1.25, intensity: 2.6, backing: false, letterSpacing: 4 });
  mainSign.position.set(0, 6.2, H.maxZ + wallT + 0.75);
  scene.add(mainSign);
  const sub = neonText('ARCADE  •  SPORTS BAR  •  RESTAURANT', { color: '#26e5ff', height: 0.42, intensity: 2.2, backing: false, letterSpacing: 8 });
  sub.position.set(0, 4.85, H.maxZ + wallT + 0.75);
  scene.add(sub);
  const signLight = new THREE.PointLight(0xffb060, 60, 22, 2); signLight.position.set(0, 6.3, H.maxZ + 3); signLight.userData.tier = 1; lights.push(signLight); scene.add(signLight);
  for (const x of [-9, 9]) {
    const up = new THREE.SpotLight(0xffc890, 80, 14, 0.5, 0.7, 1.6);
    up.position.set(x, 0.3, H.maxZ + wallT + 1.4); up.target.position.set(x * 0.8, 7, H.maxZ + wallT + 0.5);
    up.userData.tier = 1; scene.add(up); scene.add(up.target); lights.push(up);
    b.cyl(0.1, 0.12, 0.2, M.steelDark, [x, 0.1, H.maxZ + wallT + 1.4], [0.5, 0, 0], null, 10);
  }
  const moon = new THREE.DirectionalLight(0x9fb4ff, 0.35); moon.position.set(30, 60, 80); moon.target.position.set(0, 0, 20); moon.userData.tier = 1; scene.add(moon); scene.add(moon.target); lights.push(moon);
  // canopy over the sidewalk
  b.box(15, 0.4, 5.2, M.blackPlastic, [0, 3.9, H.maxZ + wallT + 2.8], [0, 0, 0]);
  b.box(15.2, 0.55, 0.3, M.steelDark, [0, 3.9, H.maxZ + wallT + 5.45], [0, 0, 0]);
  const fascia = neonText('EAT  ·  DRINK  ·  PLAY  ·  WATCH', { color: '#ff3cac', height: 0.34, intensity: 2.2, backing: false, letterSpacing: 10 });
  fascia.position.set(0, 3.9, H.maxZ + wallT + 5.62);
  scene.add(fascia);
  for (const x of [-4.5, 0, 4.5]) {
    b.cyl(0.12, 0.12, 0.05, M.steelDark, [x, 3.68, H.maxZ + wallT + 2.8], [0, 0, 0], null, 12);
    b.cyl(0.09, 0.09, 0.02, glowMat(0xfff1d6, 3), [x, 3.66, H.maxZ + wallT + 2.8], [0, 0, 0], null, 12);
    const sp = new THREE.SpotLight(0xfff0d8, 45, 12, 0.7, 0.6, 2);
    sp.position.set(x, 3.66, H.maxZ + wallT + 2.8);
    sp.target.position.set(x, 0, H.maxZ + wallT + 2.9);
    sp.userData.tier = x === 0 ? 1 : 2;
    sp.userData.shadow = x === 0;
    scene.add(sp); scene.add(sp.target); lights.push(sp);
  }
  // canopy supports
  for (const x of [-7.2, 7.2]) b.cyl(0.08, 0.08, 3.9, M.steelDark, [x, 1.95, H.maxZ + wallT + 5.2], [0, 0, 0], null, 10);
  // planters, bollards, bench, trash can, mats
  for (const x of [-4.2, 4.2]) {
    b.box(1.2, 0.6, 0.8, M.concrete, [x, 0.3, H.maxZ + 1.2], [0, 0, 0], null, 1);
    b.sphere(0.55, new THREE.MeshStandardMaterial({ color: 0x1d3a17, roughness: 1 }), [x, 0.95, H.maxZ + 1.2], null, 10);
    b.sphere(0.4, new THREE.MeshStandardMaterial({ color: 0x27461d, roughness: 1 }), [x + 0.35, 0.85, H.maxZ + 1.0], null, 10);
    addCollider(x, H.maxZ + 1.2, 1.3, 0.9);
  }
  for (const x of [-3.5, -1.2, 1.2, 3.5]) {
    b.cyl(0.11, 0.13, 0.9, M.steelDark, [x, 0.45, H.maxZ + 5.7], [0, 0, 0], null, 12);
    b.plane(0.16, 0.05, glowMat(0xfff1d6, 2), [x, 0.75, H.maxZ + 5.83], [0, 0, 0]);
    addCollider(x, H.maxZ + 5.7, 0.3, 0.3);
  }
  b.box(1.8, 0.06, 0.45, M.wood, [-6.2, 0.48, H.maxZ + 3.2], [0, 0, 0]);
  b.box(1.8, 0.4, 0.06, M.wood, [-6.2, 0.75, H.maxZ + 3.0], [-0.2, 0, 0]);
  for (const dx of [-0.8, 0.8]) b.box(0.08, 0.45, 0.45, M.steelDark, [-6.2 + dx, 0.225, H.maxZ + 3.2], [0, 0, 0]);
  addCollider(-6.2, H.maxZ + 3.2, 1.9, 0.6);
  b.cyl(0.32, 0.28, 0.95, M.steelDark, [6.4, 0.475, H.maxZ + 3.2], [0, 0, 0], null, 14);
  b.cyl(0.34, 0.34, 0.08, M.blackMatte, [6.4, 0.99, H.maxZ + 3.2], [0, 0, 0], null, 14);
  addCollider(6.4, H.maxZ + 3.2, 0.7, 0.7);
  b.box(3.6, 0.02, 1.6, M.rubber, [0, 0.01, H.maxZ + 1.3], [0, 0, 0]);
  b.box(3.6, 0.02, 1.6, M.rubber, [0, 0.01, H.maxZ - 1.0], [0, 0, 0]);
  // hours sign and posters by the doors
  const hours = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.8), new THREE.MeshStandardMaterial({ map: labelTexture(['HOURS', 'SUN-THU 11A-12A', 'FRI-SAT 11A-2A', '', 'NO ONE UNDER 21', 'AFTER 10PM', 'WITHOUT A GUARDIAN'], { bg: '#f4f1ea', fg: '#111', w: 256, h: 340, font: '22px "Rubik", sans-serif' }), roughness: 0.8 }));
  hours.position.set(3.6, 1.6, H.maxZ + 0.02); scene.add(hours);
  const poster = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.35), new THREE.MeshStandardMaterial({ map: posterTexture(['HALF PRICE', 'GAMES', 'EVERY', 'WEDNESDAY'], 1), roughness: 0.8, emissive: 0xffffff, emissiveMap: posterTexture(['HALF PRICE', 'GAMES', 'EVERY', 'WEDNESDAY'], 1), emissiveIntensity: 0.25 }));
  poster.position.set(-4.6, 1.8, H.maxZ + 0.02); scene.add(poster);
  const poster2 = poster.clone(); poster2.material = new THREE.MeshStandardMaterial({ map: posterTexture(['FINALS', 'WATCH PARTY', 'BIG SCREENS', 'TONIGHT 8PM'], 3), emissive: 0xffffff, emissiveMap: posterTexture(['FINALS', 'WATCH PARTY', 'BIG SCREENS', 'TONIGHT 8PM'], 3), emissiveIntensity: 0.25, roughness: 0.8 });
  poster2.position.set(5.2, 1.8, H.maxZ + 0.02); scene.add(poster2);

  // ---------- shell: floors, walls, ceiling ----------
  const W = H.maxX - H.minX, Dp = H.maxZ - H.minZ, cx = (H.maxX + H.minX) / 2, cz = (H.maxZ + H.minZ) / 2;
  b.plane(W, Dp, M.carpet, [cx, 0, cz], [-Math.PI / 2, 0, 0], null, 3.6);
  b.plane(W + 1, Dp + 1, M.ceilingDark, [cx, ceilH, cz], [Math.PI / 2, 0, 0], null, 6);
  // lobby & bar tile
  b.plane(20, 8, M.tile, [0, 0.01, 4], [-Math.PI / 2, 0, 0], null, 2);
  b.plane(16, 18, M.tile, [20, 0.01, -1], [-Math.PI / 2, 0, 0], null, 2);
  // walls (interior faces)
  const wall = (x, y, z, w, h, d, mat = M.wall) => b.box(w, h, d, mat, [x, y, z], [0, 0, 0], null, 3);
  wall(H.minX - wallT / 2, ceilH / 2, cz, wallT, ceilH, Dp + wallT * 2);
  wall(H.maxX + wallT / 2, ceilH / 2, cz, wallT, ceilH, Dp + wallT * 2);
  wall(cx, ceilH / 2, H.minZ - wallT / 2, W + wallT * 2, ceilH, wallT);
  // front wall with glass storefront between x=-7.1..7.1 up to 3.4m
  wall(-17.55, ceilH / 2, H.maxZ + wallT / 2, 20.9, ceilH, wallT);
  wall(17.55, ceilH / 2, H.maxZ + wallT / 2, 20.9, ceilH, wallT);
  wall(0, 3.4 + (ceilH - 3.4) / 2, H.maxZ + wallT / 2, 14.2, ceilH - 3.4, wallT);
  addCollider(H.minX - 0.2, cz, 0.4, Dp + 2); addCollider(H.maxX + 0.2, cz, 0.4, Dp + 2);
  addCollider(cx, H.minZ - 0.2, W + 2, 0.4);
  addCollider(-17.55, H.maxZ + 0.2, 20.9, 0.4); addCollider(17.55, H.maxZ + 0.2, 20.9, 0.4);
  // storefront glazing & mullions
  const mull = (x, y, z, w, h, d) => b.box(w, h, d, M.steelDark, [x, y, z], [0, 0, 0]);
  for (const [x0, x1] of [[-7.1, -2.4], [2.4, 7.1]]) {
    const gw = x1 - x0;
    b.plane(gw, 3.4, M.glass, [(x0 + x1) / 2, 1.7, H.maxZ + wallT / 2], [0, 0, 0]);
    mull((x0 + x1) / 2, 1.7, H.maxZ + wallT / 2, 0.08, 3.4, 0.14);
    addCollider((x0 + x1) / 2, H.maxZ + 0.2, gw, 0.4);
  }
  mull(-7.1, 1.7, H.maxZ + wallT / 2, 0.12, 3.4, 0.2); mull(7.1, 1.7, H.maxZ + wallT / 2, 0.12, 3.4, 0.2);
  mull(-2.4, 1.7, H.maxZ + wallT / 2, 0.14, 3.4, 0.2); mull(2.4, 1.7, H.maxZ + wallT / 2, 0.14, 3.4, 0.2);
  mull(0, 3.42, H.maxZ + wallT / 2, 14.3, 0.16, 0.24);
  mull(0, 0.06, H.maxZ + wallT / 2, 14.3, 0.12, 0.24);
  mull(0, 2.75, H.maxZ + wallT / 2, 4.8, 0.1, 0.2);
  addCollider(-2.4, H.maxZ + 0.2, 0.2, 0.5); addCollider(2.4, H.maxZ + 0.2, 0.2, 0.5);
  // transom sign above the doors
  const welcome = neonText('WELCOME', { color: '#ffd23f', height: 0.4, intensity: 2, backing: false, letterSpacing: 10 });
  welcome.position.set(0, 3.1, H.maxZ + wallT / 2 + 0.15); scene.add(welcome);
  // automatic swinging glass doors
  const doors = [];
  for (const side of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(side * 2.33, 0, H.maxZ + wallT / 2);
    const doorW = 2.2;
    const frame = new THREE.Group();
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(doorW - 0.16, 2.55), M.glass);
    glass.position.set(-side * doorW / 2, 1.38, 0);
    frame.add(glass);
    const fm = M.steelDark;
    const rails = [[-side * doorW / 2, 0.05, doorW, 0.1, 0.06], [-side * doorW / 2, 2.7, doorW, 0.1, 0.06], [-side * 0.06, 1.38, 0.1, 2.75, 0.06], [-side * (doorW - 0.06), 1.38, 0.1, 2.75, 0.06], [-side * doorW / 2, 1.0, doorW, 0.06, 0.06]];
    for (const [x, y, w, h, d] of rails) { const r = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), fm); r.position.set(x, y, 0); frame.add(r); }
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.9, 8), M.chrome);
    handle.position.set(-side * (doorW - 0.25), 1.1, 0.08); frame.add(handle);
    const handle2 = handle.clone(); handle2.position.z = -0.08; frame.add(handle2);
    const pull = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.09), new THREE.MeshBasicMaterial({ map: labelTexture(['PULL'], { bg: '#111', fg: '#fff', w: 128, h: 52, font: 'bold 28px "Rubik", sans-serif' }), transparent: true }));
    pull.position.set(-side * (doorW - 0.5), 1.45, 0.035); frame.add(pull);
    pivot.add(frame);
    scene.add(pivot);
    doors.push({ pivot, side, angle: 0 });
  }
  updatables.push({ update(dt) {
    const dz = player.pos.z - H.maxZ, dx = player.pos.x;
    const near = Math.abs(dx) < 3.5 && dz > -2.5 && dz < 3.5;
    for (const d of doors) {
      const target = near ? -d.side * (player.pos.z > H.maxZ ? -1 : 1) * 1.45 : 0;
      d.angle += (target - d.angle) * Math.min(1, dt * 3);
      d.pivot.rotation.y = d.angle;
    }
  } });

  // ---------- ceiling rig: trusses, ducts, track lights ----------
  const trussY = ceilH - 0.35;
  for (const x of [-21, -7, 7, 21]) {
    b.box(0.32, 0.3, Dp, M.truss, [x, trussY, cz], [0, 0, 0]);
    b.box(0.32, 0.04, Dp, M.truss, [x, trussY - 0.17, cz], [0, 0, 0]);
  }
  for (let z = H.maxZ - 6; z > H.minZ; z -= 8) b.box(W, 0.3, 0.32, M.truss, [cx, trussY, z], [0, 0, 0]);
  for (const x of [-14, 14]) b.cyl(0.38, 0.38, Dp - 4, M.duct, [x, ceilH - 0.75, cz], [Math.PI / 2, 0, 0], null, 14);
  b.cyl(0.32, 0.32, W - 4, M.duct, [cx, ceilH - 0.75, -20], [0, 0, Math.PI / 2], null, 14);
  for (const x of [-14, 14]) for (let z = H.maxZ - 8; z > H.minZ; z -= 10) b.box(0.8, 0.3, 0.8, M.duct, [x, ceilH - 0.95, z], [0, 0, 0]);
  // sprinkler pipe
  for (const x of [-24, 0, 24]) b.cyl(0.04, 0.04, Dp - 2, M.redPlastic, [x, ceilH - 0.5, cz], [Math.PI / 2, 0, 0], null, 6);

  // track light fixtures along the aisles; a subset are real spotlights
  const fixture = (x, z, color = 0xfff0dc) => {
    b.cyl(0.09, 0.11, 0.26, M.blackPlastic, [x, ceilH - 0.55, z], [0, 0, 0], null, 12);
    b.cyl(0.02, 0.02, 0.3, M.blackPlastic, [x, ceilH - 0.15, z], [0, 0, 0], null, 6);
    b.cyl(0.07, 0.07, 0.02, glowMat(color, 2.5), [x, ceilH - 0.69, z], [0, 0, 0], null, 12);
  };
  const spot = (x, z, { color = 0xfff0dc, intensity = 55, dist = 16, angle = 0.62, tier = 2, shadow = false, y = ceilH - 0.7 } = {}) => {
    const sp = new THREE.SpotLight(color, intensity, dist, angle, 0.55, 2);
    sp.position.set(x, y, z);
    sp.target.position.set(x, 0, z);
    sp.userData.tier = tier; sp.userData.shadow = shadow;
    scene.add(sp); scene.add(sp.target); lights.push(sp);
    return sp;
  };
  // lobby
  fixture(-4, 4.5); fixture(4, 4.5); fixture(-4, 1); fixture(4, 1);
  spot(-3, 3.5, { tier: 1, shadow: true, intensity: 95, angle: 0.85 }); spot(3, 3.5, { tier: 2, intensity: 75, angle: 0.85 });
  // main aisle
  const aisleZ = [-6, -14, -22, -30, -38];
  aisleZ.forEach((z, i) => { fixture(-1.2, z); fixture(1.2, z); spot(0, z, { tier: i < 2 ? 1 : 2, shadow: i === 0, intensity: 80, angle: 0.8, dist: 20 }); });
  // side aisles: fixtures with light pools (real lights only tier 3)
  for (const x of [-16, 16]) for (const z of [-10, -26]) { fixture(x, z); spot(x, z, { tier: 3, intensity: 40, angle: 0.8 }); }
  // colored accent floods on the walls
  for (const x of [-27.6, 27.6]) for (let z = -38; z < 6; z += 8) {
    b.plane(0.12, 4.6, glowMat(x < 0 ? 0xff3cac : 0x26e5ff, 1.8), [x + (x < 0 ? 0.42 : -0.42), 2.6, z], [0, x < 0 ? Math.PI / 2 : -Math.PI / 2, 0]);
  }
  // neon accent point lights
  const accent = (x, y, z, color, intensity = 18, dist = 12, tier = 2) => { const p = new THREE.PointLight(color, intensity, dist, 2); p.position.set(x, y, z); p.userData.tier = tier; scene.add(p); lights.push(p); return p; };
  accent(0, 3.6, -0.5, 0xff8a3a, 22, 14, 1);
  accent(-9.5, 2.6, 5, 0xff3cac, 16, 10, 2);
  accent(0, 3.4, -40.5, 0xffb02e, 25, 16, 2);
  accent(-24, 2.5, -20, 0xff3cac, 14, 14, 3);
  accent(24, 2.5, -28, 0x26e5ff, 14, 14, 3);
  const hemi = new THREE.HemisphereLight(0x5a4a9a, 0x14101c, 0.8);
  hemi.userData.tier = 1; scene.add(hemi); lights.push(hemi);
  const amb = new THREE.AmbientLight(0x2a2438, 0.5); amb.userData.tier = 1; scene.add(amb); lights.push(amb);

  // ---------- lobby features ----------
  // feature walls flanking the lobby
  b.box(0.35, 3.4, 6.2, M.wallWarm, [-10, 1.7, 5], [0, 0, 0], null, 2); addCollider(-10, 5, 0.4, 6.2);
  b.box(0.35, 3.4, 4.2, M.wallWarm, [10, 1.7, 6], [0, 0, 0], null, 2); addCollider(10, 6, 0.4, 4.2);
  b.box(0.45, 0.12, 6.3, glowMat(0xff3cac, 1.6), [-10, 3.42, 5], [0, 0, 0]);
  b.box(0.45, 0.12, 4.3, glowMat(0x26e5ff, 1.6), [10, 3.42, 6], [0, 0, 0]);
  const slogan = neonText('EAT · DRINK · PLAY · WATCH', { color: '#ff3cac', height: 0.5, intensity: 2.4, letterSpacing: 8 });
  slogan.position.set(-9.8, 2.3, 5); slogan.rotation.y = Math.PI / 2; scene.add(slogan);
  const barArrow = neonText('SPORTS BAR  →', { color: '#26e5ff', height: 0.42, intensity: 2.2, letterSpacing: 8 });
  barArrow.position.set(9.8, 2.3, 6); barArrow.rotation.y = -Math.PI / 2; scene.add(barArrow);
  // midway arch at z = 0
  for (const x of [-8, 8]) {
    b.box(0.7, 4.6, 0.7, M.blackPlastic, [x, 2.3, 0], [0, 0, 0]); addCollider(x, 0, 0.8, 0.8);
    b.box(0.76, 0.06, 0.76, glowMat(0xffb02e, 2.2), [x, 0.5, 0], [0, 0, 0]);
    b.box(0.76, 0.06, 0.76, glowMat(0xffb02e, 2.2), [x, 3.9, 0], [0, 0, 0]);
    for (let y = 0.9; y < 3.8; y += 0.6) b.box(0.74, 0.04, 0.74, glowMat(0x26e5ff, 1.6), [x, y, 0], [0, 0, 0]);
  }
  b.box(16.7, 0.9, 0.7, M.blackPlastic, [0, 4.4, 0], [0, 0, 0]);
  const arch = neonText('MILLION DOLLAR MIDWAY', { color: '#ffb02e', height: 0.55, intensity: 2.4, backing: false, letterSpacing: 8 });
  arch.position.set(0, 4.4, 0.37); scene.add(arch);
  const archBack = arch.clone(); archBack.rotation.y = Math.PI; archBack.position.z = -0.37; scene.add(archBack);
  new BulbChaser(rectBulbs(16.3, 0.8, 0.22, 0.36).map(p => [p[0], p[1] + 4.4, p[2]]), { color: 0xffd28a, mode: 'chase', speed: 9, parent: scene, radius: 0.035 });
  new BulbChaser(rectBulbs(16.3, 0.8, 0.22, -0.36).map(p => [p[0], p[1] + 4.4, p[2]]), { color: 0xffd28a, mode: 'chase', speed: 9, parent: scene, radius: 0.035 });
  // columns deeper in the hall
  for (const x of [-16, 16]) for (const z of [-14, -28]) {
    b.box(0.55, ceilH, 0.55, M.blackPlastic, [x, ceilH / 2, z], [0, 0, 0]); addCollider(x, z, 0.6, 0.6);
    b.box(0.6, 0.05, 0.6, glowMat(x < 0 ? 0xff3cac : 0x26e5ff, 1.8), [x, 1.2, z], [0, 0, 0]);
    b.box(0.6, 0.05, 0.6, glowMat(x < 0 ? 0xff3cac : 0x26e5ff, 1.8), [x, 3.0, z], [0, 0, 0]);
  }
  // restrooms & exit signage
  const rr = boxSign(['RESTROOMS  →'], { w: 1.5, h: 0.4, bg: '#101018', fg: '#ffffff', font: '40px "Rubik", sans-serif' });
  rr.position.set(-27.7, 2.8, 3); rr.rotation.y = Math.PI / 2; scene.add(rr);
  const rrDoor = (z, label) => {
    b.box(0.08, 2.1, 0.95, M.blackPlastic, [-27.75, 1.05, z], [0, 0, 0]);
    b.cyl(0.015, 0.015, 0.3, M.chrome, [-27.68, 1.0, z + 0.35], [Math.PI / 2, 0, 0], null, 8);
    const l = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.28), new THREE.MeshStandardMaterial({ map: labelTexture([label], { bg: '#e8e8ea', fg: '#111', w: 128, h: 128, font: 'bold 34px "Rubik", sans-serif' }) }));
    l.position.set(-27.7, 1.6, z); l.rotation.y = Math.PI / 2; scene.add(l);
  };
  rrDoor(1.0, '♂'); rrDoor(-0.6, '♀');
  const exit = (x, y, z, rotY = 0) => { const s = boxSign(['EXIT'], { w: 0.5, h: 0.22, bg: '#ff2020', fg: '#ffffff', font: '48px "Rubik", sans-serif', intensity: 2 }); s.position.set(x, y, z); s.rotation.y = rotY; scene.add(s); };
  exit(0, 3.75, H.maxZ - 0.3); exit(-27.6, 3.2, -30, Math.PI / 2); exit(27.6, 3.2, -30, -Math.PI / 2);
  b.box(0.08, 2.1, 0.95, M.steelDark, [-27.75, 1.05, -30], [0, 0, 0]);
  b.box(0.08, 2.1, 0.95, M.steelDark, [27.75, 1.05, -30], [0, 0, 0]);
  // hanging directional signs
  scene.add(hangSign(boxSign(["WINNER'S CIRCLE ↓"], { w: 2.2, h: 0.5, bg: '#1a1030', fg: '#ffd23f', font: '44px "Bungee", Impact, sans-serif' }), 0, 3.9, -18, 0, ceilH));
  scene.add(hangSign(boxSign(['← SKEE-BALL · HOOPS'], { w: 2.4, h: 0.5, bg: '#101a30', fg: '#ffffff', font: '44px "Bungee", Impact, sans-serif' }), -3.5, 3.9, -9, 0, ceilH));
  scene.add(hangSign(boxSign(['RACING · VR →'], { w: 2.0, h: 0.5, bg: '#301010', fg: '#ffffff', font: '48px "Bungee", Impact, sans-serif' }), 3.5, 3.9, -9, 0, ceilH));

  // ---------- reflective lobby floor (high quality) ----------
  const spawn = { pos: new THREE.Vector3(0, 1.7, 16.4), yaw: 0, pitch: 0.1 };
  return { lights, spawn, doors };
}
