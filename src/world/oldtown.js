import * as THREE from 'three';
import { C, mat } from '../core/materials.js';
import { box, cyl, ball, group, beam, prism, rng, pick } from '../core/geo.js';
import { roof, leanTo } from '../core/roof.js';
import { sign, FONT_SERIF } from '../core/signs.js';
import { LOC } from '../locations.js';
import { POND } from './layout.js';
import * as P from './props.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const FACE_SOUTH = 0; // door towards +z
const FACE_NORTH = Math.PI; // door towards −z

/**
 * Edo-period town on the west bank: shrine, pagoda, machiya shops along the
 * main street, a tea house, a ryokan, the watch tower and the town gate.
 */
export function buildOldTown(root) {
  const rand = rng(42);

  machiya(root, ...LOC.sushi.pos, FACE_NORTH, {
    sign: '楽寿司',
    noren: 'すし',
    wall: C.woodLight,
    roofColor: C.roofTeal,
    stall: true,
  });
  ramenShop(root, ...LOC.ramen.pos, FACE_NORTH);
  chaya(root, ...LOC.chaya.pos, FACE_NORTH);
  shrine(root, ...LOC.jinja.pos);
  pagoda(root, ...LOC.pagoda.pos);
  ryokan(root, ...LOC.ryokan.pos, FACE_NORTH);

  // Extra townhouses so the street feels lived in
  machiya(root, -52, -7.5, FACE_SOUTH, { sign: 'うどん', noren: 'うどん', wall: C.wood, roofColor: C.roofSlate, w: 6 });
  machiya(root, -27, -7.5, FACE_SOUTH, { sign: '甘味処', noren: '甘味', wall: '#c98a52', roofColor: C.roofSlate, w: 6.5 });
  machiya(root, -11, -6.2, FACE_SOUTH, { sign: '酒', noren: '酒', wall: C.woodDark, roofColor: C.roofGray, w: 5, d: 5, floors: 1 });
  machiya(root, -53, 8, FACE_NORTH, { sign: '花月堂', noren: '和菓子', wall: '#d59c62', roofColor: C.roofTeal, w: 6 });
  machiya(root, -9.5, 18, Math.PI / 2, { wall: C.woodLight, roofColor: C.roofSlate, w: 6, floors: 1 });
  machiya(root, -22, 34, FACE_NORTH, { wall: C.wood, roofColor: C.roofTeal, w: 7 });

  watchTower(root, -52, -32);
  townGate(root, -57, 0);
  pavilion(root, -49, -16);
  welcomeBoard(root, -9, -3.6);

  // Shrine approach: a tunnel of torii gates and stone lanterns
  for (let i = 0; i < 4; i++) P.torii(root, -36, -6 - i * 4.2, 0, 0.95);
  for (let z = -6; z > -26; z -= 5) {
    P.stoneLantern(root, -39.2, z);
    P.stoneLantern(root, -32.8, z);
  }
  // Floating torii in the pond
  const island = cyl(root, 1.6, 2.0, 0.5, mat(C.stoneDark), POND.x, 0, POND.z, 8);
  island.scale.z = 0.7;
  P.torii(root, POND.x, POND.z, Math.PI / 2, 0.8);
  P.pine(root, POND.x + 6.5, POND.z - 5, 1.1, rand);

  // Sakura everywhere
  for (const [x, z, s] of [
    [-11, 10, 1.25],
    [-24, 13, 1.0],
    [-41, -9, 1.1],
    [-30, -19, 1.3],
    [-44, -24, 1.0],
    [-23, -14, 0.9],
    [-9, -27, 1.2],
    [-12, 30, 1.1],
    [-48, 22, 1.0],
    [-26, -40, 0.9],
    [-46, -37, 1.0],
    [-58, -21, 0.9],
  ])
    P.sakura(root, x, z, s, rand);
  for (const [x, z] of [
    [-56, 16],
    [-50, 38],
    [-10, 38],
    [-28, 40],
  ])
    P.pine(root, x, z, 1, rand);

  P.bamboo(root, -56, 26, 9, rand);
  P.bamboo(root, -56, 33, 8, rand);
  P.bamboo(root, -50, 31, 7, rand);
  P.bamboo(root, -8.5, -38, 8, rand);
  for (let i = 0; i < 14; i++) P.rock(root, -58 + rand() * 50, 14 + rand() * 26, 0.3 + rand() * 0.5, rand);

  P.cart(root, -39, 3.8, 0.3);
  P.bench(root, -23, 4, 0);
  P.bench(root, -47.5, -4, Math.PI);
  P.bicycle(root, -20.5, 3.6, 0.2);
  well(root, -46, 18);

  // Utility poles and drooping wires along the south side of the street
  const poleTops = [-56, -45, -34, -24, -13].map((x) => P.utilityPole(root, x, 3.4, 7));
  P.wires(root, poleTops);
}

