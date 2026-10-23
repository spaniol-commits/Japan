import * as THREE from 'three';
import { mat, glowMat, glow } from '../core/materials.js';
import { box, cyl, ball, group, beam, rng, pick } from '../core/geo.js';
import { waterMaterial } from './terrain.js';
import { roof } from '../core/roof.js';
import { sign } from '../core/signs.js';
import { tint, tintGlow } from '../core/palette.js';
import { LOC } from '../locations.js';
import { WORLD, RIVER, AVENUE, AVENUES, STREETS, BLOCKS, SIDEWALK_H, RAIL, PARKS, SKYTREE, ARCADE, FUKUYA, COAST } from './layout.js';
import * as P from './props.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const Y = SIDEWALK_H;

const WALLS = ['#e4ddd0', '#b8bcc0', '#8e9aa6', '#f1ece2', '#c7735a', '#a9c0d4', '#dcc39c', '#7d8a96', '#e8b4a0', '#c9d8c5', '#f3e2c2', '#9c6b5a'];
const SHOP_SIGNS = ['カラオケ', 'カフェ', '薬', '居酒屋', '焼鳥', '本屋', '銀行', 'うどん', 'ドラッグ', '歯科', '不動産', 'ゲームセンター', 'パチンコ', '酒'];
const NEON = [
  ['#ff4f9a', '#ffffff'],
  ['#2e3a8c', '#ffe066'],
  ['#ffd23f', '#c0392b'],
  ['#1f8a70', '#ffffff'],
  ['#e8443a', '#ffffff'],
  ['#ffffff', '#2c3e9f'],
];

/** Modern Tokyo district east of the river. */
export function buildModern(root) {
  const rand = rng(1234);

  const reserved = [
    rect(LOC.konbini.pos, 10.5, 7.5),
    rect(LOC.koban.pos, 6.5, 6),
    rect(LOC.hotel.pos, 11.5, 11.5),
    { x0: 26, x1: 40, z0: AVENUES[1].z1, z1: AVENUE.z0 }, // station + plaza
    { x0: RAIL.x0, x1: RAIL.x1, z0: RAIL.z - 3.6, z1: RAIL.z + 3.6 }, // under the viaduct
    rect([SKYTREE.x, SKYTREE.z], 16, 16),
    ...PARKS,
    { x0: ARCADE.x0 - 2, x1: ARCADE.x1 + 2, z0: ARCADE.z0 - 5.5, z1: ARCADE.z1 + 5.5 }, // shopping arcade
    rect([FUKUYA.x, FUKUYA.z], 13, 11),
  ];

  for (const b of BLOCKS) fillBlock(root, b.x0, b.x1, b.z0, b.z1, reserved, rand);

  konbini(root, ...LOC.konbini.pos, Math.PI);
  koban(root, ...LOC.koban.pos, 0);
  hotel(root, ...LOC.hotel.pos);
  station(root, ...LOC.eki.pos);
  stationPlaza(root, rand);
  viaduct(root);
  skytree(root, SKYTREE.x, SKYTREE.z);
  for (const p of PARKS) park(root, p, rand);
  streetFurniture(root, rand);
}

const rect = ([x, z], w, d) => ({ x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2 });
const overlaps = (a, b) => a.x0 < b.x1 && a.x1 > b.x0 && a.z0 < b.z1 && a.z1 > b.z0;

