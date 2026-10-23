import * as THREE from 'three';
import { C, mat, glowMat } from '../core/materials.js';
import { THEME, tint } from '../core/palette.js';
import { box, cyl, ball, group, beam, rng, pick } from '../core/geo.js';
import { roof } from '../core/roof.js';
import { sign, FONT_SERIF } from '../core/signs.js';
import { WORLD, RIVER, FUJI, LAKE, CASTLE, PADDIES, VILLAGE, AVENUES, COAST, FUJI_LAKE, CHUREITO } from './layout.js';
import { waterMaterial } from './terrain.js';
import { machiya } from './oldtown.js';
import * as P from './props.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

/**
 * Everything west of the original old town: Mount Fuji with its forested
 * foothills and lake, a village along the main street, rice paddies with
 * farmhouses, the castle with its moat, and the paths and bridges that tie
 * the outskirts to the river.
 */
export function buildOutskirts(root) {
  const rand = rng(2024);
  grounds(root);
  fuji(root);
  forest(root, rand);
  lake(root, rand);
  village(root, rand);
  paddies(root, rand);
  castle(root, CASTLE.x, CASTLE.z);
  paths(root, rand);
}

function slab(parent, x0, x1, y0, y1, z0, z1, material) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), material);
  m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  parent.add(m);
  return m;
}

function grounds(root) {
  const grass = mat(C.grass);
  const dark = mat(C.grassDark);
  slab(root, WORLD.x0, -60, 0, 0.04, WORLD.z0, -6, dark); // Fuji foothills
  slab(root, -60, RIVER.x0, 0, 0.04, WORLD.z0, -42, dark);
  slab(root, -150, -62, 0, 0.04, 28, 104, grass); // paddy country
  slab(root, -60, RIVER.x0, 0, 0.04, 44, COAST, grass); // castle park
}

// ---------------------------------------------------------------------------
// Mount Fuji: a concave lathe profile with ridges, a jagged snow cap drawn in
// vertex colours and a forest belt on the lower slopes.

const fujiRadiusAt = (t) => 3.5 + (FUJI.r - 3.5) * Math.pow(1 - t, 1.8);
const fujiHeightAt = (r) => FUJI.h * (1 - Math.pow(Math.max(0, (r - 3.5) / (FUJI.r - 3.5)), 1 / 1.8));

function fuji(root) {
  const N = 28;
  const pts = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    pts.push(new THREE.Vector2(fujiRadiusAt(t), FUJI.h * t));
  }
  const geo = new THREE.LatheGeometry(pts, 72);
  const pos = geo.attributes.position;
  const colors = [];
  const pastel = THEME !== 'classic';
  const snow = new THREE.Color(pastel ? '#f7faff' : '#f8f9fb');
  const rock = new THREE.Color(pastel ? '#7d97cf' : '#5d6b80');
  const foot = new THREE.Color(pastel ? '#93b2c4' : '#6c8a5c');
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i),
      y = pos.getY(i),
      z = pos.getZ(i);
    const a = Math.atan2(z, x);
    const t = y / FUJI.h;
    // ridges and gullies running down the flanks
    const ridge = 1 + 0.035 * Math.sin(a * 11 + t * 3) + 0.02 * Math.sin(a * 23) * (1 - t);
    pos.setXYZ(i, x * ridge, y, z * ridge);
    // snow line with long fingers reaching down the gullies
    const line = 0.6 + 0.09 * Math.sin(a * 11 + 0.6) + 0.05 * Math.sin(a * 5 + 2) + 0.03 * Math.sin(a * 29);
    if (t > line) c.copy(snow);
    else if (t > line - 0.05) c.copy(rock).lerp(snow, (t - line + 0.05) / 0.05);
    else if (t < 0.18) c.copy(foot).lerp(rock, t / 0.18);
    else c.copy(rock);
    colors.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.9 }));
  m.position.set(FUJI.x, 0, FUJI.z);
  m.userData.keepSeparate = true;
  root.add(m);
  // Crater rim
  const crater = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 3.6, 0.6, 24), mat('#eef1f5'));
  crater.position.set(FUJI.x, FUJI.h - 0.6, FUJI.z);
  root.add(crater);
}

