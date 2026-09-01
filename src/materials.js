// Shared PBR materials. Built once from the procedural textures.
import * as THREE from 'three';
import * as T from './textures.js';

export const M = {};

function std(opts) { return new THREE.MeshStandardMaterial(opts); }
function phys(opts) { return new THREE.MeshPhysicalMaterial(opts); }

export function initMaterials() {
  const carpet = T.carpetTexture();
  const tile = T.tileTexture();
  const concrete = T.concreteTexture(118);
  const sidewalk = T.sidewalkTexture();
  const asphalt = T.asphaltTexture();
  const wall = T.paintedWallTexture([30, 26, 40]);
  const wallWarm = T.paintedWallTexture([46, 30, 30]);
  const stucco = T.paintedWallTexture([118, 108, 112]);
  const brick = T.brickTexture();
  const brushed = T.brushedMetalTexture(150);
  const brushedDark = T.brushedMetalTexture(60);
  const wood = T.woodTexture([110, 70, 40]);
  const maple = T.woodTexture([196, 150, 96]);
  const ceiling = T.ceilingTexture();
  const rough = T.noiseRoughness(150, 60, 5);
  const roughGloss = T.noiseRoughness(90, 40, 6);

  M.carpet = std({ map: carpet.map, roughnessMap: carpet.rough, roughness: 1, metalness: 0, color: 0xffffff });
  M.tile = std({ map: tile.map, roughnessMap: tile.rough, roughness: 0.42, metalness: 0.08, envMapIntensity: 1.2 });
  M.concrete = std({ map: concrete.map, roughnessMap: concrete.rough, roughness: 0.9 });
  M.sidewalk = std({ map: sidewalk.map, roughness: 0.95 });
  M.asphalt = std({ map: asphalt.map, roughness: 0.98 });
  M.wall = std({ map: wall.map, roughness: 0.92 });
  M.wallWarm = std({ map: wallWarm.map, roughness: 0.92 });
  M.stucco = std({ map: stucco.map, roughness: 0.95 });
  M.brick = std({ map: brick.map, roughness: 0.95 });
  M.ceiling = std({ map: ceiling.map, roughness: 1, color: 0x9a9aa8 });
  M.ceilingDark = std({ color: 0x0b0b10, roughness: 1 });
  M.truss = std({ color: 0x1a1a1f, roughness: 0.7, metalness: 0.6 });
  M.duct = std({ color: 0x4c4c55, roughness: 0.55, metalness: 0.7, map: brushedDark.map });
  M.steel = std({ map: brushed.map, roughnessMap: brushed.rough, roughness: 0.4, metalness: 0.9, color: 0xcfd2d8 });
  M.steelDark = std({ map: brushedDark.map, roughness: 0.45, metalness: 0.85, color: 0x9a9ca4 });
  M.chrome = std({ color: 0xffffff, roughness: 0.12, metalness: 1, envMapIntensity: 1.4 });
  M.blackPlastic = std({ color: 0x0f0f13, roughness: 0.5, roughnessMap: roughGloss, metalness: 0.05 });
  M.blackMatte = std({ color: 0x0c0c10, roughness: 0.95 });
  M.cabinet = std({ color: 0x141418, roughness: 0.35, roughnessMap: roughGloss, metalness: 0.1, envMapIntensity: 1.1 });
  M.cabinetBlue = std({ color: 0x0c1a4a, roughness: 0.35, roughnessMap: roughGloss, metalness: 0.1 });
  M.cabinetRed = std({ color: 0x5a0a12, roughness: 0.35, roughnessMap: roughGloss, metalness: 0.1 });
  M.cabinetWhite = std({ color: 0xe8e8ea, roughness: 0.4, roughnessMap: roughGloss });
  M.cabinetYellow = std({ color: 0xf2b21b, roughness: 0.4, roughnessMap: roughGloss });
  M.cabinetPurple = std({ color: 0x2a0d4a, roughness: 0.35, roughnessMap: roughGloss });
  M.cabinetGreen = std({ color: 0x0b3d2a, roughness: 0.35, roughnessMap: roughGloss });
  M.wood = std({ map: wood.map, roughness: 0.5, roughnessMap: rough });
  M.maple = std({ map: maple.map, roughness: 0.35, roughnessMap: roughGloss });
  M.rubber = std({ color: 0x0a0a0a, roughness: 0.98 });
  M.fabric = std({ color: 0x3a1b6b, roughness: 1 });
  M.leather = std({ color: 0x2a0d12, roughness: 0.6 });
  M.redPlastic = std({ color: 0xd8202a, roughness: 0.3, metalness: 0.05 });
  M.bluePlastic = std({ color: 0x1946d8, roughness: 0.3, metalness: 0.05 });
  M.yellowPlastic = std({ color: 0xffc31c, roughness: 0.3, metalness: 0.05 });
  M.greenPlastic = std({ color: 0x1fc24a, roughness: 0.3, metalness: 0.05 });
  M.whitePlastic = std({ color: 0xf0f0f0, roughness: 0.35 });
  M.orangePlastic = std({ color: 0xff7a1c, roughness: 0.3 });
  M.pinkPlastic = std({ color: 0xff4fb0, roughness: 0.3 });
  M.basketball = std({ map: T.basketballTexture(), roughness: 0.8 });
  M.skeeBall = std({ color: 0xb8865a, roughness: 0.4, map: maple.map });
  M.glass = phys({ color: 0xd8ecff, transparent: true, opacity: 0.22, roughness: 0.04, metalness: 0, envMapIntensity: 1.6, side: THREE.DoubleSide, depthWrite: false });
  M.glass.userData.noShadow = true;
  M.screenGlass = phys({ color: 0xffffff, transparent: true, opacity: 0.12, roughness: 0.03, metalness: 0, envMapIntensity: 2.0, depthWrite: false });
  M.screenGlass.userData.noShadow = true;
  M.tintedGlass = phys({ color: 0x223344, transparent: true, opacity: 0.55, roughness: 0.05, metalness: 0.2, envMapIntensity: 1.5, side: THREE.DoubleSide, depthWrite: false });
  M.tintedGlass.userData.noShadow = true;
  M.wire = std({ map: T.wireMeshTexture(), transparent: true, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.6, metalness: 0.7, color: 0x9a9aa0 });
  M.wire.userData.noShadow = true;
  M.airHockey = std({ map: T.airHockeyTexture(), roughness: 0.25, metalness: 0 });
  M.skeeTarget = std({ map: T.skeeTargetTexture(), roughness: 0.6 });
  M.paperWhite = std({ color: 0xf5f2ea, roughness: 0.9 });
  M.plushColors = [0xff5aa5, 0x4fd2ff, 0xffd23f, 0x7dff6a, 0xffffff, 0xb46bff, 0xff8c42].map(c => std({ color: c, roughness: 1 }));
  M.bottleGlass = phys({ color: 0x5a8a3a, transparent: true, opacity: 0.6, roughness: 0.1, envMapIntensity: 1.5 });
  M.bottleGlass.userData.noShadow = true;
  M.bottleAmber = phys({ color: 0xc77a1c, transparent: true, opacity: 0.7, roughness: 0.1, envMapIntensity: 1.5 });
  M.bottleAmber.userData.noShadow = true;
  M.bottleClear = phys({ color: 0xdcecf5, transparent: true, opacity: 0.5, roughness: 0.05, envMapIntensity: 1.8 });
  M.bottleClear.userData.noShadow = true;
  M.led = {}; // lazily created emissive colours
  return M;
}

// Emissive-only material for signs, LED strips, screen bezels and light fixtures.
export function emissive(color, intensity = 1.5, opts = {}) {
  const key = `${color}-${intensity}-${JSON.stringify(opts)}`;
  if (!M.led[key]) {
    M.led[key] = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: new THREE.Color(color), emissiveIntensity: intensity, roughness: 0.4, ...opts });
    M.led[key].userData.noShadow = true;
  }
  return M.led[key];
}

// Unlit, tone-mapping-bypassing material so it stays bright enough to bloom.
export function glowMat(color, intensity = 1, opts = {}) {
  const key = `glow-${color}-${intensity}-${JSON.stringify(opts)}`;
  if (!M.led[key]) {
    const c = new THREE.Color(color).multiplyScalar(intensity);
    M.led[key] = new THREE.MeshBasicMaterial({ color: c, toneMapped: false, ...opts });
    M.led[key].userData.noShadow = true;
  }
  return M.led[key];
}