/** Pack a block with mid-rise buildings, leaving reserved lots and the rail corridor free. */
function fillBlock(root, bx0, bx1, bz0, bz1, reserved, rand) {
  const inset = 1.3;
  const x0 = bx0 + inset,
    x1 = bx1 - inset;
  const z0 = bz0 + inset,
    z1 = bz1 - inset;
  const nx = Math.max(1, Math.round((x1 - x0) / 6.5));
  const nz = Math.max(1, Math.round((z1 - z0) / 7));
  const cw = (x1 - x0) / nx;
  const cd = (z1 - z0) / nz;
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < nz; j++) {
      const lot = { x0: x0 + i * cw, x1: x0 + (i + 1) * cw, z0: z0 + j * cd, z1: z0 + (j + 1) * cd };
      if (reserved.some((r) => overlaps(lot, r))) continue;
      const w = cw - 0.4 - rand() * 0.8;
      const d = cd - 0.4 - rand() * 0.8;
      const cx = (lot.x0 + lot.x1) / 2;
      const cz = (lot.z0 + lot.z1) / 2;
      // Low near the river, rising to a skyscraper core downtown
      const core = Math.max(0, 1 - Math.hypot(cx - 82, cz * 1.4) / 85, 0.9 - Math.hypot(cx - 225, (cz + 140) * 1.2) / 80);
      const h = 5 + rand() * 11 + core * core * (8 + rand() * 42) + Math.min(cx, 40) * 0.08;
      // Which face looks onto a road? Prefer an avenue.
      const faces = [];
      if (lot.z0 - bz0 < 2 && AVENUES.some((a) => a.z1 === bz0)) faces.push(Math.PI); // −z towards avenue
      if (bz1 - lot.z1 < 2 && AVENUES.some((a) => a.z0 === bz1)) faces.push(0);
      if (lot.x0 - bx0 < 2 && STREETS.some((s) => s.x1 === bx0)) faces.push(-Math.PI / 2);
      if (bx1 - lot.x1 < 2 && STREETS.some((s) => s.x0 === bx1)) faces.push(Math.PI / 2);
      office(root, cx, cz, w, d, h, rand, faces[0]);
    }
  }
}

// ---------------------------------------------------------------------------
// Facade textures: a 4x4 tile of windows, plus a matching emissive map where a
// random subset of windows is lit at night.

const facadeCache = new Map();
function facadeTextures(wall) {
  if (facadeCache.has(wall)) return facadeCache.get(wall);
  const N = 4,
    S = 64;
  const make = (draw) => {
    const c = document.createElement('canvas');
    c.width = c.height = N * S;
    draw(c.getContext('2d'));
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  };
  const rand = rng(wall.length * 977 + wall.charCodeAt(1));
  const map = make((ctx) => {
    ctx.fillStyle = tint(wall);
    ctx.fillRect(0, 0, N * S, N * S);
    for (let i = 0; i < N; i++)
      for (let j = 0; j < N; j++) {
        const x = i * S,
          y = j * S;
        const g = ctx.createLinearGradient(x, y, x + S, y + S);
        g.addColorStop(0, tint('#5d7387'));
        g.addColorStop(1, tint('#2b3846'));
        ctx.fillStyle = g;
        ctx.fillRect(x + 10, y + 12, S - 20, S - 24);
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(x + 8, y + S - 12, S - 16, 4);
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.fillRect(x + 31, y + 12, 2, S - 24);
      }
  });
  const emissive = make((ctx) => {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, N * S, N * S);
    for (let i = 0; i < N; i++)
      for (let j = 0; j < N; j++) {
        if (rand() > 0.5) continue;
        ctx.fillStyle = tintGlow(rand() > 0.3 ? '#ffd79a' : '#d6ecff');
        ctx.fillRect(i * S + 10, j * S + 12, S - 20, S - 24);
      }
  });
  const res = { map, emissive };
  facadeCache.set(wall, res);
  return res;
}

// One material per wall colour; each box scales its own UVs so the window grid
// matches its size. Shared materials let the whole skyline merge into a handful
// of draw calls.
const facadeMats = new Map();
function facadeMaterial(wall) {
  if (!facadeMats.has(wall)) {
    const { map, emissive } = facadeTextures(wall);
    const material = new THREE.MeshStandardMaterial({ map, emissive: '#ffffff', emissiveMap: emissive, roughness: 0.7 });
    glow(material, 0.55, 0);
    facadeMats.set(wall, material);
  }
  return facadeMats.get(wall);
}