export function cedar(parent, x, y, z, s, rand) {
  const g = group(parent, x, y, z);
  g.scale.setScalar(s);
  cyl(g, 0.12, 0.18, 1.0, mat('#5b4433'), 0, 0, 0, 5);
  const needles = mat(pick(rand, ['#3f6b45', '#4a7a4f', '#365e3d']));
  const c1 = new THREE.Mesh(new THREE.ConeGeometry(1.1, 2.6, 7), needles);
  c1.position.y = 2.0;
  g.add(c1);
  const c2 = new THREE.Mesh(new THREE.ConeGeometry(0.8, 2.0, 7), needles);
  c2.position.y = 3.2;
  g.add(c2);
  return g;
}

function forest(root, rand) {
  const clear = (x, z) =>
    Math.hypot((x - LAKE.x) / (LAKE.rx + 2), (z - LAKE.z) / (LAKE.rz + 2)) < 1 ||
    Math.hypot((x - FUJI_LAKE.x) / (FUJI_LAKE.rx + 2), (z - FUJI_LAKE.z) / (FUJI_LAKE.rz + 2)) < 1 ||
    Math.hypot(x - CHUREITO.x, z - CHUREITO.z) < 20;
  // Belt on the lower slopes of Fuji
  for (let i = 0; i < 700; i++) {
    const a = rand() * Math.PI * 2;
    const r = FUJI.r * (0.62 + rand() * 0.48);
    const x = FUJI.x + Math.cos(a) * r;
    const z = FUJI.z + Math.sin(a) * r;
    if (x < WORLD.x0 + 1.5 || z < WORLD.z0 + 1.5 || x > -58 || z > -8) continue;
    if (clear(x, z)) continue;
    const y = r < FUJI.r ? fujiHeightAt(r * 0.97) : 0;
    cedar(root, x, y - 0.2, z, 0.8 + rand() * 0.6, rand);
  }
  // Woods north of the shrine
  for (let i = 0; i < 140; i++) {
    const x = -84 + rand() * 76;
    const z = WORLD.z0 + 2 + rand() * (WORLD.z1 - WORLD.z0);
    if (z > -44 || Math.abs(z - AVENUES[1].z0 - 3) < 4 || clear(x, z)) continue;
    if (Math.hypot(x - FUJI.x, z - FUJI.z) < FUJI.r * 0.95) continue;
    cedar(root, x, 0, z, 0.8 + rand() * 0.5, rand);
  }
}

function lake(root, rand) {
  const w = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.12, 28), waterMaterial);
  w.scale.set(LAKE.rx, 1, LAKE.rz);
  w.position.set(LAKE.x, 0.08, LAKE.z);
  w.userData.keepSeparate = true;
  root.add(w);
  for (let i = 0; i < 34; i++) {
    const a = (i / 34) * Math.PI * 2;
    P.rock(root, LAKE.x + Math.cos(a) * (LAKE.rx + 0.4), LAKE.z + Math.sin(a) * (LAKE.rz + 0.4), 0.4 + rand() * 0.4, rand);
  }
  P.torii(root, LAKE.x + 4, LAKE.z + 1, -0.4, 0.9);
  // Little jetty with a rowing boat
  const j = group(root, LAKE.x - 3, 0, LAKE.z + LAKE.rz - 1.5, 0.3);
  box(j, 1.6, 0.15, 5, mat(C.woodLight), 0, 0.3, -1.5);
  for (const dz of [-3.6, -1.5, 0.6]) for (const dx of [-0.7, 0.7]) box(j, 0.15, 0.5, 0.15, mat(C.woodDark), dx, -0.1, dz);
  const boat = group(root, LAKE.x - 1, 0.12, LAKE.z + 1.5, 0.9);
  box(boat, 1.0, 0.35, 2.6, mat(C.wood), 0, 0, 0);
  box(boat, 0.8, 0.1, 2.3, mat(C.woodDark), 0, 0.3, 0);
}

