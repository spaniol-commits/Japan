import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { C, mat, glowMat } from '../core/materials.js';
import { box, cyl, ball, group, beam, prism, rng, pick } from '../core/geo.js';
import { roof } from '../core/roof.js';
import { sign, FONT_SERIF } from '../core/signs.js';
import { bakeStatic } from '../scene.js';
import {
  WORLD,
  RIVER,
  COAST,
  SIDEWALK_H,
  STREETS,
  SHINKANSEN,
  GRAND_STATION,
  HARBOUR,
  AIRPORT,
  ARCADE,
  FUKUYA,
  ONSEN,
  COUNTRY,
  FUJI_LAKE,
  CHUREITO,
  PARKS,
} from './layout.js';
import { waterMaterial } from './terrain.js';
import { machiya, pagoda, ryokan } from './oldtown.js';
import { farmhouse, cedar } from './outskirts.js';
import * as P from './props.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const Y = SIDEWALK_H;

/**
 * The outer ring of the city: Shinkansen line and grand station, harbour,
 * airport, shopping arcade with a clothing store, onsen valley, countryside,
 * central park and the lake below Fuji with the Chūreitō pagoda.
 *
 * Static parts go into `root` (baked later); moving parts go into `live` and
 * are animated by the returned update(dt, t).
 */
export function buildExpansion(root, live) {
  const rand = rng(777);
  const updates = [];
  shinkansenLine(root);
  grandStation(root, rand);
  updates.push(harbour(root, live, rand));
  updates.push(airport(root, live, rand));
  arcade(root, rand);
  fukuya(root, FUKUYA.x, FUKUYA.z);
  updates.push(onsen(root, live, rand));
  countryside(root, rand);
  updates.push(centralPark(root, PARKS[0], live, rand));
  updates.push(shinkansenRun(live));
  fujiLake(root, rand);
  return (dt, t) => updates.forEach((u) => u && u(dt, t));
}

function slab(parent, x0, x1, y0, y1, z0, z1, material) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), material);
  m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  parent.add(m);
  return m;
}

function water(parent, x, z, rx, rz, y = 0.08) {
  const w = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.12, 32), waterMaterial);
  w.scale.set(rx, 1, rz);
  w.position.set(x, y, z);
  w.userData.keepSeparate = true;
  parent.add(w);
  return w;
}

/** Merge a freshly built group into a few meshes (for things that move as one). */
function compact(g) {
  bakeStatic(g);
  return g;
}

// ---------------------------------------------------------------------------
// Shinkansen: an elevated line straight across the map, and a grand red-brick
// terminal in the style of Tokyo Station.

function shinkansenLine(root) {
  const { z, deck, x0, x1 } = SHINKANSEN;
  const concrete = mat('#cfcbc3');
  const len = x1 - x0;
  const cx = (x0 + x1) / 2;
  box(root, len, 1.0, 9, concrete, cx, deck - 1.0, z);
  box(root, len, 1.0, 0.3, concrete, cx, deck, z - 4.35);
  box(root, len, 1.0, 0.3, concrete, cx, deck, z + 4.35);
  for (let x = x0 + 4; x < x1; x += 14) {
    if (x > RIVER.x0 - 2 && x < RIVER.x1 + 2) continue;
    box(root, 2.2, deck - 1, 2.6, concrete, x, 0, z);
  }
  const steel = mat('#8a8d91', { metalness: 0.6, roughness: 0.4 });
  for (const tz of [z - 2, z + 2]) {
    box(root, len, 0.12, 2.6, mat('#9b948a'), cx, deck, tz);
    for (const dz of [-0.75, 0.75]) box(root, len, 0.14, 0.1, steel, cx, deck + 0.12, tz + dz);
  }
  // Catenary masts
  for (let x = x0 + 10; x < x1; x += 28) {
    box(root, 0.25, 5, 0.25, mat('#9aa0a6'), x, deck, z - 4.1);
    box(root, 0.18, 0.18, 8.4, mat('#9aa0a6'), x, deck + 4.8, z);
  }
}

function grandStation(root, rand) {
  const { x, z } = GRAND_STATION;
  const g = group(root, x, 0, z);
  const brick = mat('#b5553c');
  const stone = mat('#efe9dc');
  const W = 70,
    D = 13,
    H = 10;
  box(g, W, H, D, brick, 0, 0, 0);
  // White stone bands and window rows
  for (const y of [3.2, 6.6, H - 0.5]) box(g, W + 0.1, 0.4, D + 0.1, stone, 0, y, 0);
  for (let i = 0; i < 28; i++) {
    const wx = -W / 2 + 2 + i * 2.45;
    if (Math.abs(wx) < 6) continue;
    for (const wy of [4.2, 7.4]) box(g, 1.0, 1.6, 0.1, mat('#33404d'), wx, wy, D / 2 + 0.02);
  }
  // Central and wing domes
  for (const [dx, s] of [
    [0, 1.25],
    [-W / 2 + 5, 1],
    [W / 2 - 5, 1],
  ]) {
    box(g, 10 * s, 3, 10 * s, brick, dx, H, 0);
    box(g, 10.4 * s, 0.5, 10.4 * s, stone, dx, H + 3, 0);
    const drum = cyl(g, 4.2 * s, 4.6 * s, 2.4, stone, dx, H + 3.5, 0, 8);
    drum.rotation.y = Math.PI / 8;
    const dome = new THREE.Mesh(new THREE.SphereGeometry(4.4 * s, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat('#5d6a74'));
    dome.position.set(dx, H + 5.9, 0);
    g.add(dome);
    cyl(g, 0.15, 0.3, 2.2, mat('#c9a227', { metalness: 0.6 }), dx, H + 5.9 + 4.4 * s, 0, 6);
  }
  // Entrance canopy and signs
  box(g, 14, 0.5, 4, mat('#6c7076'), 0, 4.4, D / 2 + 2);
  box(g, 11, 4.2, 0.1, glowMat('#a9c3d3', '#e8c98a', 0.9, 0.05), 0, 0, D / 2 + 0.03);
  sign(g, '東京駅', 6, 1.5, { bg: '#ffffff', fg: '#1e5aa8', lit: 1.2, weight: 900 }, 0, H + 0.2, D / 2 + 5.2);
  sign(g, '新幹線 SHINKANSEN', 10, 1.0, { bg: '#1e5aa8', fg: '#ffffff', lit: 1.4, weight: 900 }, 0, 5.2, D / 2 + 4.05);
  // Link up to the platforms on the viaduct
  box(g, 8, SHINKANSEN.deck - H + 6, 6, brick, 24, H - 6, -D / 2 - 3);
  // Platforms and canopies on the viaduct
  const pz = SHINKANSEN.z;
  const px = x;
  for (const side of [-1, 1]) box(root, 60, 1.0, 2.4, mat('#cfc9bb'), px, SHINKANSEN.deck - 0.2, pz + side * 5.6);
  box(root, 62, 0.25, 14, mat('#6c7076'), px, SHINKANSEN.deck + 4.5, pz);
  for (let i = 0; i < 7; i++) for (const side of [-1, 1]) box(root, 0.2, 3.9, 0.2, mat('#6c7076'), px - 27 + i * 9, SHINKANSEN.deck + 0.7, pz + side * 6.4);
  // Plaza with taxis and trees
  const plaza = slab(root, x - 36, x + 36, 0, 0.05, z + D / 2 + 0.5, z + 22, mat('#d9d2c3'));
  plaza.receiveShadow = true;
  for (let i = 0; i < 6; i++) P.tree(root, x - 30 + i * 12, z + 19, 1.2, rand);
  P.bench(root, x - 12, z + 14, 0);
  P.bench(root, x + 12, z + 14, 0);
  cyl(root, 0.1, 0.1, 4, mat('#555'), x, 0, z + 16, 6);
  const clock = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.2, 20), glowMat('#fff', '#fff', 1, 0));
  clock.rotation.x = Math.PI / 2;
  clock.position.set(x, 4.3, z + 16);
  root.add(clock);
}