let facadeSeed = 1;
/** Facade box with windows on every side and a plain roof. */
function towerBox(parent, w, h, d, wall, x, y, z) {
  const floors = Math.max(1, Math.round(h / 3));
  const colsX = Math.max(1, Math.round(d / 2.4));
  const colsZ = Math.max(1, Math.round(w / 2.4));
  const geo = new THREE.BoxGeometry(w, h, d);
  const uv = geo.attributes.uv;
  // Offset by whole windows so neighbouring buildings light up differently at night
  const ou = ((facadeSeed = (facadeSeed * 7 + 3) % 16) % 4) / 4;
  const ov = Math.floor(facadeSeed / 4) / 4;
  for (let f = 0; f < 6; f++) {
    const [su, sv] = f < 2 ? [colsX / 4, floors / 4] : f < 4 ? [0, 0] : [colsZ / 4, floors / 4];
    for (let v = 0; v < 4; v++) {
      const i = f * 4 + v;
      uv.setXY(i, uv.getX(i) * su + ou, uv.getY(i) * sv + ov);
    }
  }
  const fac = facadeMaterial(wall);
  const roofM = mat('#8e9194');
  const m = new THREE.Mesh(geo, [fac, fac, roofM, roofM, fac, fac]);
  m.position.set(x, y + h / 2, z);
  parent.add(m);
  return m;
}

/** Generic mid-rise: shopfront ground floor, windowed tower, rooftop clutter, maybe a sign. */
function office(parent, x, z, w, d, h, rand, face) {
  const g = group(parent, x, Y, z);
  const wall = pick(rand, WALLS);
  const shopH = 3.2;
  // Shop floor: dark frame with a glowing glass front
  box(g, w, shopH, d, mat('#4a4d52'), 0, 0, 0);
  const glass = glowMat('#9fb8c8', pick(rand, ['#e8b36a', '#9fc4e8', '#e89ab4']), 0.75, 0.05);
  box(g, w - 0.4, shopH - 0.9, 0.06, glass, 0, 0.2, d / 2 + 0.01);
  box(g, w - 0.4, shopH - 0.9, 0.06, glass, 0, 0.2, -d / 2 - 0.01);
  box(g, 0.06, shopH - 0.9, d - 0.4, glass, w / 2 + 0.01, 0.2, 0);
  box(g, 0.06, shopH - 0.9, d - 0.4, glass, -w / 2 - 0.01, 0.2, 0);
  towerBox(g, w, h - shopH, d, wall, 0, shopH, 0);

  // Setback penthouse on some taller buildings
  let top = h;
  if (h > 14 && rand() > 0.5) {
    const pw = w * 0.6,
      pd = d * 0.6;
    towerBox(g, pw, 3, pd, wall, (rand() - 0.5) * (w - pw) * 0.5, h, (rand() - 0.5) * (d - pd) * 0.5);
  }
  rooftop(g, w, d, top, rand);

  if (face !== undefined) {
    const f = group(g, 0, 0, 0, face);
    const along = face === 0 || face === Math.PI ? w : d;
    const depth = face === 0 || face === Math.PI ? d : w;
    // Awning over the shop
    box(f, along * 0.8, 0.15, 1.1, mat(pick(rand, ['#c0392b', '#2e86ab', '#3d9970', '#f39c12', '#6c5b7b'])), 0, shopH - 0.35, depth / 2 + 0.55);
    // Vertical neon sign at the corner
    const [bg, fg] = pick(rand, NEON);
    const text = pick(rand, SHOP_SIGNS);
    const sh = Math.min(h - shopH - 1, 1.1 * [...text].length + 0.8);
    if (sh > 2.5) sign(f, text, 1.0, sh, { bg, fg, lit: 1.6, vertical: true, backFace: true }, along / 2 - 0.7, shopH + 0.6, depth / 2 + 0.6, Math.PI / 2);
  }
  return g;
}

