import * as THREE from 'three';
import { C, mat } from '../core/materials.js';
import { box, cyl, group, beam, rng } from '../core/geo.js';
import { WORLD, RIVER, MAIN_STREET, POND, AVENUE, STREETS, BLOCK_X, BLOCK_Z, SIDEWALK_H } from './layout.js';
import { rock } from './props.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

/** Box spanning explicit min/max extents, with optional per-face materials. */
function slab(parent, x0, x1, y0, y1, z0, z1, material) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), material);
  m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  parent.add(m);
  return m;
}

export const waterMaterial = new THREE.MeshStandardMaterial({
  color: C.water,
  emissive: '#1aa6a6',
  emissiveIntensity: 0.35,
  roughness: 0.08,
  metalness: 0.1,
  transparent: true,
  opacity: 0.82,
});

export function buildTerrain(root) {
  const { x0, x1, z0, z1, depth } = WORLD;
  const soil = mat(C.soil);
  const soilDark = mat(C.soilDark);
  const embankment = mat('#8d8b84');

  // Deep base of the diorama (visible as the earthen cross-section).
  slab(root, x0, x1, -depth, RIVER.bed, z0, z1, soilDark);
  // Riverbed sand
  slab(root, RIVER.x0, RIVER.x1, RIVER.bed, RIVER.bed + 0.3, z0, z1, mat('#cdbb8c'));

  // West bank (old town): sandy-gravel ground, stone embankment facing the river.
  const oldTop = mat('#d4c19b');
  slab(root, x0, RIVER.x0, RIVER.bed, 0, z0, z1, [embankment, soil, oldTop, soil, soil, soil]);
  // East bank (modern): asphalt on top, concrete embankment.
  slab(root, RIVER.x1, x1, RIVER.bed, 0, z0, z1, [soil, mat('#9a9993'), mat(C.asphalt), soil, soil, soil]);

  // Water — a translucent block so the diorama edge shows a turquoise cross-section.
  const water = slab(root, RIVER.x0, RIVER.x1, RIVER.bed + 0.3, RIVER.surface, z0, z1, waterMaterial);
  water.userData.keepSeparate = true;

  buildOldGround(root);
  buildStreets(root);
  buildBridge(root);
}

function buildOldGround(root) {
  const path = mat(C.path);
  const paving = mat('#bfae90');
  // Main street with stepping-stone paving
  slab(root, WORLD.x0 + 1, RIVER.x0, 0, 0.06, MAIN_STREET.z0, MAIN_STREET.z1, path);
  for (let x = WORLD.x0 + 2; x < RIVER.x0; x += 1.6) {
    for (const z of [-1.4, 0, 1.4]) box(root, 1.3, 0.04, 1.2, paving, x + (z === 0 ? 0.8 : 0), 0.06, z);
  }
  // Shrine approach (sandō) heading north to the shrine hall
  slab(root, -38, -34, 0, 0.06, -27, MAIN_STREET.z0, path);
  // Gravel yard in front of the shrine and around the pagoda
  slab(root, -46, -26, 0, 0.04, -40, -27, mat('#e2d6bd'));
  // Grass patches
  const grass = mat(C.grass);
  slab(root, -58, -44, 0, 0.05, 5, 40, grass);
  slab(root, -26, -7, 0, 0.05, -40, -6, grass);
  slab(root, -58, -40, 0, 0.05, -26, -5, mat(C.grassDark));
  slab(root, -24, -7, 0, 0.05, 20, 40, grass);

  // Pond with a floating torii island (like Itsukushima)
  const pond = new THREE.Mesh(new THREE.CylinderGeometry(POND.r, POND.r, 0.12, 18), waterMaterial);
  pond.position.set(POND.x, 0.08, POND.z);
  pond.userData.keepSeparate = true;
  root.add(pond);
  const rand = rng(7);
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2;
    rock(root, POND.x + Math.cos(a) * (POND.r + 0.3), POND.z + Math.sin(a) * (POND.r + 0.3), 0.45 + rand() * 0.35, rand);
  }
  for (let i = 0; i < 5; i++) {
    const a = rand() * Math.PI * 2;
    const r = 2 + rand() * 3;
    const pad = cyl(root, 0.45, 0.45, 0.04, mat('#5f9a4a'), POND.x + Math.cos(a) * r, 0.14, POND.z + Math.sin(a) * r, 8);
    pad.scale.z = 0.8;
  }
}