/** Bullet train cars for the animation in life: a long-nosed white train with a blue stripe. */
export function buildShinkansenTrain(live, cars = 8) {
  const train = new THREE.Group();
  const L = 9.6;
  const white = mat('#f3f5f7', { flatShading: false, roughness: 0.3 });
  const blue = mat('#2c5fb3', { flatShading: false });
  const win = glowMat('#34465a', '#ffe9b8', 1.1, 0);
  for (let i = 0; i < cars; i++) {
    const c = new THREE.Group();
    c.add(new THREE.Mesh(new RoundedBoxGeometry(L, 2.6, 2.8, 2, 0.5), white));
    c.children[0].position.y = 1.7;
    box(c, L - 0.4, 0.22, 2.84, blue, 0, 1.15, 0);
    box(c, L - 1.4, 0.55, 2.86, win, 0, 2.1, 0);
    for (const end of [-1, 1]) {
      if ((i === 0 && end === -1) || (i === cars - 1 && end === 1)) {
        // aerodynamic nose
        const nose = new THREE.Mesh(new THREE.SphereGeometry(1.4, 16, 10), white);
        nose.scale.set(4.2, 0.95, 1);
        nose.position.set(end * (L / 2), 1.45, 0);
        c.add(nose);
        const shield = new THREE.Mesh(new THREE.SphereGeometry(1.0, 12, 8), mat('#2b3946', { flatShading: false, roughness: 0.15 }));
        shield.scale.set(2.2, 0.5, 0.95);
        shield.position.set(end * (L / 2 + 1.8), 2.2, 0);
        c.add(shield);
        box(c, 0.2, 0.15, 0.6, glowMat('#fff', '#fff6d0', 2.5, 0.4), end * (L / 2 + 5.4), 1.2, 0);
      }
    }
    compact(c); // merge while still at the origin, then place
    c.position.x = i * (L + 0.4);
    train.add(c);
  }
  live.add(train);
  return { train, length: cars * (L + 0.4) + 8 };
}

// ---------------------------------------------------------------------------
// Harbour: quay, red-brick warehouses, ferris wheel, container yard with
// gantry cranes, ferry terminal and pier, breakwater and lighthouse.

function harbour(root, live, rand) {
  const { x0, x1, z0 } = HARBOUR;
  // Promenade along the quay with bollards
  slab(root, x0, x1, 0, 0.08, COAST - 4, COAST, mat('#cfc6b6'));
  for (let x = x0 + 2; x < x1; x += 6) cyl(root, 0.25, 0.3, 0.7, mat('#4a4d52'), x, 0, COAST - 0.6, 8);
  for (let x = x0 + 5; x < 70; x += 10) P.streetLamp(root, x, COAST - 3.2, Math.PI);

  // Red-brick warehouses (aka renga soko)
  for (const wx of [24, 52]) {
    const g = group(root, wx, 0, 151);
    box(g, 22, 8, 10, mat('#b5553c'), 0, 0, 0);
    for (const y of [3.6, 7.4]) box(g, 22.1, 0.35, 10.1, mat('#efe9dc'), 0, y, 0);
    for (let i = 0; i < 9; i++) for (const wy of [1.2, 4.5]) box(g, 1.0, 1.8, 0.1, mat('#33404d'), -10 + i * 2.5, wy, 5.02);
    roof(g, { w: 23, d: 11, h: 2.2, gable: true, curve: 0, thickness: 0.25, segs: 2 }, mat(C.roofSlate), 0, 8, 0);
    prism(g, 22, 10, 2.1, mat('#b5553c'), 0, 8, 0);
    box(g, 4, 3.2, 0.1, mat('#5a3420'), 0, 0, 5.03);
  }

  // Ferris wheel (animated)
  const fw = { x: 84, z: 152, r: 15, h: 19 };
  const base = group(root, fw.x, 0, fw.z);
  for (const sz of [-1.6, 1.6]) {
    beam(base, V(-7, 0, sz), V(0, fw.h, sz * 0.7), 0.5, mat('#e8ecef'));
    beam(base, V(7, 0, sz), V(0, fw.h, sz * 0.7), 0.5, mat('#e8ecef'));
  }
  box(base, 6, 3, 4, mat('#cfd8df'), 0, 0, 3.2);
  const wheel = new THREE.Group();
  const rim = mat('#f2f4f6');
  for (const sz of [-0.9, 0.9]) {
    const t = new THREE.Mesh(new THREE.TorusGeometry(fw.r, 0.25, 6, 48), rim);
    t.position.z = sz;
    wheel.add(t);
  }
  const N = 18;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    beam(wheel, V(0, 0, 0), V(Math.cos(a) * fw.r, Math.sin(a) * fw.r, 0), 0.15, rim);
    const cab = new THREE.Mesh(new RoundedBoxGeometry(1.6, 1.8, 1.6, 2, 0.4), glowMat(pick(rand, ['#f4a7c0', '#a7c7f4', '#f4e2a7', '#b7f4a7']), '#ffe9c0', 1.0, 0.05));
    cab.position.set(Math.cos(a) * fw.r, Math.sin(a) * fw.r - 1.2, 0);
    wheel.add(cab);
  }
  cyl(wheel, 1.2, 1.2, 2.4, mat('#cfd8df'), 0, -1.2, 0, 12).rotation.x = Math.PI / 2;
  compact(wheel);
  wheel.position.set(fw.x, fw.h, fw.z);
  live.add(wheel);

  // Container yard
  const tones = ['#c45b4b', '#4b7cc4', '#5aa36b', '#d1a03a', '#8a6fc4', '#c4c4c4', '#3a8f9c'];
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 4; j++) {
      const stack = 1 + Math.floor(rand() * 3);
      for (let k = 0; k < stack; k++) box(root, 6, 2.6, 2.4, mat(pick(rand, tones)), 112 + i * 7, k * 2.6, 146 + j * 3.2);
    }
  }
  // Gantry cranes reaching out over the water
  for (const cx of [124, 146]) {
    const g = group(root, cx, 0, COAST - 2);
    const crane = mat('#d9534f');
    for (const sx of [-4, 4]) for (const sz of [-3, 3]) box(g, 0.8, 22, 0.8, crane, sx, 0, sz);
    box(g, 9, 1.2, 1.2, crane, 0, 18, -3);
    box(g, 9, 1.2, 1.2, crane, 0, 18, 3);
    box(g, 2.4, 1.6, 34, crane, 0, 22, 8);
    box(g, 3, 2.2, 3, mat('#e8ecef'), 0, 19.8, 10);
    beam(g, V(0, 23.6, -6), V(0, 30, 0), 0.4, crane);
    beam(g, V(0, 30, 0), V(0, 23.6, 22), 0.25, mat('#555'));
  }
  // Container ship at the quay
  ship(root, 132, COAST + 9, 0, rand);

  // Ferry terminal and pier
  const ft = group(root, 38, 0, COAST - 9);
  box(ft, 16, 6, 8, mat('#e9eef2'), 0, 0, 0);
  box(ft, 15, 3.6, 0.1, glowMat('#a9c3d3', '#e8c98a', 0.9, 0.05), 0, 0.4, 4.02);
  const wave = new THREE.Mesh(new THREE.CylinderGeometry(9, 9, 18, 24, 1, true, Math.PI / 2 - 0.6, 1.2), mat('#cfd8df', { side: THREE.DoubleSide }));
  wave.rotation.z = Math.PI / 2;
  wave.position.set(0, -2.2, 0);
  ft.add(wave);
  sign(ft, 'フェリー乗り場', 7, 1.0, { bg: '#2b4c7e', fg: '#ffffff', lit: 1.2, weight: 900 }, 0, 4.6, 4.1);
  slab(root, 36, 40, 0, 0.3, COAST, COAST + 26, mat('#bdb8ae'));
  for (let k = 0; k < 6; k++) cyl(root, 0.3, 0.3, 2.4, mat('#8a857c'), k % 2 ? 36.3 : 39.7, RIVER.bed, COAST + 3 + k * 4, 6);

  // Breakwater and lighthouses
  slab(root, 96, 158, RIVER.bed, 0.6, 204, 207, mat('#9a968d'));
  for (let x = 98; x < 158; x += 3) P.rock(root, x, 203 + rand(), 0.9, rand);
  lighthouse(root, 98, 205.5, '#d9534f');
  lighthouse(root, 22, 196, '#f2f2f2');
  slab(root, 8, 24, RIVER.bed, 0.6, 194, 197, mat('#9a968d'));

  // Little fishing boats moored near the river mouth
  for (let i = 0; i < 4; i++) boat(root, 12 + i * 4.5, COAST + 4, Math.PI / 2, rand);

  // Ferry crossing the bay (animated)
  const ferry = ship(live, 0, 0, 0, rand, true);
  const path = new THREE.CatmullRomCurve3([V(38, 0, COAST + 32), V(-40, 0, 196), V(-180, 0, 192), V(-260, 0, 188), V(-180, 0, 200), V(-40, 0, 205), V(38, 0, COAST + 32)], true);
  let s = 0;
  return (dt) => {
    wheel.rotation.z += dt * 0.08;
    s = (s + dt * 0.006) % 1;
    const p = path.getPointAt(s);
    const ahead = path.getPointAt((s + 0.002) % 1);
    ferry.position.set(p.x, RIVER.surface - 1.0, p.z);
    ferry.rotation.y = Math.atan2(ahead.x - p.x, ahead.z - p.z) - Math.PI / 2;
  };
}