function rooftop(g, w, d, h, rand) {
  const parapet = mat('#c9c7c2');
  box(g, w, 0.5, 0.15, parapet, 0, h, d / 2 - 0.07);
  box(g, w, 0.5, 0.15, parapet, 0, h, -d / 2 + 0.07);
  box(g, 0.15, 0.5, d, parapet, w / 2 - 0.07, h, 0);
  box(g, 0.15, 0.5, d, parapet, -w / 2 + 0.07, h, 0);
  const ac = mat('#e6e6e2');
  const n = 1 + Math.floor(rand() * 3);
  for (let i = 0; i < n; i++) {
    const ax = (rand() - 0.5) * (w - 2);
    const az = (rand() - 0.5) * (d - 2);
    box(g, 1.0, 0.7, 0.6, ac, ax, h, az);
    cyl(g, 0.22, 0.22, 0.05, mat('#555'), ax, h + 0.7, az, 10);
  }
  const r = rand();
  if (r < 0.35) {
    // water tank on legs
    const tx = (rand() - 0.5) * (w - 3);
    const tz = (rand() - 0.5) * (d - 3);
    for (const lx of [-0.5, 0.5]) for (const lz of [-0.5, 0.5]) box(g, 0.1, 1, 0.1, mat('#777'), tx + lx, h, tz + lz);
    cyl(g, 0.8, 0.8, 1.4, mat('#cfd6db'), tx, h + 1, tz, 12);
  } else if (r < 0.6) {
    box(g, 2.2, 2.4, 2.2, mat('#d1cdc6'), (rand() - 0.5) * (w - 3), h, (rand() - 0.5) * (d - 3)); // stair house
  } else if (r < 0.75) {
    cyl(g, 0.05, 0.05, 4, mat('#999'), w / 2 - 1, h, d / 2 - 1, 4);
    const dish = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 4, 0, Math.PI * 2, 0, 1.1), mat('#eee'));
    dish.position.set(-w / 2 + 1.2, h + 0.6, -d / 2 + 1.2);
    dish.rotation.x = -0.8;
    g.add(dish);
  }
  if (h > 10 && rand() < 0.3) billboard(g, w, d, h, rand);
}

/** Rooftop billboard on a steel frame, like the pink one in the reference. */
function billboard(g, w, d, h, rand) {
  const bw = Math.min(w - 1, 6);
  const f = group(g, 0, h, -d / 2 + 1.2, 0);
  for (const sx of [-bw / 2 + 0.4, bw / 2 - 0.4]) {
    box(f, 0.15, 3, 0.15, mat('#5a5f66'), sx, 0, 0);
    beam(f, V(sx, 0, -1), V(sx, 2.5, 0), 0.1, mat('#5a5f66'));
  }
  const ads = [
    ['東京', '#ff5fa2', '#ffffff'],
    ['カラオケ', '#ffd23f', '#d6336c'],
    ['ラーメン', '#e8443a', '#fff3c4'],
    ['カフェ', '#2a9d8f', '#ffffff'],
    ['日本', '#2e3a8c', '#ffffff'],
  ];
  const [text, bg, fg] = pick(rand, ads);
  sign(f, text, bw, 3, { bg, fg, lit: 1.4, depth: 0.25, vertical: false, backFace: true }, 0, 1.8, 0.1);
}

// ---------------------------------------------------------------------------
// Landmarks for the lessons

function konbini(parent, x, z, ry) {
  const g = group(parent, x, Y, z, ry);
  box(g, 9, 3.8, 6, mat('#f7f7f4'), 0, 0, 0);
  box(g, 8.4, 2.4, 0.08, glowMat('#cfe7f3', '#9fc9ec', 0.6, 0.1), 0, 0.15, 3.01);
  box(g, 1.6, 2.3, 0.1, mat('#5d6d7a'), 2.6, 0.15, 3.05);
  // Signature colour stripes
  box(g, 9.05, 0.3, 6.05, mat('#2c7fd1'), 0, 2.65, 0);
  box(g, 9.05, 0.25, 6.05, mat('#2fb35a'), 0, 2.95, 0);
  box(g, 9.05, 0.2, 6.05, mat('#f39c32'), 0, 3.2, 0);
  sign(g, 'コンビニ  24H', 5.2, 0.85, { bg: '#ffffff', fg: '#2c7fd1', lit: 0.9, weight: 900 }, -0.8, 3.8, 3.1);
  for (const ax of [-2.5, 1.5]) box(g, 1.0, 0.7, 0.6, mat('#e6e6e2'), ax, 3.8, -1.5);
  // shelves visible through glass
  for (let i = 0; i < 4; i++) box(g, 1.4, 1.3, 0.4, mat(pick(Math.random, ['#f5c26b', '#e57373', '#81c784', '#64b5f6'])), -3.2 + i * 1.6, 0, 2.3);
  P.vendingMachine(g, -5.2, 2.2, 0, '#d93a3a');
  P.vendingMachine(g, -5.2, 0.9, 0, '#2a6fd6');
  for (let i = 0; i < 3; i++) P.bicycle(g, 2 + i * 0.9, 4.8, Math.PI / 2);
  return g;
}