// ---------------------------------------------------------------------------

function village(root, rand) {
  const shops = ['そば', '米', '魚', '八百屋', '豆腐', '団子', '茶', '酒'];
  const walls = [C.wood, C.woodLight, '#c98a52', '#d59c62', C.woodDark];
  const roofs = [C.roofSlate, C.roofTeal, C.roofGray];
  for (let x = VILLAGE.x0 + 4; x < VILLAGE.x1 - 2; x += 8.5) {
    for (const [z, ry] of [
      [-7.2, 0],
      [7.8, Math.PI],
      [21, Math.PI],
    ]) {
      if (rand() < 0.12) continue;
      const shop = z !== 21 && rand() < 0.45 ? pick(rand, shops) : null;
      machiya(root, x + (rand() - 0.5), z, ry, {
        w: 5.5 + rand() * 1.5,
        d: 5 + rand(),
        floors: rand() < 0.55 ? 2 : 1,
        wall: pick(rand, walls),
        roofColor: pick(rand, roofs),
        sign: shop,
        noren: shop,
      });
    }
  }
  // Back lane for the second row
  slab(root, VILLAGE.x0, VILLAGE.x1, 0, 0.05, 13.5, 16.5, mat(C.path));
  for (let x = VILLAGE.x0 + 8; x < VILLAGE.x1; x += 17) {
    P.sakura(root, x, 15, 0.9, rand);
    P.stoneLantern(root, x + 4, 3.6);
  }
  const tops = [];
  for (let x = VILLAGE.x0 + 6; x < VILLAGE.x1; x += 11) tops.push(P.utilityPole(root, x, 3.4, 7));
  P.wires(root, tops);
}

export function farmhouse(parent, x, z, ry) {
  const g = group(parent, x, 0, z, ry);
  box(g, 9, 0.4, 7, mat(C.stoneDark), 0, 0, 0);
  box(g, 8.2, 2.6, 6.2, mat(C.plaster), 0, 0.4, 0);
  for (const sx of [-4, -1.3, 1.3, 4]) box(g, 0.25, 2.6, 0.25, mat(C.woodDark), sx, 0.4, 3.1);
  box(g, 2.2, 2.0, 0.08, mat('#3a2a20'), 0, 0.4, 3.12);
  // Steep thatched roof (kayabuki)
  roof(g, { w: 10.5, d: 8.5, h: 4.6, curve: 0.15, lift: 0, thickness: 0.6, segs: 3 }, mat('#a88b5c'), 0, 3.0, 0, mat('#6b5a3a'));
  return g;
}

function paddies(root, rand) {
  const { x0, x1, z0, z1 } = PADDIES;
  const field = new THREE.MeshStandardMaterial({ color: tint('#7fae86'), roughness: 0.2, metalness: 0.1 });
  const sprout = mat('#8fbf6a');
  const dyke = mat(C.path);
  const cw = 10,
    cd = 8;
  slab(root, x0, x1, 0, 0.06, z0, z1, dyke);
  for (let x = x0 + 0.6; x + cw <= x1; x += cw + 0.8) {
    for (let z = z0 + 0.6; z + cd <= z1; z += cd + 0.8) {
      if (x > x1 - 24 && z < z0 + 18) continue; // farmyard
      const plot = slab(root, x, x + cw, 0.02, 0.1, z, z + cd, field);
      plot.receiveShadow = true;
      // rows of rice seedlings
      if (rand() < 0.7) for (let k = 0.8; k < cw; k += 1.2) slab(root, x + k - 0.12, x + k + 0.12, 0.1, 0.32, z + 0.6, z + cd - 0.6, sprout);
    }
  }
  farmhouse(root, x1 - 12, z0 + 8, Math.PI);
  farmhouse(root, x1 - 12, z0 + 20, Math.PI);
  P.bamboo(root, x1 - 3, z0 + 3, 7, rand);
  // Scarecrows (kakashi)
  for (const [sx, sz] of [
    [x0 + 20, z0 + 30],
    [x0 + 42, z0 + 48],
  ]) {
    const s = group(root, sx, 0.1, sz);
    cyl(s, 0.05, 0.05, 1.8, mat(C.woodDark), 0, 0, 0, 5);
    box(s, 1.4, 0.08, 0.08, mat(C.woodDark), 0, 1.3, 0);
    ball(s, 0.22, mat(C.plaster), 0, 1.75, 0);
    const hat = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.25, 10), mat('#c9a86b'));
    hat.position.y = 2.0;
    s.add(hat);
  }
}