function lighthouse(root, x, z, color) {
  const g = group(root, x, 0.6, z);
  cyl(g, 1.0, 1.4, 9, mat(color), 0, 0, 0, 12);
  cyl(g, 1.4, 1.4, 0.3, mat('#555'), 0, 9, 0, 12);
  cyl(g, 0.8, 0.8, 1.4, glowMat('#fff6d0', '#fff3c4', 3, 0.3), 0, 9.3, 0, 12);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(1.1, 1.2, 12), mat('#555'));
  cap.position.y = 11.3;
  g.add(cap);
}

function boat(parent, x, z, ry, rand) {
  const g = group(parent, x, RIVER.surface + 0.05, z, ry);
  box(g, 1.6, 0.7, 5, mat(pick(rand, ['#f2f2f2', '#4b7cc4', '#d9534f'])), 0, 0, 0);
  box(g, 1.2, 1.1, 1.4, mat('#e8ecef'), 0, 0.7, -0.8);
  cyl(g, 0.05, 0.05, 2.6, mat('#555'), 0, 0.7, 1, 5);
  return g;
}

/** Ship: container vessel (static) or ferry (moving, merged). */
function ship(parent, x, z, ry, rand, ferry = false) {
  const g = new THREE.Group();
  const L = ferry ? 26 : 44;
  const W = ferry ? 7 : 9;
  box(g, L, 3.2, W, mat(ferry ? '#f3f5f7' : '#2f4a6b'), 0, -1, 0);
  box(g, L, 0.6, W + 0.05, mat(ferry ? '#2c5fb3' : '#d9534f'), 0, -1.2, 0);
  const bow = box(g, W * 0.71, 3.2, W * 0.71, mat(ferry ? '#f3f5f7' : '#2f4a6b'), L / 2, -1, 0);
  bow.rotation.y = Math.PI / 4;
  if (ferry) {
    box(g, L * 0.7, 2.4, W - 1, mat('#f3f5f7'), -1, 2.2, 0);
    box(g, L * 0.7 + 0.1, 0.6, W - 0.9, glowMat('#34465a', '#ffe9b8', 1.0, 0), -1, 3.2, 0);
    box(g, L * 0.45, 2, W - 2, mat('#f3f5f7'), -3, 4.6, 0);
    cyl(g, 0.9, 1.1, 2.6, mat('#2c5fb3'), -8, 6.6, 0, 10);
  } else {
    const tones = ['#c45b4b', '#4b7cc4', '#5aa36b', '#d1a03a', '#c4c4c4'];
    for (let i = 0; i < 5; i++) for (let k = 0; k < 2; k++) for (const sz of [-2.4, 0, 2.4]) box(g, 6, 2.4, 2.2, mat(pick(rand, tones)), -8 + i * 6.4, 2.2 + k * 2.4, sz);
    box(g, 6, 7, W - 1, mat('#e8ecef'), -L / 2 + 4, 2.2, 0);
    box(g, 6.2, 0.8, W - 0.9, mat('#34465a'), -L / 2 + 4, 8, 0);
    cyl(g, 0.9, 0.9, 3, mat('#d9534f'), -L / 2 + 3, 9.2, 0, 10);
  }
  if (ferry) compact(g); // merge at the origin; the animation places it
  g.position.set(x, RIVER.surface - 1.0, z);
  g.rotation.y = ry;
  parent.add(g);
  return g;
}

// ---------------------------------------------------------------------------
// Airport

