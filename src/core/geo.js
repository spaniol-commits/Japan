import * as THREE from 'three';

// Small placement helpers. All `y` arguments are the *bottom* of the shape,
// which makes stacking floors, roofs and props much easier to read.

export function box(parent, w, h, d, material, x = 0, y = 0, z = 0, ry = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y + h / 2, z);
  m.rotation.y = ry;
  parent.add(m);
  return m;
}

export function cyl(parent, rTop, rBottom, h, material, x = 0, y = 0, z = 0, seg = 8) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBottom, h, seg), material);
  m.position.set(x, y + h / 2, z);
  parent.add(m);
  return m;
}

export function ball(parent, r, material, x = 0, y = 0, z = 0, detail = 0) {
  const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, detail), material);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}

/** A group positioned/rotated in its parent; buildings are authored facing +z. */
export function group(parent, x = 0, y = 0, z = 0, ry = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = ry;
  parent.add(g);
  return g;
}

/** Thin beam between two points (used for railings, wires, branches). */
export function beam(parent, a, b, thickness, material, round = false) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const geo = round
    ? new THREE.CylinderGeometry(thickness, thickness, len, 6)
    : new THREE.BoxGeometry(thickness, len, thickness);
  const m = new THREE.Mesh(geo, material);
  m.position.copy(a).addScaledVector(dir, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  parent.add(m);
  return m;
}

/**
 * Triangular prism (gable end), length along x, `width` across z, apex `height` up.
 */
export function prism(parent, len, width, height, material, x = 0, y = 0, z = 0) {
  const shape = new THREE.Shape([new THREE.Vector2(-width / 2, 0), new THREE.Vector2(width / 2, 0), new THREE.Vector2(0, height)]);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: len, bevelEnabled: false });
  geo.translate(0, 0, -len / 2);
  geo.rotateY(Math.PI / 2);
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}

/** Deterministic PRNG so the city looks the same on every load. */
export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const pick = (rand, arr) => arr[Math.floor(rand() * arr.length)];