// ---------------------------------------------------------------------------
// Castle (shiro) after the reference model: stone ramparts (ishigaki), a
// plastered perimeter wall with corner turrets, a gatehouse over the moat and
// a four-storey keep (tenshu) with gabled dormers.

function frustum(parent, top, bottom, h, material, x, y, z) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(top / Math.SQRT2, bottom / Math.SQRT2, h, 4), material);
  m.rotation.y = Math.PI / 4;
  m.position.set(x, y + h / 2, z);
  parent.add(m);
  return m;
}

function stoneBase(parent, top, bottom, h, x, y, z) {
  frustum(parent, top, bottom, h, mat('#9a968d'), x, y, z);
  // horizontal courses
  for (let k = 1; k < h / 0.9; k++) {
    const t = (k * 0.9) / h;
    const s = bottom + (top - bottom) * t + 0.04;
    frustum(parent, s, s, 0.06, mat('#7e7a72'), x, y + k * 0.9, z);
  }
}

function turret(parent, x, y, z, s = 1) {
  const g = group(parent, x, y, z);
  g.scale.setScalar(s);
  box(g, 5, 2.6, 5, mat(C.plaster), 0, 0, 0);
  for (const sx of [-1.2, 1.2]) box(g, 0.8, 0.6, 0.08, mat('#3b3b3b'), sx, 1.2, 2.52);
  roof(g, { w: 6.6, d: 6.6, h: 1.0, curve: 0.5, lift: 0.4, thickness: 0.2, segs: 3 }, mat(C.roofSlate), 0, 2.6, 0);
  box(g, 3.6, 2.0, 3.6, mat(C.plaster), 0, 3.0, 0);
  roof(g, { w: 5.2, d: 5.2, h: 1.6, curve: 0.55, lift: 0.5, thickness: 0.2, segs: 4 }, mat(C.roofSlate), 0, 5.0, 0, mat(C.roofGray));
  return g;
}

function gableDormer(parent, w, h, x, y, z, ry = 0) {
  // chidori-hafu: triangular gable facing out from a roof
  const g = group(parent, x, y, z, ry);
  const tri = new THREE.Shape([new THREE.Vector2(-w / 2, 0), new THREE.Vector2(w / 2, 0), new THREE.Vector2(0, h)]);
  const face = new THREE.Mesh(new THREE.ExtrudeGeometry(tri, { depth: 0.3, bevelEnabled: false }), mat(C.plaster));
  g.add(face);
  const s = Math.hypot(w / 2, h);
  for (const sx of [-1, 1]) {
    const b = box(g, s + 0.4, 0.2, 2.2, mat(C.roofSlate), (sx * w) / 4, h / 2 - 0.15, -0.6);
    b.rotation.z = sx * -Math.atan2(h, w / 2);
  }
  return g;
}