function koban(parent, x, z, ry) {
  const g = group(parent, x, Y, z, ry);
  box(g, 5, 5.2, 4.2, mat('#8c6f5c'), 0, 0, 0);
  for (let row = 0; row < 12; row++) box(g, 5.02, 0.04, 4.22, mat('#7a5f4d'), 0, row * 0.42 + 0.2, 0);
  box(g, 2.2, 2.6, 0.08, glowMat('#c9dde8', '#fff5d6', 1.6, 0.2), 0, 0, 2.11);
  roof(g, { w: 6, d: 5.2, h: 1.3, gable: true, curve: 0, thickness: 0.2, segs: 2 }, mat('#3e4a52'), 0, 5.2, 0);
  sign(g, '交番', 1.8, 0.7, { bg: '#ffffff', fg: '#1b2a6b', lit: 1.0, weight: 900 }, 0, 3.6, 2.13);
  sign(g, 'KOBAN', 2.2, 0.5, { bg: '#1b2a6b', fg: '#ffffff', lit: 1.0, weight: 900 }, 0, 2.95, 2.13);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 10), glowMat('#ff2a2a', '#ff2a2a', 3.0, 0.8));
  lamp.position.set(1.9, 4.6, 2.3);
  g.add(lamp);
  P.bicycle(g, 2.1, 3.0, 0);
  sign(g, '', 1.2, 1.6, { bg: '#f4f1e6', frame: '#555' }, -2.0, 0.5, 2.6); // map board
  return g;
}

function hotel(parent, x, z) {
  const g = group(parent, x, Y, z);
  box(g, 11, 4, 11, mat('#3f4247'), 0, 0, 0);
  box(g, 10.6, 3.2, 0.08, glowMat('#b8c9d6', '#e8b36a', 0.9, 0.05), 0, 0.2, -5.51);
  towerBox(g, 10, 24, 10, '#e8e3d8', 0, 4, 0);
  box(g, 10.6, 1.2, 10.6, mat('#3f4247'), 0, 28, 0);
  // canopy over the entrance (faces the avenue)
  box(g, 5, 0.25, 3, mat('#b08d57'), 0, 3.2, -6.8);
  for (const sx of [-2.3, 2.3]) box(g, 0.15, 3.2, 0.15, mat('#b08d57'), sx, 0, -8.1);
  sign(g, 'ホテル', 1.6, 7, { bg: '#2b2b4a', fg: '#ffd88a', lit: 1.8, vertical: true, backFace: true }, -5.6, 16, -4, -Math.PI / 2);
  sign(g, 'HOTEL', 6, 1.4, { bg: '#2b2b4a', fg: '#ffd88a', lit: 1.8, weight: 900 }, 0, 29.4, -5.35, Math.PI);
  // helipad
  cyl(g, 3.2, 3.2, 0.1, mat('#5b5f63'), 0, 29.2, 1, 20);
  box(g, 0.4, 0.05, 2.2, mat('#f2f2f2'), -0.8, 29.3, 1);
  box(g, 0.4, 0.05, 2.2, mat('#f2f2f2'), 0.8, 29.3, 1);
  box(g, 1.6, 0.05, 0.4, mat('#f2f2f2'), 0, 29.3, 1);
  return g;
}