function buildStreets(root) {
  const walk = mat(C.sidewalk);
  const curb = mat(C.curb);
  const white = mat('#eeeeea');
  const yellow = mat('#e8c547');

  // Raised sidewalk blocks with a curb rim
  for (const [bx0, bx1] of BLOCK_X) {
    for (const [bz0, bz1] of BLOCK_Z) {
      slab(root, bx0, bx1, 0, SIDEWALK_H, bz0, bz1, walk);
      slab(root, bx0, bx1, 0, SIDEWALK_H + 0.02, bz0, bz0 + 0.3, curb);
      slab(root, bx0, bx1, 0, SIDEWALK_H + 0.02, bz1 - 0.3, bz1, curb);
      slab(root, bx0, bx0 + 0.3, 0, SIDEWALK_H + 0.02, bz0, bz1, curb);
      slab(root, bx1 - 0.3, bx1, 0, SIDEWALK_H + 0.02, bz0, bz1, curb);
    }
  }

  // Avenue centre line and lane dashes
  slab(root, RIVER.x1 + 2, WORLD.x1, 0, 0.02, -0.12, 0.12, yellow);
  for (let x = RIVER.x1 + 3; x < WORLD.x1; x += 4) {
    if (STREETS.some((s) => x > s.x0 - 3 && x < s.x1 + 1)) continue;
    for (const z of [-2, 2]) slab(root, x, x + 2, 0, 0.02, z - 0.08, z + 0.08, white);
  }
  // Street dashes
  for (const s of STREETS) {
    const cx = (s.x0 + s.x1) / 2;
    for (let z = WORLD.z0 + 1; z < WORLD.z1; z += 4) {
      if (z > AVENUE.z0 - 3 && z < AVENUE.z1 + 1) continue;
      slab(root, cx - 0.08, cx + 0.08, 0, 0.02, z, z + 2, white);
    }
  }

  // Zebra crossings around each intersection
  for (const s of STREETS) {
    for (const zEdge of [AVENUE.z0 - 2.2, AVENUE.z1 + 0.4]) {
      for (let x = s.x0 + 0.4; x < s.x1 - 0.3; x += 0.9) slab(root, x, x + 0.5, 0, 0.025, zEdge, zEdge + 1.8, white);
    }
    for (const xEdge of [s.x0 - 2.2, s.x1 + 0.4]) {
      for (let z = AVENUE.z0 + 0.4; z < AVENUE.z1 - 0.3; z += 0.9) slab(root, xEdge, xEdge + 1.8, 0, 0.025, z, z + 0.5, white);
    }
  }

  // Riverside promenade on the east bank
  slab(root, RIVER.x1, RIVER.x1 + 2, 0, SIDEWALK_H, WORLD.z0, WORLD.z1, walk);
  for (let z = WORLD.z0 + 0.5; z < WORLD.z1; z += 2) {
    if (z > AVENUE.z0 - 1 && z < AVENUE.z1) continue;
    box(root, 0.08, 1.0, 0.08, mat('#6d7277'), RIVER.x1 + 0.25, SIDEWALK_H, z);
  }
  slab(root, RIVER.x1 + 0.2, RIVER.x1 + 0.3, SIDEWALK_H + 0.95, SIDEWALK_H + 1.05, WORLD.z0, AVENUE.z0 - 0.5, mat('#6d7277'));
  slab(root, RIVER.x1 + 0.2, RIVER.x1 + 0.3, SIDEWALK_H + 0.95, SIDEWALK_H + 1.05, AVENUE.z1 + 0.5, WORLD.z1, mat('#6d7277'));
}

/** Arched drum bridge (taiko-bashi) joining the old main street to the avenue. */
function buildBridge(root) {
  const g = group(root, 0, 0, 0);
  const deck = mat(C.woodLight);
  const red = mat(C.vermilion);
  const span = RIVER.x1 - RIVER.x0 + 4;
  const rise = 1.8;
  const N = 18;
  const arc = (t) => V(-span / 2 + span * t, rise * Math.sin(Math.PI * t) + 0.05, 0);
  for (let i = 0; i < N; i++) {
    const a = arc(i / N);
    const b = arc((i + 1) / N);
    const plank = new THREE.Mesh(new THREE.BoxGeometry(a.distanceTo(b) + 0.05, 0.2, 3.4), deck);
    plank.position.copy(a).add(b).multiplyScalar(0.5);
    plank.rotation.z = Math.atan2(b.y - a.y, b.x - a.x);
    g.add(plank);
  }
  for (const z of [-1.6, 1.6]) {
    for (let i = 0; i <= N; i += 2) {
      const p = arc(i / N);
      box(g, 0.16, 1.0, 0.16, red, p.x, p.y, z);
      if (i % 6 === 0) cyl(g, 0.12, 0.05, 0.25, mat('#c9a227'), p.x, p.y + 1.0, z, 6); // giboshi caps
    }
    for (let i = 0; i < N; i++) beam(g, arc(i / N).add(V(0, 0.95, z)), arc((i + 1) / N).add(V(0, 0.95, z)), 0.14, red);
  }
  // Pillars down into the river
  for (const x of [-3.5, 0, 3.5]) {
    for (const z of [-1.3, 1.3]) {
      const top = arc((x + span / 2) / span).y;
      cyl(g, 0.15, 0.15, top - RIVER.bed, red, x, RIVER.bed, z, 6);
    }
  }
}