function airplane(parent, livery = '#2c5fb3') {
  const g = new THREE.Group();
  const white = mat('#f3f5f7', { flatShading: false, roughness: 0.35 });
  const tail = mat(livery, { flatShading: false });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(1.6, 18, 8, 16), white);
  body.rotation.x = Math.PI / 2;
  body.position.y = 2.6;
  g.add(body);
  box(g, 0.1, 0.5, 15, tail, 1.62, 2.8, 0).position.x = 1.6;
  box(g, 0.1, 0.5, 15, tail, -1.62, 2.8, 0).position.x = -1.6;
  for (let i = -6; i <= 6; i++) for (const sx of [-1.62, 1.62]) box(g, 0.06, 0.3, 0.4, mat('#34465a'), sx * 1.01, 3.3, i * 1.1);
  // Wings, engines, tail
  for (const s of [-1, 1]) {
    const wing = box(g, 12, 0.35, 3.6, white, s * 7, 2.0, 0.5);
    wing.rotation.y = s * 0.35;
    const eng = cyl(g, 0.75, 0.6, 2.8, mat('#d8dde2'), s * 4.6, 0.9, -0.2, 12);
    eng.rotation.x = Math.PI / 2;
    eng.position.y = 1.5;
    const stab = box(g, 4.6, 0.25, 1.8, white, s * 2.6, 3.0, -9.4);
    stab.rotation.y = s * 0.3;
  }
  const fin = box(g, 0.3, 4.4, 3.2, tail, 0, 3.4, -9.6);
  fin.rotation.x = -0.35;
  // Landing gear
  for (const [gx, gz] of [
    [0, 7],
    [-1.6, -0.5],
    [1.6, -0.5],
  ])
    cyl(g, 0.12, 0.12, 1.2, mat('#555'), gx, 0.2, gz, 6);
  parent.add(g);
  return g;
}

function airport(root, live, rand) {
  const { x0, x1, z0, z1 } = AIRPORT;
  slab(root, x0, x1, 0, 0.03, z0, z1, mat(C.grass));
  const tarmac = mat('#5a5d62');
  const concrete = mat('#b9b6b0');
  const white = mat('#eeeeea');
  const yellow = mat('#e8c547');
  // Runway with centre line and threshold stripes
  const rw = { x0: 170, x1: 296, z: 194 };
  slab(root, rw.x0, rw.x1, 0.03, 0.08, rw.z - 7, rw.z + 7, tarmac);
  for (let x = rw.x0 + 10; x < rw.x1 - 10; x += 7) slab(root, x, x + 4, 0.08, 0.1, rw.z - 0.2, rw.z + 0.2, white);
  for (const tx of [rw.x0 + 2, rw.x1 - 6])
    for (let k = -5; k <= 5; k++) if (k) slab(root, tx, tx + 4, 0.08, 0.1, rw.z + k * 1.1 - 0.35, rw.z + k * 1.1 + 0.35, white);
  for (let x = rw.x0; x <= rw.x1; x += 8)
    for (const sz of [-7.3, 7.3]) box(root, 0.3, 0.3, 0.3, glowMat('#fff3c4', '#fff3c4', 2.2, 0.2), x, 0.05, rw.z + sz);
  // Taxiway and apron
  slab(root, 176, 290, 0.03, 0.08, 174, 180, tarmac);
  slab(root, 176, 290, 0.08, 0.1, 176.9, 177.1, yellow);
  for (const tx of [182, 284]) slab(root, tx - 3, tx + 3, 0.03, 0.08, 174, rw.z - 7, tarmac);
  slab(root, 174, 264, 0.03, 0.08, 134, 174, concrete);

  // Terminal with a wave roof and glass front
  const tz = 122;
  const term = group(root, 218, 0, tz);
  box(term, 80, 9, 18, mat('#e9eef2'), 0, 0, 0);
  box(term, 78, 6.5, 0.1, glowMat('#a9c3d3', '#e8c98a', 0.9, 0.05), 0, 1, 9.02);
  box(term, 78, 6.5, 0.1, glowMat('#a9c3d3', '#e8c98a', 0.9, 0.05), 0, 1, -9.02);
  const roofWave = new THREE.Mesh(new THREE.CylinderGeometry(22, 22, 84, 32, 1, true, Math.PI / 2 - 0.45, 0.9), mat('#cfd8df', { side: THREE.DoubleSide }));
  roofWave.rotation.z = Math.PI / 2;
  roofWave.position.y = 9 - 22 * Math.cos(0.45) + 0.3;
  term.add(roofWave);
  sign(term, '空港 AIRPORT', 14, 1.8, { bg: '#ffffff', fg: '#2c5fb3', lit: 1.3, weight: 900 }, 0, 9.8, -9.3, Math.PI);
  // Car drop-off curb on the city side
  slab(root, 176, 260, 0, 0.05, 106, tz - 9.5, mat('#d9d2c3'));
  for (let i = 0; i < 8; i++) P.tree(root, 180 + i * 11, 108, 1.1, rand);
  // Jet bridges and parked planes
  for (const gx of [192, 210, 228, 246]) {
    const jb = group(root, gx, 0, tz + 9);
    box(jb, 2.6, 2.6, 10, mat('#cfd8df'), 0, 3.4, 5);
    cyl(jb, 0.3, 0.3, 3.4, mat('#777'), 0, 0, 9, 6);
    const p = airplane(root, pick(rand, ['#2c5fb3', '#d9534f', '#3a8f9c', '#8a6fc4']));
    p.position.set(gx, 0.1, tz + 9 + 22);
    p.rotation.y = Math.PI;
  }
  // Control tower
  const ct = group(root, 276, 0, 126);
  cyl(ct, 2.2, 3.2, 30, mat('#e9eef2'), 0, 0, 0, 12);
  cyl(ct, 5, 4, 4, glowMat('#9fb9cc', '#cfe8ff', 1.1, 0.1), 0, 30, 0, 12);
  cyl(ct, 5.4, 5.4, 0.6, mat('#cfd8df'), 0, 34, 0, 12);
  cyl(ct, 0.15, 0.15, 6, mat('#999'), 0, 34.6, 0, 6);
  ball(ct, 0.3, glowMat('#ff4a4a', '#ff3030', 3, 0.6), 0, 40.8, 0);
  // Hangar
  const hg = new THREE.Mesh(new THREE.CylinderGeometry(12, 12, 26, 20, 1, false, 0, Math.PI), mat('#d8dde2'));
  hg.rotation.set(0, Math.PI / 2, Math.PI / 2);
  hg.position.set(282, 0, 152);
  root.add(hg);
  // Windsock
  cyl(root, 0.08, 0.08, 5, mat('#999'), 168, 0, 184, 6);
  const sock = new THREE.Mesh(new THREE.ConeGeometry(0.5, 2.4, 10, 1, true), mat('#f08a4b', { side: THREE.DoubleSide }));
  sock.rotation.z = Math.PI / 2;
  sock.position.set(169.2, 4.8, 184);
  root.add(sock);

  // A plane that taxis, takes off over the bay, circles the city and lands again
  const plane = airplane(live, '#2c5fb3');
  compact(plane);
  const ALT = 70;
  const legs = [
    // [duration, fn(k) -> {x, y, z, yaw, pitch}]
    [5, () => ({ x: rw.x0 + 6, y: 0.1, z: rw.z, yaw: Math.PI / 2, pitch: 0 })],
    [10, (k) => ({ x: rw.x0 + 6 + 100 * k * k, y: 0.1 + Math.max(0, k - 0.6) * 22, z: rw.z, yaw: Math.PI / 2, pitch: k > 0.6 ? -0.14 : 0 })],
    [10, (k) => ({ x: rw.x0 + 106 + 160 * k, y: 9 + (ALT - 9) * k, z: rw.z + 20 * k, yaw: Math.PI / 2, pitch: -0.12 })],
    [28, (k) => {
      // wide loop over the bay and the city, ending lined up on the west
      const a = k * Math.PI;
      return { x: 40 + 380 * Math.cos(a), y: ALT, z: 120 - 234 * Math.sin(a), yaw: Math.atan2(-380 * Math.sin(a), -234 * Math.cos(a)), pitch: 0 };
    }],
    [12, (k) => ({ x: -340 + (rw.x0 + 340) * k, y: ALT * (1 - k) + 0.1 * k, z: 120 + (rw.z - 120) * k, yaw: Math.atan2(rw.x0 + 340, rw.z - 120), pitch: 0.08 * (1 - k) })],
    [8, (k) => ({ x: rw.x0 + 100 * (1 - (1 - k) * (1 - k)), y: 0.1, z: rw.z, yaw: Math.PI / 2, pitch: 0 })],
    [6, (k) => ({ x: rw.x0 + 100, y: 0.1, z: rw.z, yaw: Math.PI / 2 + Math.PI * k, pitch: 0 })],
    [12, (k) => ({ x: rw.x0 + 100 - 94 * k, y: 0.1, z: rw.z, yaw: -Math.PI / 2, pitch: 0 })],
    [5, (k) => ({ x: rw.x0 + 6, y: 0.1, z: rw.z, yaw: -Math.PI / 2 + Math.PI * k, pitch: 0 })],
  ];
  const total = legs.reduce((s, l) => s + l[0], 0);
  return (dt, t) => {
    let tt = t % total;
    for (const [d, f] of legs) {
      if (tt <= d) {
        const p = f(tt / d);
        plane.position.set(p.x, p.y, p.z);
        plane.rotation.set(p.pitch, p.yaw, 0, 'YXZ');
        break;
      }
      tt -= d;
    }
  };
}