function castle(root, x, z) {
  const g = group(root, x, 0, z);
  const m = CASTLE.moat;
  // Moat ring
  const water = waterMaterial;
  for (const [x0, x1, z0, z1] of [
    [-m, m, -m, -m + 3.5],
    [-m, m, m - 3.5, m],
    [-m, -m + 3.5, -m + 3.5, m - 3.5],
    [m - 3.5, m, -m + 3.5, m - 3.5],
  ]) {
    const w = slab(g, x0, x1, 0.02, 0.12, z0, z1, water);
    w.userData.keepSeparate = true;
  }
  // Ramparts and perimeter wall
  const inner = m - 4.5;
  stoneBase(g, inner * 2 - 1.5, inner * 2, 3, 0, 0, 0);
  const top = 3;
  const wh = 2.4;
  for (const [ax, az, bx, bz] of [
    [-inner + 1, -inner + 1, -3.5, -inner + 1],
    [3.5, -inner + 1, inner - 1, -inner + 1],
    [inner - 1, -inner + 1, inner - 1, inner - 1],
    [inner - 1, inner - 1, -inner + 1, inner - 1],
    [-inner + 1, inner - 1, -inner + 1, -inner + 1],
  ]) {
    const w = P.wall(g, ax, az, bx, bz, wh);
    w.position.y = top;
  }
  for (const [cx, cz] of [
    [-inner + 2, -inner + 2],
    [inner - 2, inner - 2],
    [-inner + 2, inner - 2],
  ])
    turret(g, cx, top, cz, 0.9);
  // Gatehouse facing the town (north) and a bridge over the moat
  const gate = group(g, 0, top, -inner + 1);
  for (const sx of [-2.6, 2.6]) box(gate, 1.2, 3.2, 2.4, mat(C.plaster), sx, 0, 0);
  box(gate, 6.4, 1.6, 2.6, mat(C.plaster), 0, 3.2, 0);
  for (const sx of [-1.4, 1.4]) box(gate, 0.6, 0.5, 0.08, mat('#3b3b3b'), sx, 3.7, -1.32);
  roof(gate, { w: 8, d: 4.4, h: 1.8, curve: 0.55, lift: 0.5, thickness: 0.22, segs: 4 }, mat(C.roofSlate), 0, 4.8, 0, mat(C.roofGray));
  sign(gate, '城', 0.9, 0.9, { bg: '#2d221c', fg: '#e8c88a', font: FONT_SERIF }, 0, 3.3, -1.35, Math.PI);
  const bridge = group(g, 0, 0, -m + 1.75);
  box(bridge, 4, 0.3, 6, mat(C.woodLight), 0, 0.7, -0.5);
  for (const sx of [-1.9, 1.9]) {
    box(bridge, 0.15, 0.9, 6, mat(C.woodDark), sx, 1.0, -0.5);
    for (const dz of [-3, 2]) box(bridge, 0.25, 1.0, 0.25, mat(C.woodDark), sx, -0.1, dz);
  }

  // Keep (tenshu) on its own raised base, set towards the south of the bailey
  const kz = 3;
  stoneBase(g, 14, 17, 4, 0, top, kz);
  let y = top + 4;
  const tiers = [
    [13, 11, 3.4],
    [11, 9, 3.0],
    [8.6, 7, 2.8],
    [6.4, 5.2, 2.8],
  ];
  tiers.forEach(([w, d, h], i) => {
    box(g, w, h, d, mat(C.plaster), 0, y, kz);
    // dark window bands
    for (const sz of [-1, 1]) for (let k = -1; k <= 1; k++) box(g, w * 0.12, 0.7, 0.08, mat('#3b3b3b'), (k * w) / 3.5, y + h * 0.45, kz + (sz * d) / 2 + sz * 0.02);
    const last = i === tiers.length - 1;
    const rw = w + 2.6,
      rd = d + 2.6;
    roof(g, { w: rw, d: rd, h: last ? 2.6 : 1.6, curve: 0.55, lift: 0.6, thickness: 0.25, segs: 5 }, mat(C.roofSlate), 0, y + h, kz, last ? mat(C.roofGray) : null);
    if (i < 2) {
      // gabled dormers on the north and south roofs
      gableDormer(g, w * 0.45, 1.6, 0, y + h + 0.1, kz - rd / 2 + 1.0, Math.PI);
      gableDormer(g, w * 0.45, 1.6, 0, y + h + 0.1, kz + rd / 2 - 1.0, 0);
    }
    if (i === 1) {
      // curved karahafu-style gable over the main face
      const arch = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.25, 6, 16, Math.PI), mat(C.roofSlate));
      arch.position.set(0, y + h + 1.2, kz - rd / 2 + 0.6);
      arch.scale.set(1.2, 0.6, 1);
      g.add(arch);
    }
    y += h + (last ? 0 : 0.8);
  });
  // Shachihoko ornaments on the top ridge
  for (const sx of [-1, 1]) {
    const s = box(g, 0.35, 1.0, 0.5, mat('#c9a227', { metalness: 0.6, roughness: 0.4 }), sx * 1.4, y + 2.4, kz);
    s.rotation.z = -sx * 0.4;
  }
  // Pines in the bailey and banners on the wall
  const rand = rng(88);
  for (const [px, pz] of [
    [-9, -6],
    [9, -7],
    [-10, 9],
    [10, 10],
  ])
    P.pine(g, px, pz, 1.1, rand).position.y = top;
  for (const px of [-10, -6, 6, 10]) P.nobori(g, px, -inner + 2.5, '城', '#f1e8d5', C.vermilion).position.y = top;
  for (const [lx, lz] of [
    [-3, -8],
    [3, -8],
  ])
    P.stoneLantern(g, lx, lz).position.y = top;
}