/** Two-storey wooden townhouse (machiya) with lattice front, noren and kanban. */
export function machiya(parent, x, z, ry, { w = 7, d = 6, floors = 2, wall = C.woodLight, roofColor = C.roofTeal, sign: kanban, noren, stall = false } = {}) {
  const g = group(parent, x, 0, z, ry);
  const wood = mat(wall);
  const dark = mat(C.woodDark);
  const plaster = mat(C.plaster);
  const roofMat = mat(roofColor);
  const f1 = 3.0;

  box(g, w + 0.2, 0.3, d + 0.2, mat(C.stoneDark), 0, 0, 0);
  box(g, w, f1, d, wood, 0, 0.3, 0);
  // Lattice front (koshi) with a doorway in the middle
  for (let i = 0; i < Math.floor(w / 0.35); i++) {
    const sx = -w / 2 + 0.2 + i * 0.35;
    if (Math.abs(sx) < 1.0) continue;
    box(g, 0.08, 2.0, 0.08, dark, sx, 0.5, d / 2 + 0.05);
  }
  box(g, 1.9, 2.3, 0.05, mat('#3a2a20'), 0, 0.3, d / 2 + 0.01);
  if (noren) {
    for (let i = -1; i <= 1; i++) {
      sign(g, i === 0 ? noren : '', 0.6, 0.9, { bg: '#24315c', fg: '#f4efe4', font: FONT_SERIF, depth: 0.03, vertical: true }, i * 0.62, 1.55, d / 2 + 0.12);
    }
  }
  // Awning (hisashi) over the ground floor
  leanTo(g, w + 0.6, 1.5, 0.55, roofMat, 0, f1 + 0.45, d / 2 - 0.1);
  for (const sx of [-1, 1]) P.paperLantern(g, sx * (w / 2 - 0.6), 2.1, d / 2 + 0.9, C.vermilion, 0.9);

  let top = f1 + 0.3;
  if (floors === 2) {
    const f2 = 2.4;
    box(g, w - 0.3, f2, d - 0.8, plaster, 0, top, -0.2);
    // timber frame
    for (const sx of [-w / 2 + 0.2, 0, w / 2 - 0.2]) box(g, 0.18, f2, 0.1, dark, sx, top, d / 2 - 0.55);
    box(g, w - 0.3, 0.16, 0.1, dark, 0, top + f2 - 0.2, d / 2 - 0.55);
    // mushiko windows
    for (const sx of [-w / 3, w / 3]) {
      box(g, 1.1, 0.6, 0.06, mat('#3b2b22'), sx, top + 1.35, d / 2 - 0.5);
      for (let k = -2; k <= 2; k++) box(g, 0.06, 0.6, 0.08, plaster, sx + k * 0.2, top + 1.35, d / 2 - 0.47);
    }
    if (kanban) sign(g, kanban, Math.min(3.2, w * 0.5), 0.9, { bg: '#2d221c', fg: '#e8c88a', font: FONT_SERIF, frame: '#1d1612' }, 0, top + 0.3, d / 2 - 0.42);
    top += f2;
    roof(g, { w: w + 1.0, d: d + 0.6, h: 1.7, gable: true, curve: 0.15, thickness: 0.2, segs: 3 }, roofMat, 0, top - 0.05, -0.2, mat(C.roofSlate));
    prism(g, w - 0.3, d - 0.8, 1.6, plaster, 0, top, -0.2);
  } else {
    if (kanban) sign(g, kanban, Math.min(2.4, w * 0.45), 0.7, { bg: '#2d221c', fg: '#e8c88a', font: FONT_SERIF }, 0, f1 + 0.95, d / 2 + 1.2);
    roof(g, { w: w + 1.0, d: d + 1.0, h: 1.7, gable: true, curve: 0.15, thickness: 0.2, segs: 3 }, roofMat, 0, top, 0, mat(C.roofSlate));
    prism(g, w, d, 1.6, wood, 0, top, 0);
  }

  if (stall) {
    // Little sushi display kiosk beside the shop, as in the paper model
    const s = group(g, w / 2 + 1.4, 0, d / 2 - 0.6);
    box(s, 1.8, 1.0, 1.4, mat(C.woodLight), 0, 0, 0);
    for (let k = 0; k < 3; k++) {
      box(s, 1.5, 0.06, 0.35, mat('#2a2a2a'), 0, 1.0, -0.4 + k * 0.4);
      for (let j = 0; j < 4; j++) box(s, 0.22, 0.1, 0.18, mat(pick(Math.random, ['#f28b5b', '#f4f1ea', '#d84a3a', '#f6c453'])), -0.55 + j * 0.37, 1.06, -0.4 + k * 0.4);
    }
    for (const px of [-0.8, 0.8]) box(s, 0.1, 1.4, 0.1, mat(C.woodDark), px, 1.0, -0.6);
    roof(s, { w: 2.2, d: 2.0, h: 0.7, gable: true, curve: 0, thickness: 0.12, segs: 2 }, mat(C.roofTerracotta), 0, 2.35, 0);
    sign(s, 'すし', 0.9, 0.35, { bg: '#f2ead8', fg: C.vermilion }, 0, 1.95, 0.7);
  }
  return g;
}