function station(parent, x, z) {
  const g = group(parent, x, Y, z);
  const W = 14,
    D = 9,
    H = 7;
  box(g, W, H, D, mat('#d8d2c4'), 0, 0, 0);
  box(g, W - 2, 4.2, 0.08, glowMat('#a9c3d3', '#e8c98a', 0.9, 0.05), 0, 0.2, D / 2 + 0.01);
  for (let i = 0; i <= 6; i++) box(g, 0.2, 4.4, 0.2, mat('#6c7076'), -W / 2 + 1 + (i * (W - 2)) / 6, 0, D / 2 + 0.1);
  box(g, W + 2, 0.4, 3.5, mat('#6c7076'), 0, 4.4, D / 2 + 1.6); // canopy
  sign(g, '駅', 2, 2, { bg: '#1e5aa8', fg: '#ffffff', lit: 1.4, weight: 900 }, -3, H - 2.4, D / 2 + 0.07);
  sign(g, '中央口  STATION', 6.5, 1.0, { bg: '#ffffff', fg: '#1e5aa8', lit: 1.2, weight: 900 }, 2.2, H - 1.9, D / 2 + 0.07);
  // Clock
  const clock = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.15, 24), glowMat('#ffffff', '#fff6e0', 1.0, 0.1));
  clock.rotation.x = Math.PI / 2;
  clock.position.set(-W / 2 + 1.4, H - 1.3, D / 2 + 0.12);
  g.add(clock);
  for (const [len, ang] of [
    [0.55, 0.3],
    [0.4, 2.2],
  ]) {
    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.06, len, 0.03), mat('#222'));
    hand.position.set(-W / 2 + 1.4 + Math.sin(ang) * len * 0.5, H - 1.3 + Math.cos(ang) * len * 0.5, D / 2 + 0.22);
    hand.rotation.z = -ang;
    g.add(hand);
  }
  rooftop(g, W, D, H, rng(9));
  // Connection up to the platform on the viaduct
  box(g, 4, RAIL.deck - H + 0.8, 4, mat('#cfc9bb'), 4, H, -D / 2 + 2);
  return g;
}

function stationPlaza(root, rand) {
  const tile = mat('#d9d2c3');
  box(root, 13.4, 0.04, 17, tile, 33, Y, -14.5);
  for (const [tx, tz] of [
    [28.5, -20],
    [37.5, -20],
    [28.5, -9],
    [37.5, -9],
  ]) {
    box(root, 2, 0.6, 2, mat('#8f8a80'), tx, Y, tz);
    P.tree(root, tx, tz, 1.4, rand).position.y = Y + 0.6;
  }
  // Clock pole in the middle of the plaza
  cyl(root, 0.1, 0.1, 4, mat('#555'), 33, Y, -13, 6);
  const face = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.2, 20), glowMat('#fff', '#fff', 1, 0));
  face.rotation.x = Math.PI / 2;
  face.position.set(33, Y + 4.2, -13);
  root.add(face);
  for (const bx of [30, 36]) P.bench(root, bx, -15.5, 0);
  // Bus stop
  const bs = group(root, 38.8, Y, -7, -Math.PI / 2);
  box(bs, 3, 0.1, 1.2, mat('#5c6b73'), 0, 2.4, 0);
  for (const sx of [-1.4, 1.4]) box(bs, 0.08, 2.4, 0.08, mat('#5c6b73'), sx, 0, -0.5);
  box(bs, 2.8, 1.6, 0.05, mat('#bcd7e6', { transparent: true, opacity: 0.6 }), 0, 0.6, -0.55);
  P.bench(bs, 0, -0.1, 0);
}