// ---------------------------------------------------------------------------

/** Gravel paths and bridges linking the outskirts to the river crossings. */
function paths(root, rand) {
  const gravel = mat('#d8cbb0');
  const north = AVENUES[1];
  const south = AVENUES[2];
  // South path: bridge → castle gate
  slab(root, CASTLE.x - 3, RIVER.x0, 0, 0.06, south.z0 + 0.5, south.z1 - 0.5, gravel);
  // North path: bridge → lake and Fuji trailhead
  slab(root, LAKE.x + LAKE.rx, RIVER.x0, 0, 0.06, north.z0 + 0.5, north.z1 - 0.5, gravel);
  slab(root, LAKE.x + LAKE.rx - 3, LAKE.x + LAKE.rx, 0, 0.06, north.z0 + 0.5, LAKE.z - LAKE.rz, gravel);
  for (const a of [north, south]) flatBridge(root, (a.z0 + a.z1) / 2);
  // Trailhead torii and lanterns on the north path
  P.torii(root, -40, (north.z0 + north.z1) / 2, Math.PI / 2, 0.9);
  for (let x = -34; x < -8; x += 6) {
    P.stoneLantern(root, x, north.z0 - 0.5, 0.8);
    P.stoneLantern(root, x, north.z1 + 0.5, 0.8);
  }
  for (let x = -24; x < -8; x += 7) P.sakura(root, x, south.z1 + 2.5, 1.0, rand);
}

export function flatBridge(root, z) {
  const g = group(root, 0, 0, z);
  const span = RIVER.x1 - RIVER.x0 + 4;
  box(g, span, 0.3, 4.6, mat(C.woodLight), 0, 0.1, 0);
  for (const sz of [-2.2, 2.2]) {
    box(g, span, 0.12, 0.12, mat(C.woodDark), 0, 1.05, sz);
    for (let x = -span / 2; x <= span / 2; x += 2.4) box(g, 0.14, 1.0, 0.14, mat(C.woodDark), x, 0.1, sz);
  }
  for (const x of [-3, 0, 3]) for (const sz of [-1.8, 1.8]) cyl(g, 0.16, 0.16, 2.2, mat(C.woodDark), x, RIVER.bed, sz, 6);
}