/** Ramen shop after the cosy diorama: tall house, slatted front, counter stools, ivy. */
function ramenShop(parent, x, z, ry) {
  const g = group(parent, x, 0, z, ry);
  const plaster = mat(C.plasterWarm);
  const wood = mat(C.woodDark);
  const roofMat = mat(C.roofTerracotta);

  box(g, 9.5, 0.25, 7.5, mat('#8d6e5a'), 0, 0, 0);
  // Tall rear house
  box(g, 4.2, 6.2, 5, plaster, 2, 0.25, -0.8);
  roof(g, { w: 4.2, d: 5.8, h: 1.8, gable: true, curve: 0.1, thickness: 0.2, segs: 2 }, roofMat, 2, 6.45, -0.8);
  prism(g, 4.2, 5, 1.7, plaster, 2, 6.45, -0.8);
  box(g, 1.4, 0.8, 0.1, mat('#5b3b2b'), 2, 4.3, 1.75);
  for (let k = -2; k <= 2; k++) box(g, 0.06, 0.8, 0.12, mat(C.woodLight), 2 + k * 0.25, 4.3, 1.78);
  // Low front shop with awning
  box(g, 5, 2.8, 4.6, wood, -2.3, 0.25, 0.2);
  for (let i = 0; i < 12; i++) box(g, 0.07, 2.4, 0.07, mat('#3a2418'), -4.6 + i * 0.42, 0.25, 2.55);
  leanTo(g, 5.8, 2.2, 0.8, roofMat, -2.3, 3.4, 1.6);
  roof(g, { w: 5.6, d: 5.0, h: 1.0, curve: 0.2, lift: 0.1, thickness: 0.18, segs: 3 }, roofMat, -2.3, 3.05, 0.2);
  sign(g, 'ラーメン\n一番屋', 2.6, 0.75, { bg: '#f5f0e6', fg: '#c62828', lit: 1.2 }, -0.4, 3.35, 3.05, -0.25);
  // Counter and stools
  box(g, 3.6, 0.12, 0.6, mat(C.woodLight), -2.6, 1.15, 3.1);
  box(g, 3.4, 1.15, 0.1, mat('#6a4330'), -2.6, 0, 2.9);
  for (let i = 0; i < 4; i++) {
    cyl(g, 0.05, 0.05, 0.75, mat('#333'), -4.0 + i * 0.95, 0.25, 3.9, 6);
    cyl(g, 0.24, 0.24, 0.1, mat('#b33a2e'), -4.0 + i * 0.95, 1.0, 3.9, 10);
    if (i % 2 === 0) cyl(g, 0.16, 0.11, 0.14, mat('#f2ece0'), -4.0 + i * 0.95, 1.27, 3.15, 10);
  }
  for (const sx of [-4.5, -0.2]) P.paperLantern(g, sx, 2.65, 3.4, C.vermilion, 0.85);
  // Ivy climbing the tall wall
  for (let k = 0; k < 9; k++) ball(g, 0.4 + Math.random() * 0.2, mat(pick(Math.random, C.leaf)), 4.15, 0.6 + k * 0.6, 0.6 + Math.sin(k) * 0.3);
  box(g, 0.6, 0.6, 0.6, mat('#c0392b'), 4.3, 0.25, 1.4);
  P.bicycle(g, 3, 2.9, 0);
  return g;
}