// ---------------------------------------------------------------------------
// Shopping arcade (shōtengai) and the clothing store

function arcade(root, rand) {
  const { x0, x1, z0, z1 } = ARCADE;
  const shops = ['たこ焼き', '本屋', '花屋', 'パン', '薬', 'カフェ', '靴', '時計', '果物', '雑貨', 'お菓子', 'おもちゃ', 'ラーメン', '寿司', 'メガネ', '古着'];
  const facades = ['#f1ece2', '#e8b4a0', '#c9d8c5', '#f3e2c2', '#a9c0d4', '#dcc39c', '#e4ddd0'];
  slab(root, x0, x1, 0, 0.05, z0, z1, mat('#d9cdb6'));
  const segments = [];
  let sx = x0;
  for (const s of STREETS.filter((s) => s.x0 > x0 && s.x0 < x1)) {
    segments.push([sx, s.x0 - 0.4]);
    sx = s.x1 + 0.4;
  }
  segments.push([sx, x1]);
  const glass = mat('#dfeaf5', { transparent: true, opacity: 0.55, side: THREE.DoubleSide });
  for (const [a, b] of segments) {
    const len = b - a;
    const cx = (a + b) / 2;
    const cz = (z0 + z1) / 2;
    // Arched glass roof on slim posts
    const vault = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.4, len, 16, 1, true, 0, Math.PI), glass);
    vault.rotation.z = Math.PI / 2;
    vault.position.set(cx, Y + 6.2, cz);
    vault.userData.keepSeparate = true;
    root.add(vault);
    for (let x = a + 1; x < b; x += 6) for (const pz of [z0 + 0.1, z1 - 0.1]) box(root, 0.15, 6.2, 0.15, mat('#9aa0a6'), x, Y, pz);
    // Strings of lanterns down the middle
    for (let x = a + 2; x < b - 1; x += 3) P.paperLantern(root, x, Y + 5.2, cz, pick(rand, ['#ffffff', C.vermilion, '#f4a7c0']), 0.7);
    // Shop fronts on both sides
    for (const side of [-1, 1]) {
      for (let x = a + 0.3; x < b - 3; ) {
        const w = 3.6 + rand() * 2.2;
        if (x + w > b) break;
        const z = side < 0 ? z0 - 2.6 : z1 + 2.6;
        const g = group(root, x + w / 2, Y, z, side < 0 ? 0 : Math.PI);
        const floors = 2 + Math.floor(rand() * 2);
        box(g, w - 0.2, floors * 3, 5, mat(pick(rand, facades)), 0, 0, 0);
        box(g, w - 0.6, 2.4, 0.06, glowMat('#cfe0ec', pick(rand, ['#ffe2a8', '#e9f4ff', '#ffd0e0']), 0.9, 0.08), 0, 0.1, 2.52);
        box(g, w - 0.2, 0.15, 1.2, mat(pick(rand, ['#c0392b', '#2e86ab', '#3d9970', '#f39c12', '#6c5b7b'])), 0, 2.6, 3.0);
        for (let f = 1; f < floors; f++) box(g, w * 0.5, 1.2, 0.06, mat('#5d7387'), 0, f * 3 + 0.8, 2.52);
        const text = pick(rand, shops);
        sign(g, text, Math.min(w - 0.6, 0.8 * [...text].length + 0.6), 0.7, { bg: pick(rand, ['#ffffff', '#2b2b4a', '#c0392b', '#f4efe4']), fg: pick(rand, ['#c0392b', '#ffffff', '#2c3e9f']), lit: 1.2 }, 0, 2.85, 2.6);
        x += w;
      }
    }
  }
  // Gateway signs at both ends
  for (const [gx, ry] of [
    [x0 - 0.5, -Math.PI / 2],
    [x1 + 0.5, Math.PI / 2],
  ]) {
    const g = group(root, gx, Y, (z0 + z1) / 2, ry);
    for (const s of [-3.4, 3.4]) box(g, 0.4, 7.4, 0.4, mat('#9aa0a6'), s, 0, 0);
    sign(g, '商店街', 6, 1.4, { bg: '#c0392b', fg: '#ffffff', lit: 1.5, weight: 900, backFace: true }, 0, 7.4, 0);
  }
}

