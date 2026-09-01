// Shared world registries: static geometry batching, collision boxes, interactables, per-frame updaters.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const colliders = [];       // { minX, maxX, minZ, maxZ }
export const interactables = [];   // meshes with userData.interact = { label, cost, use(ctx) }
export const updatables = [];      // { update(dt, t) }
export const floorGlows = [];      // fake light pools placed under machines

export function addCollider(cx, cz, w, d, rotY = 0) {
  // Axis-aligned bounds of a (possibly rotated) rectangle footprint.
  const c = Math.abs(Math.cos(rotY)), s = Math.abs(Math.sin(rotY));
  const hw = (w * c + d * s) / 2, hd = (w * s + d * c) / 2;
  const box = { minX: cx - hw, maxX: cx + hw, minZ: cz - hd, maxZ: cz + hd };
  colliders.push(box);
  return box;
}

export function addInteractable(mesh, interact) {
  mesh.userData.interact = interact;
  interactables.push(mesh);
  return mesh;
}

// Invisible interaction volume: a box the player raycasts against.
export function interactionVolume(cx, cy, cz, w, h, d, rotY, interact) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ visible: false }));
  mesh.position.set(cx, cy, cz);
  mesh.rotation.y = rotY;
  addInteractable(mesh, interact);
  return mesh;
}

export function onUpdate(fn) {
  updatables.push({ update: fn });
}

// Scales BoxGeometry UVs so a texture tiles every `tile` metres on each face.
export function boxUVMeters(geo, w, h, d, tile = 1) {
  const uv = geo.attributes.uv;
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) {
    const [su, sv] = dims[f];
    for (let i = 0; i < 4; i++) {
      const k = f * 4 + i;
      uv.setXY(k, uv.getX(k) * su / tile, uv.getY(k) * sv / tile);
    }
  }
  uv.needsUpdate = true;
  return geo;
}

export function planeUVMeters(geo, w, h, tile = 1) {
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / tile, uv.getY(i) * h / tile);
  uv.needsUpdate = true;
  return geo;
}

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _s = new THREE.Vector3(1, 1, 1);
const _p = new THREE.Vector3();

export function composeMatrix(pos, rot = [0, 0, 0], scale = [1, 1, 1]) {
  _p.set(pos[0], pos[1], pos[2]);
  _e.set(rot[0], rot[1], rot[2]);
  _q.setFromEuler(_e);
  _s.set(scale[0], scale[1], scale[2]);
  return new THREE.Matrix4().compose(_p, _q, _s);
}

// Collects static geometry and merges it per material into a handful of draw calls.
export class Batcher {
  constructor(scene) {
    this.scene = scene;
    this.groups = new Map(); // material -> geometries[]
    this.meshes = [];
  }
  add(geometry, material, matrix) {
    // Extrude/Shape geometries are non-indexed; normalise everything so the merge succeeds.
    const g = geometry.index ? geometry.toNonIndexed() : geometry.clone();
    if (matrix) g.applyMatrix4(matrix);
    if (!this.groups.has(material)) this.groups.set(material, []);
    this.groups.get(material).push(g);
    return g;
  }
  // parent: optional Object3D whose world matrix is pre-multiplied (cabinet groups).
  box(w, h, d, material, pos, rot, parent, tile) {
    const geo = new THREE.BoxGeometry(w, h, d);
    if (tile) boxUVMeters(geo, w, h, d, tile);
    return this.add(geo, material, this._mat(pos, rot, parent));
  }
  cyl(rTop, rBottom, h, material, pos, rot, parent, seg = 16) {
    const geo = new THREE.CylinderGeometry(rTop, rBottom, h, seg);
    return this.add(geo, material, this._mat(pos, rot, parent));
  }
  sphere(r, material, pos, parent, seg = 12) {
    const geo = new THREE.SphereGeometry(r, seg, seg);
    return this.add(geo, material, this._mat(pos, [0, 0, 0], parent));
  }
  plane(w, h, material, pos, rot, parent, tile) {
    const geo = new THREE.PlaneGeometry(w, h);
    if (tile) planeUVMeters(geo, w, h, tile);
    return this.add(geo, material, this._mat(pos, rot, parent));
  }
  torus(r, tube, material, pos, rot, parent, seg = 10, tseg = 24) {
    const geo = new THREE.TorusGeometry(r, tube, seg, tseg);
    return this.add(geo, material, this._mat(pos, rot, parent));
  }
  geo(geometry, material, pos, rot, parent, scale) {
    return this.add(geometry, material, this._mat(pos, rot, parent, scale));
  }
  _mat(pos, rot = [0, 0, 0], parent, scale) {
    const m = composeMatrix(pos, rot, scale);
    if (parent) {
      parent.updateMatrixWorld(true);
      m.premultiply(parent.matrixWorld);
    }
    return m;
  }
  finalize() {
    for (const [material, geos] of this.groups) {
      if (!geos.length) continue;
      const merged = mergeGeometries(geos, false);
      geos.forEach(g => g.dispose());
      if (!merged) continue;
      const mesh = new THREE.Mesh(merged, material);
      mesh.castShadow = !material.userData.noShadow;
      mesh.receiveShadow = !material.userData.noReceive;
      mesh.frustumCulled = false;
      mesh.matrixAutoUpdate = false;
      this.scene.add(mesh);
      this.meshes.push(mesh);
    }
    this.groups.clear();
    return this.meshes;
  }
}

// Player state shared with door animations and station logic.
export const player = { pos: new THREE.Vector3(0, 1.7, 15), yaw: Math.PI, pitch: 0 };