/** Tea house with a red bench and a big wagasa parasol out front. */
function chaya(parent, x, z, ry) {
  const g = group(parent, x, 0, z, ry);
  box(g, 7.6, 0.4, 6, mat(C.stoneDark), 0, 0, 0);
  box(g, 7, 2.9, 5, mat(C.plaster), 0, 0.4, -0.3);
  for (const sx of [-3.4, -1.1, 1.1, 3.4]) box(g, 0.22, 2.9, 0.22, mat(C.woodDark), sx, 0.4, 2.25);
  box(g, 7, 0.2, 0.22, mat(C.woodDark), 0, 3.0, 2.25);
  // shoji panels
  for (let i = 0; i < 6; i++) box(g, 1.05, 2.2, 0.05, mat('#f7f1e1'), -2.9 + i * 1.15, 0.6, 2.2);
  roof(g, { w: 9, d: 7.4, h: 2.4, curve: 0.55, lift: 0.5, thickness: 0.22 }, mat(C.roofSlate), 0, 3.3, -0.3, mat(C.black));
  sign(g, '茶屋', 1.8, 0.7, { bg: '#2d221c', fg: '#f0d79a', font: FONT_SERIF }, 0, 3.35, 2.4);
  for (let i = -1; i <= 1; i++) sign(g, i === 0 ? 'お茶' : '', 0.55, 0.8, { bg: '#5b7f3a', fg: '#f4efe4', font: FONT_SERIF, depth: 0.03 }, i * 0.58, 1.9, 2.32);

  // Red benches (hi-mōsen) and parasol
  for (const sx of [-2.4, 2.4]) {
    const b = group(g, sx, 0.4, 4.2);
    box(b, 2.2, 0.12, 0.9, mat('#c62f2f'), 0, 0.5, 0);
    for (const lx of [-0.95, 0.95]) box(b, 0.1, 0.5, 0.7, mat(C.woodDark), lx, 0, 0);
  }
  const u = group(g, 0, 0.4, 4.4);
  cyl(u, 0.05, 0.05, 3.4, mat(C.woodDark), 0, 0, 0, 6);
  const canopy = new THREE.Mesh(new THREE.ConeGeometry(2.4, 0.9, 16, 1, true), mat('#d63a32', { side: THREE.DoubleSide }));
  canopy.position.y = 3.2;
  u.add(canopy);
  box(g, 0.4, 0.2, 0.4, mat('#3c6b3a'), -2.4, 1.0, 4.2); // tea cup tray
  return g;
}