/** Big clothing store with a red-square logo (in the style of the well-known Japanese chain). */
function fukuya(root, x, z) {
  const g = group(root, x, Y, z, Math.PI);
  const W = 12,
    D = 10,
    H = 12;
  box(g, W, H, D, mat('#f4f4f2'), 0, 0, 0);
  // Full-height glass front with mannequins
  box(g, W - 1, H - 1.5, 0.08, glowMat('#cfe0ec', '#f4f1ea', 0.9, 0.12), 0, 0.3, D / 2 + 0.01);
  for (let f = 1; f < 3; f++) box(g, W, 0.3, 0.2, mat('#d8d8d6'), 0, f * 4, D / 2 + 0.05);
  for (let i = 0; i < 4; i++) {
    const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.35, 1.2, 4, 8), mat(pick(Math.random, ['#c0392b', '#2c3e9f', '#f4f1ea', '#3d9970'])));
    m.position.set(-4 + i * 2.6, 1.2, D / 2 - 0.6);
    g.add(m);
    ball(g, 0.28, mat('#e8e2d6'), -4 + i * 2.6, 2.3, D / 2 - 0.6);
  }
  // Red square logo blocks: one on the facade, one up on the roof corner
  sign(g, '服', 3, 3, { bg: '#d7262e', fg: '#ffffff', lit: 1.4, weight: 900, raw: true }, -W / 2 + 2, H - 4, D / 2 + 0.08);
  sign(g, 'ファッション\nFASHION', 5.5, 1.6, { bg: '#d7262e', fg: '#ffffff', lit: 1.4, weight: 900, raw: true }, 2.3, H - 3.3, D / 2 + 0.08);
  sign(g, '服', 4, 4, { bg: '#d7262e', fg: '#ffffff', lit: 1.6, weight: 900, backFace: true, depth: 0.4, raw: true }, 0, H + 0.4, 0);
  // Shopping bags stand by the door
  for (let i = 0; i < 3; i++) box(g, 0.5, 0.6, 0.25, mat('#d7262e'), 4.2 + i * 0.6, 0, D / 2 + 1);
}

// ---------------------------------------------------------------------------
// Onsen valley: hot-spring inns along a stream, bathhouse, steaming pools

function onsen(root, live, rand) {
  const { x0, x1, z0, z1 } = ONSEN;
  slab(root, x0 - 4, x1, 0, 0.04, z0, z1, mat(C.grassDark));
  // Lanes: the old main street continues west, a second lane up the valley
  slab(root, x0, x1 + 2, 0.04, 0.08, -2.6, 2.6, mat(C.path));
  slab(root, x0 + 10, x1, 0.04, 0.08, 42, 47, mat(C.path));
  // Stream running down the valley, with red drum bridges
  const sx = -222;
  const stream = slab(root, sx - 2.5, sx + 2.5, 0.02, 0.1, z0, z1, waterMaterial);
  stream.userData.keepSeparate = true;
  for (let z = z0 + 2; z < z1; z += 2.2) {
    P.rock(root, sx - 3, z, 0.5 + rand() * 0.4, rand);
    P.rock(root, sx + 3, z, 0.5 + rand() * 0.4, rand);
  }
  for (const bz of [0, 44.5]) drumBridge(root, sx, bz);
  // Hills framing the valley
  for (let i = 0; i < 12; i++) {
    const hz = z0 + 4 + i * 8;
    const r = 11 + rand() * 4;
    const h = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), mat(pick(rand, [C.grassDark, '#6f9a5c', '#7fa45e'])));
    h.scale.y = 0.5 + rand() * 0.3;
    h.position.set(WORLD.x0 + r + 1, 0, hz);
    root.add(h);
    for (let k = 0; k < 4; k++) cedar(root, WORLD.x0 + 8 + rand() * 12, 0, hz + (rand() - 0.5) * 8, 0.9 + rand() * 0.5, rand);
  }
  // Inns, bathhouse and souvenir shops
  ryokan(root, -184, 20, Math.PI);
  ryokan(root, -262, 22, Math.PI);
  ryokan(root, -192, 70, Math.PI);
  bathhouse(root, -248, 64);
  const souvenirs = ['おみやげ', '温泉', 'まんじゅう', '茶', '団子'];
  for (let x = -274; x < -156; x += 9) {
    if (Math.abs(x - sx) < 8) continue;
    machiya(root, x, -8.4, 0, { w: 6, d: 5, floors: 1 + Math.round(rand()), wall: pick(rand, [C.wood, C.woodLight, '#c98a52']), roofColor: pick(rand, [C.roofSlate, C.roofTeal]), sign: pick(rand, souvenirs), noren: 'ゆ' });
  }
  // Outdoor baths (rotenburo) and a foot bath by the stream
  const pools = [
    [-236, 32, 6, 4],
    [-205, 38, 5, 3.5],
    [-214, 8, 2.6, 1.6],
  ];
  for (const [px, pz, rx, rz] of pools) {
    water(root, px, pz, rx, rz, 0.12);
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * Math.PI * 2;
      P.rock(root, px + Math.cos(a) * (rx + 0.4), pz + Math.sin(a) * (rz + 0.4), 0.55, rand);
    }
  }
  P.bench(root, -214, 10.6, 0);
  for (const [x, z] of [
    [-170, 34],
    [-200, 52],
    [-240, 48],
    [-275, 40],
    [-160, 60],
    [-230, 80],
    [-265, 76],
  ])
    maple(root, x, z, rand);
  for (let x = x0 + 12; x < x1; x += 14) P.stoneLantern(root, x, 4.2);

  // Rising steam (animated)
  const N = 140;
  const puff = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.6, 1), new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.35, roughness: 1, depthWrite: false }), N);
  puff.userData.noShadow = true;
  puff.frustumCulled = false;
  live.add(puff);
  const sources = [...pools.map(([x, z, rx, rz]) => [x, z, rx * 0.7, rz * 0.7]), [sx, 30, 1.5, 30], [-253, 67, 0.5, 0.5]];
  const parts = Array.from({ length: N }, (_, i) => ({ src: sources[i % sources.length], age: rand() * 4, life: 3 + rand() * 2, ox: rand() * 2 - 1, oz: rand() * 2 - 1 }));
  const o = new THREE.Object3D();
  return (dt) => {
    parts.forEach((p, i) => {
      p.age += dt;
      if (p.age > p.life) {
        p.age = 0;
        p.ox = rand() * 2 - 1;
        p.oz = rand() * 2 - 1;
      }
      const k = p.age / p.life;
      const [x, z, rx, rz] = p.src;
      const chimney = rx < 1;
      o.position.set(x + p.ox * rx + k * 1.5, (chimney ? 14 : 0.3) + k * 6, z + p.oz * rz);
      o.scale.setScalar((0.6 + k * 2.2) * Math.sin(Math.min(1, k * 1.2) * Math.PI) + 0.01);
      o.updateMatrix();
      puff.setMatrixAt(i, o.matrix);
    });
    puff.instanceMatrix.needsUpdate = true;
  };
}

function drumBridge(root, x, z) {
  const g = group(root, x, 0, z, Math.PI / 2);
  const span = 9,
    rise = 1.4,
    N = 10;
  const arc = (t) => V(-span / 2 + span * t, rise * Math.sin(Math.PI * t) + 0.1, 0);
  for (let i = 0; i < N; i++) {
    const a = arc(i / N),
      b = arc((i + 1) / N);
    const p = new THREE.Mesh(new THREE.BoxGeometry(a.distanceTo(b) + 0.05, 0.2, 2.6), mat(C.vermilion));
    p.position.copy(a).add(b).multiplyScalar(0.5);
    p.rotation.z = Math.atan2(b.y - a.y, b.x - a.x);
    g.add(p);
  }
  for (const sz of [-1.2, 1.2]) for (let i = 0; i < N; i++) beam(g, arc(i / N).add(V(0, 0.9, sz)), arc((i + 1) / N).add(V(0, 0.9, sz)), 0.12, mat(C.vermilion));
}