function viaduct(root) {
  const concrete = mat('#bdbab3');
  const len = RAIL.x1 - RAIL.x0;
  const cx = (RAIL.x0 + RAIL.x1) / 2;
  box(root, len, 0.9, 6, concrete, cx, RAIL.deck - 0.9, RAIL.z);
  box(root, len, 0.8, 0.25, concrete, cx, RAIL.deck, RAIL.z - 2.9);
  box(root, len, 0.8, 0.25, concrete, cx, RAIL.deck, RAIL.z + 2.9);
  for (let x = RAIL.x0 + 2; x < RAIL.x1; x += 8) {
    if (STREETS.some((s) => x > s.x0 - 1 && x < s.x1 + 1)) continue;
    box(root, 1.4, RAIL.deck - 0.9, 1.6, concrete, x, 0, RAIL.z);
  }
  // Tracks
  const steel = mat('#8a8d91', { metalness: 0.6, roughness: 0.4 });
  for (let x = RAIL.x0; x < RAIL.x1; x += 0.9) box(root, 0.25, 0.1, 2.4, mat('#6b5a4a'), x, RAIL.deck, RAIL.z);
  for (const dz of [-0.75, 0.75]) box(root, len, 0.14, 0.1, steel, cx, RAIL.deck + 0.1, RAIL.z + dz);
  // Buffer stop at the river end
  box(root, 0.6, 1.0, 2.2, mat('#d1352b'), RAIL.x0 + 0.4, RAIL.deck, RAIL.z);
  // Platform with a canopy at the station
  const px = LOC.eki.pos[0];
  box(root, 14, 1.0, 2.2, mat('#cfc9bb'), px, RAIL.deck - 0.3, RAIL.z + 3.9);
  box(root, 14, 0.05, 0.2, mat('#f1c40f'), px, RAIL.deck + 0.7, RAIL.z + 3.0);
  for (let i = 0; i < 4; i++) box(root, 0.15, 2.8, 0.15, mat('#6c7076'), px - 6 + i * 4, RAIL.deck + 0.7, RAIL.z + 4.6);
  box(root, 14.5, 0.2, 3, mat('#6c7076'), px, RAIL.deck + 3.5, RAIL.z + 4);
  sign(root, '駅', 1, 0.6, { bg: '#ffffff', fg: '#1e5aa8', lit: 1.0, weight: 900, backFace: true }, px, RAIL.deck + 2.6, RAIL.z + 4.6);
}

function streetFurniture(root, rand) {
  const inPark = (x, z) => PARKS.some((p) => x > p.x0 && x < p.x1 && z > p.z0 && z < p.z1);
  // Street trees and lamps along the avenues
  for (const a of AVENUES) {
    for (const { x0: bx0, x1: bx1 } of BLOCKS.filter((b) => b.z0 === a.z1)) {
      for (let x = bx0 + 3; x < bx1 - 1.5; x += 7) {
        for (const [z, ry] of [
          [a.z0 - 1.0, Math.PI],
          [a.z1 + 1.0, 0],
        ]) {
          if (x > 26 && x < 40 && z < 0 && z > -10) continue; // station plaza already has trees
          if (Math.abs(x - SKYTREE.x) < 8 && Math.abs(z - SKYTREE.z) < 8) continue;
          if (Math.abs(x - FUKUYA.x) < 7 && Math.abs(z - FUKUYA.z) < 7) continue;
          P.tree(root, x, z, 0.9, rand).position.y = Y;
          if (x + 3.5 < bx1 - 0.5) P.streetLamp(root, x + 3.5, z, ry === 0 ? Math.PI : 0).position.y = Y;
        }
      }
    }
  }
  // Traffic lights at the corners of each intersection on the main avenue
  for (const s of STREETS) {
    P.trafficLight(root, s.x0 - 0.8, AVENUE.z0 - 0.8, Math.PI / 2).position.y = Y;
    P.trafficLight(root, s.x1 + 0.8, AVENUE.z1 + 0.8, -Math.PI / 2).position.y = Y;
    P.trafficLight(root, s.x1 + 0.8, AVENUE.z0 - 0.8, Math.PI).position.y = Y;
    P.trafficLight(root, s.x0 - 0.8, AVENUE.z1 + 0.8, 0).position.y = Y;
  }
  // Lamps along the cross streets
  for (const s of STREETS) {
    for (let z = s.z0 + 4; z < s.z1; z += 11) {
      if (AVENUES.some((a) => z > a.z0 - 3 && z < a.z1 + 3) || Math.abs(z - RAIL.z) < 4) continue;
      P.streetLamp(root, s.x0 - 0.8, z, Math.PI / 2).position.y = Y;
      P.streetLamp(root, s.x1 + 0.8, z, -Math.PI / 2).position.y = Y;
    }
  }
  // Vending machines dotted around — very Japanese
  for (const [x, z, ry, c] of [
    [19.2, 14, -Math.PI / 2, '#2a6fd6'],
    [26.8, 9, Math.PI / 2, '#d93a3a'],
    [45.2, -12, -Math.PI / 2, '#f0f0f0'],
    [46.8, 30, Math.PI / 2, '#2fa35a'],
  ])
    P.vendingMachine(root, x, z, ry, c).position.y = Y;
  // Willow-ish trees on the riverside promenade
  for (let z = WORLD.z0 + 6; z < COAST - 30; z += 12) {
    if (AVENUES.some((a) => z > a.z0 - 2 && z < a.z1 + 2) || Math.abs(z - RAIL.z) < 4) continue;
    P.tree(root, RIVER.x1 + 1, z, 1.1, rand).position.y = Y;
  }
}