/** Shrine hall raised on stilts with a wraparound veranda and a sweeping hip roof. */
function shrine(parent, x, z) {
  const g = group(parent, x, 0, z, 0);
  const posts = mat(C.woodDark);
  const deckM = mat(C.wood);
  const W = 17,
    D = 10,
    H0 = 1.3;
  for (let i = 0; i <= 6; i++) for (let j = 0; j <= 3; j++) box(g, 0.25, H0, 0.25, mat(C.woodLight), -W / 2 + (i * W) / 6, 0, -D / 2 + (j * D) / 3);
  box(g, W + 0.4, 0.3, D + 0.4, deckM, 0, H0, 0);
  // railing
  const rail = mat('#a8512f');
  for (const [ax, az, bx, bz] of [
    [-W / 2, -D / 2, W / 2, -D / 2],
    [W / 2, -D / 2, W / 2, D / 2],
    [-W / 2, -D / 2, -W / 2, D / 2],
    [-W / 2, D / 2, -1.6, D / 2],
    [1.6, D / 2, W / 2, D / 2],
  ]) {
    beam(g, V(ax, H0 + 1.1, az), V(bx, H0 + 1.1, bz), 0.12, rail);
    beam(g, V(ax, H0 + 0.6, az), V(bx, H0 + 0.6, bz), 0.08, rail);
    const n = Math.round(Math.hypot(bx - ax, bz - az) / 1.4);
    for (let k = 0; k <= n; k++) box(g, 0.12, 1.1, 0.12, rail, ax + ((bx - ax) * k) / n, H0 + 0.3, az + ((bz - az) * k) / n);
  }
  // Main hall
  const bodyW = W - 3,
    bodyD = D - 3,
    bodyH = 3.8;
  box(g, bodyW, bodyH, bodyD, mat(C.plaster), 0, H0 + 0.3, 0);
  for (let i = 0; i <= 6; i++) {
    box(g, 0.3, bodyH, 0.3, posts, -bodyW / 2 + (i * bodyW) / 6, H0 + 0.3, bodyD / 2);
    box(g, 0.3, bodyH, 0.3, posts, -bodyW / 2 + (i * bodyW) / 6, H0 + 0.3, -bodyD / 2);
  }
  box(g, bodyW + 0.2, 0.35, bodyD + 0.2, posts, 0, H0 + 0.3 + bodyH - 0.35, 0);
  box(g, 3, 2.8, 0.08, mat('#7a3b22'), 0, H0 + 0.3, bodyD / 2 + 0.05);
  roof(g, { w: W + 3.5, d: D + 3.5, h: 4.6, curve: 0.6, lift: 1.0, thickness: 0.35, segs: 8 }, mat(C.roofGray), 0, H0 + 0.3 + bodyH, 0, mat('#5f6468'));
  // Shibi ornaments on the ridge ends
  const ridgeHalf = (W - D) / 2 + 0.2;
  for (const sx of [-1, 1]) {
    const s = box(g, 0.35, 1.1, 0.5, mat('#5f6468'), sx * ridgeHalf, H0 + 0.3 + bodyH + 4.4, 0);
    s.rotation.z = -sx * 0.35;
  }
  // Front steps and entrance canopy (kōhai)
  for (let k = 0; k < 6; k++) box(g, 3.2, 0.25, 0.45, deckM, 0, k * 0.27, D / 2 + 2.6 - k * 0.45);
  for (const sx of [-1.4, 1.4]) box(g, 0.25, 4.4, 0.25, posts, sx, 0, D / 2 + 2.6);
  roof(g, { w: 4.2, d: 3.6, h: 1.0, gable: true, curve: 0.3, thickness: 0.18, segs: 3 }, mat(C.roofGray), 0, 4.4, D / 2 + 1.5);
  // Offering box, bell and shimenawa rope
  box(g, 1.6, 0.8, 0.8, mat('#5a3420'), 0, H0 + 0.3, D / 2 - 0.2);
  cyl(g, 0.25, 0.35, 0.4, mat('#c9a227', { metalness: 0.6, roughness: 0.4 }), 0, H0 + 3.2, D / 2 + 0.6, 10);
  beam(g, V(-1.6, H0 + 3.6, D / 2 + 0.25), V(1.6, H0 + 3.6, D / 2 + 0.25), 0.18, mat('#e6d39a'), true);
  for (const sx of [-0.8, 0, 0.8]) box(g, 0.12, 0.6, 0.02, mat('#ffffff'), sx, H0 + 2.9, D / 2 + 0.3);
  sign(g, '神社', 1.6, 0.8, { bg: '#2d221c', fg: '#e8c88a', font: FONT_SERIF }, 0, H0 + 0.3 + bodyH - 1.2, bodyD / 2 + 0.2);
  // Guardian lanterns and omikuji rack
  P.stoneLantern(g, -5, D / 2 + 3.5, 1.2);
  P.stoneLantern(g, 5, D / 2 + 3.5, 1.2);
  const rack = group(g, 7.5, 0, D / 2 + 4);
  for (const sx of [-1, 1]) box(rack, 0.12, 1.6, 0.12, mat(C.woodDark), sx, 0, 0);
  for (const y of [0.9, 1.4]) {
    box(rack, 2.1, 0.06, 0.06, mat(C.woodDark), 0, y, 0);
    for (let k = 0; k < 9; k++) box(rack, 0.1, 0.2, 0.04, mat('#fbfaf5'), -0.85 + k * 0.21, y - 0.15, 0.05);
  }
  return g;
}