function bathhouse(root, x, z) {
  const g = group(root, x, 0, z, Math.PI);
  box(g, 14, 0.4, 10, mat(C.stoneDark), 0, 0, 0);
  box(g, 13, 4, 9, mat(C.plaster), 0, 0.4, 0);
  for (const sx of [-6.3, -2, 2, 6.3]) box(g, 0.3, 4, 0.3, mat(C.woodDark), sx, 0.4, 4.5);
  roof(g, { w: 16, d: 12, h: 3.4, curve: 0.55, lift: 0.7, thickness: 0.3, segs: 5 }, mat(C.roofSlate), 0, 4.4, 0, mat(C.roofGray));
  // Gabled entrance porch
  roof(g, { w: 6, d: 4, h: 1.4, gable: true, curve: 0.3, thickness: 0.2, segs: 3 }, mat(C.roofSlate), 0, 3.6, 5.6);
  for (const sx of [-2.4, 2.4]) box(g, 0.3, 3.6, 0.3, mat(C.woodDark), sx, 0.4, 7.2);
  // Men's (blue) and women's (red) noren
  for (const [sx, c] of [
    [-1.4, '#2c3e9f'],
    [1.4, '#c0392b'],
  ])
    sign(g, 'ゆ', 1.8, 1.5, { bg: c, fg: '#ffffff', font: FONT_SERIF, depth: 0.03 }, sx, 1.9, 4.6);
  sign(g, '♨ 温泉', 3.4, 1.0, { bg: '#2d221c', fg: '#e8c88a', font: FONT_SERIF }, 0, 4.4, 4.62);
  // Tall chimney
  cyl(g, 0.7, 0.9, 14, mat('#d9d6cf'), 5, 0, -3, 10);
}

function maple(root, x, z, rand) {
  const g = group(root, x, 0, z, rand() * Math.PI);
  cyl(g, 0.15, 0.22, 1.8, mat('#6b4a33'), 0, 0, 0, 6);
  for (const [bx, by, bz, r] of [
    [0, 2.6, 0, 1.4],
    [0.9, 2.3, 0.4, 1.0],
    [-0.8, 2.4, -0.3, 1.0],
    [0.2, 3.3, -0.4, 0.9],
  ])
    ball(g, r, mat(pick(rand, ['#e2603a', '#f08a4b', '#d4483a', '#f2a65a'])), bx, by, bz);
}

// ---------------------------------------------------------------------------
// Countryside: tea plantation with frost fans, crop fields, orchards, farms,
// a pine-lined beach

function countryside(root, rand) {
  const { x0, x1, z0, z1 } = COUNTRY;
  slab(root, x0 - 4, x1, 0, 0.04, z0 - 2, z1, mat(C.grass));
  // Beach and coastal pines
  slab(root, WORLD.x0, RIVER.x0, 0, 0.06, COAST - 5, COAST, mat('#e8dcc0'));
  for (let x = WORLD.x0 + 4; x < RIVER.x0 - 4; x += 7 + rand() * 4) P.pine(root, x, COAST - 8 - rand() * 3, 1 + rand() * 0.4, rand);
  // Tea plantation: long rounded hedges
  const tea = mat('#5e8f4f');
  for (let z = z0 + 3; z < z1 - 12; z += 2.6) {
    const hedge = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 88, 8), tea);
    hedge.rotation.z = Math.PI / 2;
    hedge.scale.z = 0.8;
    hedge.position.set(x0 + 48, 0.45, z);
    root.add(hedge);
  }
  for (let x = x0 + 10; x < x0 + 92; x += 18) {
    const f = group(root, x, 0, z0 + 30);
    cyl(f, 0.1, 0.1, 6, mat('#9aa0a6'), 0, 0, 0, 6);
    box(f, 0.6, 0.6, 1.0, mat('#cfd8df'), 0, 6, 0);
    for (const a of [0, Math.PI / 2]) {
      const blade = box(f, 0.12, 2.2, 0.2, mat('#e8ecef'), 0, 5.2, 0.6);
      blade.rotation.z = a;
      blade.position.y = 6.3;
    }
  }
  // Crop fields with coloured rows
  const crops = ['#7fae5a', '#c9b24a', '#9bbf6a', '#b38a5a', '#6f9a4e'];
  for (let i = 0; i < 4; i++) {
    const fx = x0 + 100 + i * 17;
    const c = mat(pick(rand, crops));
    for (let k = 0; k < 7; k++) slab(root, fx, fx + 15, 0.04, 0.3, z0 + 4 + k * 3, z0 + 5.5 + k * 3, c);
  }
  // Orchard
  for (let x = x1 - 54; x < x1 - 4; x += 5)
    for (let z = z0 + 6; z < z1 - 14; z += 5) {
      const t = P.tree(root, x, z, 0.8, rand);
      ball(t, 0.18, mat('#e2603a'), 0.6, 2.2, 0.6);
    }
  // Farmsteads and a country road
  slab(root, x0, x1, 0.04, 0.08, z1 - 12, z1 - 9, mat(C.path));
  farmhouse(root, x0 + 112, z1 - 22, 0);
  farmhouse(root, x0 + 150, z1 - 22, 0);
  P.bamboo(root, x0 + 131, z1 - 22, 9, rand);
  for (let i = 0; i < 6; i++) {
    const hay = cyl(root, 0.9, 0.9, 1.4, mat('#d8c27a'), x0 + 100 + i * 6, 0, z0 + 26, 10);
    hay.rotation.z = Math.PI / 2;
    hay.position.y = 0.9;
  }
}

// ---------------------------------------------------------------------------
// Central park north of downtown: big lake with swan boats, sakura avenue,
// a shrine with a giant torii and a museum.