/** Broadcast tower in the spirit of Tokyo Skytree: tapered lattice shaft, two observation decks. */
function skytree(root, x, z) {
  const g = group(root, x, Y, z);
  const steel = mat('#e8ecef');
  const dark = mat('#9aa3ab');
  // Tripod base
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    beam(g, V(Math.cos(a) * 7, 0, Math.sin(a) * 7), V(Math.cos(a) * 2.2, 26, Math.sin(a) * 2.2), 0.9, steel);
  }
  // Shaft with lattice rings
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 3.2, 70, 12, 1, true), mat('#dfe5ea', { side: THREE.DoubleSide }));
  shaft.position.y = 35;
  g.add(shaft);
  for (let y = 4; y < 70; y += 3.5) {
    const r = 3.2 - (y / 70) * 1.6 + 0.05;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.1, 4, 12), dark);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = y;
    g.add(ring);
  }
  // Observation decks
  cyl(g, 4.2, 3.6, 4, glowMat('#cfd8df', '#bfe0ff', 1.2, 0.05), 0, 44, 0, 16);
  cyl(g, 4.4, 4.4, 0.6, steel, 0, 48, 0, 16);
  cyl(g, 2.9, 2.6, 2.5, glowMat('#cfd8df', '#bfe0ff', 1.2, 0.05), 0, 60, 0, 16);
  cyl(g, 3.0, 3.0, 0.4, steel, 0, 62.5, 0, 16);
  // Antenna mast
  cyl(g, 0.5, 1.4, 16, steel, 0, 70, 0, 8);
  cyl(g, 0.15, 0.5, 8, dark, 0, 86, 0, 6);
  ball(g, 0.4, glowMat('#ff5a5a', '#ff3030', 3, 0.6), 0, 94, 0);
  sign(g, 'スカイツリー', 2.2, 9, { bg: '#2b2b4a', fg: '#e6f0ff', lit: 1.6, vertical: true, backFace: true }, 0, 4, 7.2, 0);
}

/** City park with sakura, a pond, paths and benches. */
function park(root, p, rand) {
  const cx = (p.x0 + p.x1) / 2;
  const cz = (p.z0 + p.z1) / 2;
  const path = mat('#d8cdb8');
  box(root, 2.2, 0.04, p.z1 - p.z0 - 1, path, cx, Y, cz);
  box(root, p.x1 - p.x0 - 1, 0.04, 2.2, path, cx, Y, cz + 6);
  const pond = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 0.1, 16), waterMaterial);
  pond.position.set(cx, Y + 0.05, cz - 10);
  pond.scale.x = 0.8;
  pond.userData.keepSeparate = true;
  root.add(pond);
  for (let i = 0; i < 9; i++) {
    const x = p.x0 + 2 + rand() * (p.x1 - p.x0 - 4);
    const z = p.z0 + 2 + rand() * (p.z1 - p.z0 - 4);
    if (Math.abs(x - cx) < 2 || Math.abs(z - cz - 6) < 2 || Math.hypot(x - cx, z - cz + 10) < 5) continue;
    P.sakura(root, x, z, 0.9 + rand() * 0.4, rand).position.y = Y;
  }
  for (const dz of [-4, 12]) P.bench(root, cx + 2.2, cz + dz, -Math.PI / 2).position.y = Y;
  P.stoneLantern(root, cx - 2.2, cz + 2).position.y = Y;
}