/** Five-storey pagoda on a stone platform, surrounded by a low wall and cypresses. */
export function pagoda(parent, x, z) {
  const g = group(parent, x, 0, z, Math.PI / 12);
  const plum = mat(C.roofPlum);
  const posts = mat('#5b2440');
  const plaster = mat('#f2e3e6');
  box(g, 11, 0.9, 11, mat(C.stone), 0, 0, 0);
  for (let k = 0; k < 3; k++) box(g, 2.4, 0.3, 0.5, mat(C.stone), 0, k * 0.3, 5.7 + (2 - k) * 0.5);
  let y = 0.9;
  for (let i = 0; i < 5; i++) {
    const s = 5.4 - i * 0.6;
    const h = i === 0 ? 2.8 : 2.0;
    box(g, s, h, s, plaster, 0, y, 0);
    for (const cx of [-1, 1]) for (const cz of [-1, 1]) box(g, 0.25, h, 0.25, posts, (cx * s) / 2, y, (cz * s) / 2);
    box(g, 1.0, 1.6, 0.06, mat('#3c1c2b'), 0, y + 0.1, s / 2 + 0.01);
    if (i > 0) {
      // balcony railing
      for (const [ax, az, bx, bz] of [
        [-1, -1, 1, -1],
        [1, -1, 1, 1],
        [1, 1, -1, 1],
        [-1, 1, -1, -1],
      ]) {
        const r = s / 2 + 0.5;
        beam(g, V(ax * r, y + 0.55, az * r), V(bx * r, y + 0.55, bz * r), 0.08, posts);
      }
    }
    y += h;
    roof(g, { w: s + 3.2, d: s + 3.2, h: 1.1, curve: 0.55, lift: 0.55, thickness: 0.28, segs: 5 }, plum, 0, y, 0);
    y += 0.55;
  }
  // Sōrin spire
  cyl(g, 0.12, 0.12, 4.5, mat('#3b3b3b'), 0, y, 0, 6);
  for (let k = 0; k < 9; k++) cyl(g, 0.35, 0.35, 0.08, mat('#c9a227', { metalness: 0.5, roughness: 0.4 }), 0, y + 0.8 + k * 0.34, 0, 10);
  ball(g, 0.22, mat('#c9a227', { metalness: 0.6, roughness: 0.3 }), 0, y + 4.6, 0);

  // Wall and pink-lavender cypresses (from the reference)
  P.wall(g, -7.5, -7.5, 7.5, -7.5, 1.4);
  P.wall(g, -7.5, -7.5, -7.5, 7.5, 1.4);
  P.wall(g, 7.5, -7.5, 7.5, 7.5, 1.4);
  P.wall(g, -7.5, 7.5, -2.2, 7.5, 1.4);
  P.wall(g, 2.2, 7.5, 7.5, 7.5, 1.4);
  for (const [cx, cz, col] of [
    [-6.4, -6.4, '#e7a7c5'],
    [6.4, -6.4, '#c69ad9'],
    [-6.4, 6.4, '#c69ad9'],
    [6.4, 6.4, '#e7a7c5'],
    [-6.4, 0, '#d7a0d0'],
    [6.4, 0, '#d7a0d0'],
  ]) {
    const c = new THREE.Mesh(new THREE.ConeGeometry(0.7, 3.2, 6), mat(col));
    c.position.set(cx, 1.6, cz);
    g.add(c);
  }
  return g;
}