function centralPark(root, p, live, rand) {
  const cx = (p.x0 + p.x1) / 2;
  const pathM = mat('#d8cdb8');
  // Paths
  slab(root, p.x0, p.x1, Y, Y + 0.05, -128, -124, pathM);
  slab(root, 44, 48, Y, Y + 0.05, p.z0, p.z1, pathM);
  slab(root, 104, 108, Y, Y + 0.05, -124, p.z1, pathM);
  // Sakura avenue along the main path
  for (let x = p.x0 + 4; x < p.x1 - 2; x += 6) {
    P.sakura(root, x, -130.5, 1.0 + rand() * 0.2, rand).position.y = Y;
    P.sakura(root, x + 3, -121.5, 1.0 + rand() * 0.2, rand).position.y = Y;
  }
  // Lake with an island shrine and swan boats
  const lake = { x: 78, z: -165, rx: 26, rz: 16 };
  water(root, lake.x, lake.z, lake.rx, lake.rz, Y + 0.05);
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2;
    P.rock(root, lake.x + Math.cos(a) * (lake.rx + 0.5), lake.z + Math.sin(a) * (lake.rz + 0.5), 0.5, rand).position.y += Y;
  }
  const island = cyl(root, 4, 4.6, 0.8, mat(C.grass), lake.x + 6, Y - 0.2, lake.z - 2, 12);
  island.scale.z = 0.8;
  const hall = group(root, lake.x + 6, Y + 0.6, lake.z - 2);
  box(hall, 3.4, 2.2, 2.6, mat(C.vermilion), 0, 0, 0);
  roof(hall, { w: 4.6, d: 3.8, h: 1.4, curve: 0.5, lift: 0.3, thickness: 0.15, segs: 3 }, mat(C.roofSlate), 0, 2.2, 0);
  const boats = [];
  for (let i = 0; i < 5; i++) {
    const b = new THREE.Group();
    box(b, 1.6, 0.8, 2.4, mat('#f4f4f2'), 0, 0, 0);
    const neck = cyl(b, 0.15, 0.2, 1.4, mat('#f4f4f2'), 0, 0.6, 1.1, 8);
    neck.rotation.x = 0.3;
    ball(b, 0.3, mat('#f4f4f2'), 0, 2.0, 1.4);
    compact(b);
    live.add(b);
    boats.push({ b, a: (i / 5) * Math.PI * 2, r: 0.55 + (i % 2) * 0.2, sp: 0.05 + i * 0.01 });
  }
  // Big wooden torii and shrine (Meiji-jingū style) at the west end
  P.torii(root, 26, -150, 0, 2.2, '#8b6a4a').position.y = Y;
  const shrine = group(root, 26, Y, -186);
  box(shrine, 22, 0.8, 12, mat(C.stoneDark), 0, 0, 0);
  box(shrine, 18, 4.5, 9, mat(C.plaster), 0, 0.8, 0);
  for (let i = 0; i <= 6; i++) box(shrine, 0.35, 4.5, 0.35, mat(C.woodDark), -9 + i * 3, 0.8, 4.5);
  roof(shrine, { w: 24, d: 15, h: 5, curve: 0.6, lift: 0.9, thickness: 0.35, segs: 6 }, mat('#4f5d66'), 0, 5.3, 0, mat(C.roofGray));
  for (let k = 0; k < 20; k++) cedar(root, 8 + rand() * 40, Y, -214 + rand() * 22, 1 + rand() * 0.5, rand);
  // Museum at the east end
  const mus = group(root, 118, Y, -184);
  box(mus, 30, 1, 16, mat('#d9d6cf'), 0, 0, 0);
  box(mus, 26, 7, 12, mat('#e8e3d8'), 0, 1, 0);
  for (let i = 0; i < 9; i++) box(mus, 0.8, 6, 0.8, mat('#cfc9bb'), -12 + i * 3, 1, 6.4);
  roof(mus, { w: 30, d: 16, h: 4.5, curve: 0.3, lift: 0.4, thickness: 0.3, segs: 4 }, mat('#5d6a74'), 0, 8, 0);
  sign(mus, '博物館', 4, 1.0, { bg: '#2d221c', fg: '#e8c88a', font: FONT_SERIF }, 0, 6.2, 6.5);
  // Lawns with picnic sheets (hanami!)
  for (let i = 0; i < 8; i++) {
    const sheet = box(root, 2.4, 0.04, 2, mat('#4b7cc4'), p.x0 + 10 + rand() * (p.x1 - p.x0 - 20), Y + 0.06, -118 + rand() * 10);
    sheet.rotation.y = rand();
  }
  for (let x = p.x0 + 6; x < p.x1; x += 16) P.bench(root, x, -126, 0).position.y = Y;
  return (dt, t) => {
    for (const s of boats) {
      const a = s.a + t * s.sp;
      s.b.position.set(lake.x + Math.cos(a) * lake.rx * s.r, Y + 0.3, lake.z + Math.sin(a) * lake.rz * s.r);
      s.b.rotation.y = -a;
    }
  };
}

// ---------------------------------------------------------------------------
// Lake at the foot of Fuji with the Chūreitō-style pagoda on a hill

function fujiLake(root, rand) {
  const { x, z, rx, rz } = FUJI_LAKE;
  water(root, x, z, rx, rz);
  for (let i = 0; i < 46; i++) {
    const a = (i / 46) * Math.PI * 2;
    P.rock(root, x + Math.cos(a) * (rx + 0.5), z + Math.sin(a) * (rz + 0.5), 0.6, rand);
  }
  for (let i = 0; i < 3; i++) boat(root, x + 6 + i * 3, z + rz - 3, 0.4 * i, rand);
  // Hill with the pagoda, stairs and sakura
  const hill = new THREE.Mesh(new THREE.SphereGeometry(16, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat(C.grassDark));
  hill.scale.y = 0.45;
  hill.position.set(CHUREITO.x, 0, CHUREITO.z);
  root.add(hill);
  const top = 7.2;
  const pg = group(root, 0, top - 0.9, 0);
  pagoda(pg, CHUREITO.x, CHUREITO.z);
  pg.scale.setScalar(0.85);
  pg.position.set(CHUREITO.x * 0.15, top - 0.9, CHUREITO.z * 0.15);
  for (let k = 0; k < 14; k++) box(root, 2.4, 0.5, 1, mat(C.stone), CHUREITO.x, (k / 14) * top, CHUREITO.z + 16 - k * 0.9);
  for (let i = 0; i < 16; i++) {
    const a = rand() * Math.PI * 2;
    const r = 8 + rand() * 9;
    const hx = CHUREITO.x + Math.cos(a) * r;
    const hz = CHUREITO.z + Math.sin(a) * r;
    const hy = Math.max(0, 7.2 * Math.sqrt(Math.max(0, 1 - (r / 16) ** 2)));
    P.sakura(root, hx, hz, 0.9, rand).position.y = hy - 0.3;
  }
  P.torii(root, CHUREITO.x, CHUREITO.z + 19, 0, 1.0);
}

/** The bullet train: arrives from one side, stops at the grand station, leaves, then runs back the other way. */
function shinkansenRun(live) {
  const CARS = 8,
    L = 10;
  const { train } = buildShinkansenTrain(live, CARS);
  const half = ((CARS - 1) * L) / 2;
  const VMAX = 42,
    ACC = 7;
  let dir = 1;
  let x = -420;
  let v = VMAX;
  let phase = 'arrive';
  let wait = 0;
  return (dt) => {
    const stop = GRAND_STATION.x;
    if (phase === 'arrive') {
      const remaining = (stop - x) * dir;
      v = Math.min(VMAX, Math.sqrt(2 * ACC * Math.max(remaining, 0)) + 1.5);
      x += dir * v * dt;
      if ((stop - x) * dir <= 0) {
        x = stop;
        phase = 'wait';
        wait = 8;
      }
    } else if (phase === 'wait') {
      if ((wait -= dt) <= 0) {
        phase = 'depart';
        v = 0;
      }
    } else {
      v = Math.min(VMAX, v + ACC * dt);
      x += dir * v * dt;
      if (Math.abs(x) > 420) {
        dir = -dir;
        x = -dir * 420;
        phase = 'arrive';
      }
    }
    train.rotation.y = dir > 0 ? Math.PI : 0;
    train.position.set(x + dir * half, SHINKANSEN.deck + 0.12, SHINKANSEN.z - 2 * dir);
    train.children.forEach((c, i) => {
      const cx = train.position.x - dir * i * L;
      c.visible = Math.abs(cx) < WORLD.x1 - 6;
    });
  };
}