/** Traditional inn: wide veranda, shoji walls and layered brown roofs. */
export function ryokan(parent, x, z, ry) {
  const g = group(parent, x, 0, z, ry);
  const brown = mat('#7b3f24');
  const posts = mat(C.woodDark);
  const deck = mat(C.woodLight);
  box(g, 18, 0.6, 12, deck, 0, 0, 0);
  for (let i = 0; i <= 8; i++) {
    for (const zz of [-5.8, 5.8]) box(g, 0.25, 3.2, 0.25, posts, -8.8 + i * 2.2, 0.6, zz);
  }
  for (const xx of [-8.8, 8.8]) for (let j = 1; j < 5; j++) box(g, 0.25, 3.2, 0.25, posts, xx, 0.6, -5.8 + j * 2.32);
  // veranda railing
  beam(g, V(-8.8, 1.4, 5.8), V(-1.5, 1.4, 5.8), 0.1, posts);
  beam(g, V(1.5, 1.4, 5.8), V(8.8, 1.4, 5.8), 0.1, posts);
  // shoji core
  box(g, 14, 3.0, 8, mat('#f7f1e1'), 0, 0.6, 0);
  for (let i = 0; i <= 14; i++) box(g, 0.08, 3.0, 0.06, posts, -7 + i, 0.6, 4.02);
  for (const y of [1.4, 2.4]) box(g, 14, 0.06, 0.06, posts, 0, y, 4.02);
  roof(g, { w: 20.5, d: 14.5, h: 2.4, curve: 0.25, lift: 0.25, thickness: 0.3, segs: 4 }, brown, 0, 3.8, 0);
  // upper storey
  box(g, 9, 2.6, 6, mat(C.plaster), 0, 5.2, -0.5);
  for (let i = 0; i <= 6; i++) box(g, 0.2, 2.6, 0.2, posts, -4.5 + i * 1.5, 5.2, 2.5);
  roof(g, { w: 12, d: 9, h: 2.4, curve: 0.3, lift: 0.3, thickness: 0.3, segs: 4 }, brown, 0, 7.8, -0.5, mat('#5a2c19'));
  sign(g, '旅館', 2.4, 0.9, { bg: '#2d221c', fg: '#e8c88a', font: FONT_SERIF }, 0, 6.2, 2.55);
  // Entrance noren & lanterns
  for (let i = -1; i <= 1; i++) sign(g, i === 0 ? '寿亭' : '', 0.7, 1.1, { bg: '#5b2c1e', fg: '#f4efe4', font: FONT_SERIF, depth: 0.03 }, i * 0.72, 2.0, 4.1);
  for (const sx of [-2.2, 2.2]) P.paperLantern(g, sx, 3.0, 5.6, '#fff4dc', 1.1);
  for (const sx of [-4.5, 4.5]) P.stoneLantern(g, sx, 7.6, 1);
  // stepping stones to the street
  for (let k = 0; k < 4; k++) box(g, 1.2, 0.1, 0.9, mat(C.stone), (k % 2) * 0.5 - 0.25, 0, 7.2 + k * 1.3);
  return g;
}

/** Tapered wooden fire-watch tower with a lookout room. */
function watchTower(parent, x, z) {
  const g = group(parent, x, 0, z, 0.2);
  const plank = mat('#b0602e');
  const frustum = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 3.0, 11, 4), plank);
  frustum.rotation.y = Math.PI / 4;
  frustum.position.y = 5.5;
  g.add(frustum);
  for (const [wx, wy] of [
    [0.6, 4],
    [-0.5, 6.5],
    [0.3, 8.6],
  ])
    box(g, 0.5, 0.5, 0.1, mat('#3a2418'), wx, wy, 2.17 - (0.85 * wy) / 11);
  box(g, 0.9, 1.6, 0.1, mat('#3a2418'), 0, 0, 2.08);
  box(g, 5.2, 0.3, 5.2, mat(C.woodLight), 0, 11, 0);
  for (const cx of [-2.4, 2.4]) for (const cz of [-2.4, 2.4]) box(g, 0.2, 2.2, 0.2, mat(C.woodDark), cx, 11.3, cz);
  box(g, 3, 2, 3, mat('#c46f37'), 0, 11.3, 0);
  roof(g, { w: 6.5, d: 6.5, h: 2.3, curve: 0.4, lift: 0.3, thickness: 0.2, segs: 4 }, mat('#d9884b'), 0, 13.5, 0);
  roof(g, { w: 6.4, d: 6.4, h: 1.2, curve: 0.2, thickness: 0.18, segs: 3 }, mat('#d9884b'), 0, 10.2, 0);
  // Fire bell (hanshō)
  cyl(g, 0.3, 0.38, 0.5, mat('#7a6a3a', { metalness: 0.6 }), 0, 12.0, 0, 10);
  return g;
}

/** Big town gate with a curved roof, flanked by plaster walls. */
function townGate(parent, x, z) {
  const g = group(parent, x, 0, z, Math.PI / 2);
  const posts = mat('#5a2c19');
  for (const sx of [-3.2, 3.2]) for (const sz of [-0.9, 0.9]) box(g, 0.45, 5.2, 0.45, posts, sx, 0, sz);
  box(g, 7.4, 0.5, 2.4, posts, 0, 4.7, 0);
  box(g, 6, 1.2, 0.3, mat(C.plaster), 0, 4.0, 0);
  // Open door leaves
  for (const sx of [-1, 1]) {
    const leaf = box(g, 2.8, 3.8, 0.18, mat('#8a5a33'), 0, 0, 0);
    leaf.position.set(sx * 3.0, 1.9, -1.6);
    leaf.rotation.y = sx * 1.3;
    for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) ball(leaf, 0.07, mat('#2b2b2b'), -1 + c * 0.66, -1.2 + r * 1.2, 0.1);
  }
  roof(g, { w: 10, d: 5.4, h: 2.4, curve: 0.65, lift: 1.0, thickness: 0.3, segs: 6 }, mat('#e9e6e0'), 0, 5.2, 0, mat('#5a5a5a'));
  sign(g, 'ようこそ', 1.8, 0.6, { bg: '#2d221c', fg: '#e8c88a', font: FONT_SERIF }, 0, 4.3, 1.25);
  P.wall(parent, x, z + 4, x, 13, 2.2);
  P.wall(parent, x, z - 4, x, -13, 2.2);
  return g;
}

/** Open pavilion with banners and a gong (from the asset sheet). */
function pavilion(parent, x, z) {
  const g = group(parent, x, 0, z, 0.3);
  box(g, 6, 0.5, 6, mat(C.woodLight), 0, 0, 0);
  for (const cx of [-2.6, 2.6]) for (const cz of [-2.6, 2.6]) box(g, 0.25, 3.2, 0.25, mat(C.woodDark), cx, 0.5, cz);
  roof(g, { w: 7.6, d: 7.6, h: 2.2, curve: 0.5, lift: 0.4, thickness: 0.2, segs: 4 }, mat('#d9884b'), 0, 3.7, 0);
  cyl(g, 0.08, 0.15, 0.8, mat(C.woodDark), 0, 5.8, 0, 6);
  P.nobori(g, 3.8, 1.5, 'まつり', '#f1e8d5', C.vermilion);
  P.nobori(g, 3.8, -0.5, '日本', '#2f3b5c', '#f2e6c8');
  const gong = group(g, -4, 0, 0, Math.PI / 2);
  for (const sx of [-0.8, 0.8]) box(gong, 0.15, 2, 0.15, mat(C.woodLight), sx, 0, 0);
  box(gong, 1.9, 0.18, 0.18, mat(C.woodLight), 0, 2, 0);
  const disc = cyl(gong, 0.5, 0.5, 0.08, mat('#b08d3a', { metalness: 0.7, roughness: 0.35 }), 0, 1.2, 0, 16);
  disc.rotation.x = Math.PI / 2;
  return g;
}

function well(parent, x, z) {
  const g = group(parent, x, 0, z);
  cyl(g, 0.9, 0.9, 0.9, mat(C.stone), 0, 0, 0, 10);
  cyl(g, 0.7, 0.7, 0.05, mat('#2f5f73'), 0, 0.88, 0, 10);
  for (const sx of [-0.8, 0.8]) box(g, 0.12, 2.0, 0.12, mat(C.woodDark), sx, 0.9, 0);
  roof(g, { w: 2.2, d: 1.6, h: 0.6, gable: true, curve: 0, thickness: 0.1, segs: 2 }, mat(C.roofSlate), 0, 2.9, 0);
  box(g, 0.25, 0.3, 0.25, mat(C.woodLight), 0.2, 0.95, 0.2);
  return g;
}

/** "Welcome to Japan" board, a wink to the paper model in the references. */
function welcomeBoard(parent, x, z) {
  const g = group(parent, x, 0, z, -0.5);
  for (const sx of [-0.7, 0.7]) box(g, 0.08, 1.2, 0.08, mat('#555'), sx, 0, 0);
  sign(g, 'WELCOME\nTO JAPAN', 1.6, 0.8, { bg: '#2c5aa0', fg: '#ffffff', weight: 900 }, 0, 1.2, 0.05);
  const flag = sign(g, '', 1.0, 0.65, { bg: '#ffffff' }, 0, 2.0, 0.05);
  const sun = new THREE.Mesh(new THREE.CircleGeometry(0.2, 20), mat('#c8102e', { flatShading: false }));
  sun.position.set(0, 0, 0.07);
  flag.add(sun);
  return g;
}

