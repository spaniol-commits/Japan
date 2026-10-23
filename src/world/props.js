import * as THREE from 'three';
import { C, mat, glowMat } from '../core/materials.js';
import { tint } from '../core/palette.js';
import { box, cyl, ball, group, beam, pick } from '../core/geo.js';
import { roof } from '../core/roof.js';
import { sign } from '../core/signs.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

export function sakura(parent, x, z, scale = 1, rand = Math.random) {
  const g = group(parent, x, 0, z, rand() * Math.PI * 2);
  g.scale.setScalar(scale);
  const bark = mat('#5a3a2c');
  beam(g, V(0, 0, 0), V(0.3, 2.2, 0.1), 0.28, bark, true);
  beam(g, V(0.3, 2.0, 0.1), V(-1.4, 3.4, 0.4), 0.16, bark, true);
  beam(g, V(0.3, 2.0, 0.1), V(1.6, 3.2, -0.3), 0.16, bark, true);
  beam(g, V(0.3, 2.1, 0.1), V(0.2, 3.8, -1.2), 0.14, bark, true);
  const blobs = [
    [-1.5, 3.7, 0.4, 1.3],
    [1.6, 3.5, -0.3, 1.3],
    [0.2, 4.2, -1.2, 1.2],
    [0.1, 4.4, 0.6, 1.5],
    [-0.6, 3.4, -0.9, 1.0],
    [1.0, 4.0, 0.9, 1.0],
  ];
  for (const [bx, by, bz, r] of blobs) ball(g, r * (0.85 + rand() * 0.3), mat(pick(rand, C.sakura)), bx, by, bz);
  // petals carpeting the ground underneath
  const petals = new THREE.Mesh(new THREE.CircleGeometry(2.6, 10), mat('#f3b4cb'));
  petals.rotation.x = -Math.PI / 2;
  petals.position.y = 0.03;
  g.add(petals);
  return g;
}

export function tree(parent, x, z, scale = 1, rand = Math.random) {
  const g = group(parent, x, 0, z, rand() * Math.PI);
  g.scale.setScalar(scale);
  cyl(g, 0.12, 0.18, 1.6, mat('#6b4a33'), 0, 0, 0, 6);
  ball(g, 1.0, mat(pick(rand, C.leaf)), 0, 2.2, 0);
  ball(g, 0.7, mat(pick(rand, C.leaf)), 0.4, 2.8, 0.2);
  return g;
}

export function pine(parent, x, z, scale = 1, rand = Math.random) {
  const g = group(parent, x, 0, z, rand() * Math.PI);
  g.scale.setScalar(scale);
  const bark = mat('#5b4433');
  beam(g, V(0, 0, 0), V(0.6, 2.4, 0), 0.22, bark, true);
  beam(g, V(0.6, 2.4, 0), V(-0.4, 3.6, 0.2), 0.16, bark, true);
  const needles = mat('#3f6b45');
  for (const [px, py, pz, r] of [
    [0.9, 2.6, 0.2, 1.1],
    [-0.5, 3.7, 0.2, 1.0],
    [0.2, 3.3, -0.7, 0.9],
  ]) {
    const m = ball(g, r, needles, px, py, pz);
    m.scale.y = 0.45;
  }
  return g;
}

export function bamboo(parent, x, z, count = 7, rand = Math.random) {
  const g = group(parent, x, 0, z);
  const stem = mat('#7fb24a');
  const leaves = mat('#8cc45a');
  for (let i = 0; i < count; i++) {
    const bx = (rand() - 0.5) * 2.4;
    const bz = (rand() - 0.5) * 2.4;
    const h = 4 + rand() * 3;
    cyl(g, 0.07, 0.09, h, stem, bx, 0, bz, 6);
    for (let k = 1; k < 4; k++) box(g, 0.2, 0.05, 0.2, mat('#5d8a35'), bx, (h * k) / 4, bz);
    const l = ball(g, 0.45, leaves, bx + 0.2, h, bz);
    l.scale.set(1.4, 0.5, 0.8);
  }
  return g;
}

export function rock(parent, x, z, s = 1, rand = Math.random) {
  const m = ball(parent, s, mat(pick(rand, [C.stone, C.stoneDark, '#b5b0a5'])), x, s * 0.3, z);
  m.scale.set(1.2, 0.7, 1);
  m.rotation.set(rand(), rand() * 3, rand());
  return m;
}

export function stoneLantern(parent, x, z, s = 1) {
  const g = group(parent, x, 0, z);
  g.scale.setScalar(s);
  const st = mat(C.stone);
  cyl(g, 0.45, 0.55, 0.25, st, 0, 0, 0, 6);
  cyl(g, 0.18, 0.22, 1.1, st, 0, 0.25, 0, 6);
  box(g, 0.75, 0.15, 0.75, st, 0, 1.35, 0);
  box(g, 0.55, 0.5, 0.55, st, 0, 1.5, 0);
  box(g, 0.3, 0.3, 0.6, glowMat('#ffd27a', '#ffb347', 2.2, 0), 0, 1.6, 0);
  box(g, 0.6, 0.3, 0.3, glowMat('#ffd27a', '#ffb347', 2.2, 0), 0, 1.6, 0);
  roof(g, { w: 1.1, d: 1.1, h: 0.45, curve: 0.4, lift: 0.12, thickness: 0.12, segs: 3 }, st, 0, 2.0, 0);
  ball(g, 0.12, st, 0, 2.55, 0);
  return g;
}

export function paperLantern(parent, x, y, z, color = C.vermilion, s = 1) {
  const g = group(parent, x, y, z);
  g.scale.setScalar(s);
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), glowMat(color, color, 1.8, 0.1));
  body.scale.y = 1.35;
  g.add(body);
  const cap = mat(C.black);
  cyl(g, 0.18, 0.18, 0.08, cap, 0, 0.38, 0, 8);
  cyl(g, 0.18, 0.18, 0.08, cap, 0, -0.46, 0, 8);
  return g;
}

export function bench(parent, x, z, ry = 0) {
  const g = group(parent, x, 0, z, ry);
  const w = mat(C.woodDark);
  box(g, 2.2, 0.12, 0.7, mat(C.wood), 0, 0.5, 0);
  for (const sx of [-0.9, 0.9]) for (const sz of [-0.25, 0.25]) box(g, 0.1, 0.5, 0.1, w, sx, 0, sz);
  return g;
}

export function cart(parent, x, z, ry = 0) {
  const g = group(parent, x, 0, z, ry);
  const w = mat(C.woodLight);
  box(g, 2.2, 0.15, 1.2, w, 0, 0.75, 0);
  box(g, 2.2, 0.4, 0.08, w, 0, 0.9, 0.56);
  box(g, 2.2, 0.4, 0.08, w, 0, 0.9, -0.56);
  for (const sz of [-0.7, 0.7]) {
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.06, 5, 14), mat(C.woodDark));
    wheel.position.set(0, 0.6, sz);
    g.add(wheel);
  }
  beam(g, V(1.1, 0.8, 0.4), V(2.8, 0.3, 0.4), 0.08, w);
  beam(g, V(1.1, 0.8, -0.4), V(2.8, 0.3, -0.4), 0.08, w);
  return g;
}

export function vendingMachine(parent, x, z, ry = 0, color = '#d93a3a') {
  const g = group(parent, x, 0, z, ry);
  box(g, 1.0, 1.9, 0.8, mat(color), 0, 0, 0);
  box(g, 0.8, 0.9, 0.05, glowMat('#e8f4ff', '#cfe8ff', 1.2, 0.25), 0, 0.85, 0.41);
  for (let i = 0; i < 4; i++) box(g, 0.14, 0.24, 0.05, mat(pick(Math.random, ['#3b7dd8', '#f2c14e', '#5bb35b', '#e45d5d'])), -0.3 + i * 0.2, 1.3, 0.44);
  box(g, 0.6, 0.18, 0.05, mat('#222'), 0, 0.25, 0.41);
  return g;
}

export function streetLamp(parent, x, z, ry = 0) {
  const g = group(parent, x, 0, z, ry);
  const pole = mat('#5d6166');
  cyl(g, 0.07, 0.1, 4.6, pole, 0, 0, 0, 6);
  beam(g, V(0, 4.5, 0), V(0, 4.7, 0.9), 0.08, pole);
  box(g, 0.35, 0.15, 0.6, glowMat('#fff6dc', '#ffe9b0', 2.5, 0), 0, 4.55, 0.95);
  return g;
}

export function trafficLight(parent, x, z, ry = 0) {
  const g = group(parent, x, 0, z, ry);
  const pole = mat('#8b8f94');
  cyl(g, 0.07, 0.07, 4.2, pole, 0, 0, 0, 6);
  beam(g, V(0, 4.1, 0), V(0, 4.1, 1.8), 0.1, pole);
  const head = group(g, 0, 3.8, 1.9);
  box(head, 1.3, 0.42, 0.3, mat('#6f7378'), 0, 0, 0);
  const colors = [
    ['#3fd4a0', 2.0, 0.6],
    ['#555', 0, 0],
    ['#552222', 0, 0],
  ];
  colors.forEach(([c, n, d], i) => {
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.08, 10), c === '#555' ? mat('#444') : glowMat(c, c, n, d));
    lamp.rotation.x = Math.PI / 2;
    lamp.position.set(-0.4 + i * 0.4, 0.21, 0.17);
    head.add(lamp);
  });
  return g;
}

/** Wooden utility pole with a crossbar; returns attachment point for wires. */
export function utilityPole(parent, x, z, h = 7) {
  const g = group(parent, x, 0, z);
  cyl(g, 0.12, 0.16, h, mat('#6b5442'), 0, 0, 0, 6);
  box(g, 1.6, 0.12, 0.12, mat('#5a4535'), 0, h - 0.8, 0);
  for (const sx of [-0.65, 0, 0.65]) cyl(g, 0.06, 0.06, 0.18, mat('#e8e2d6'), sx, h - 0.68, 0, 6);
  box(g, 0.35, 0.5, 0.35, mat('#8f949a'), 0.2, h - 2.2, 0);
  return new THREE.Vector3(x, h - 0.55, z);
}

export function wires(parent, points) {
  const material = new THREE.LineBasicMaterial({ color: tint('#2d2a28') });
  for (let i = 0; i < points.length - 1; i++) {
    for (const off of [-0.65, 0.65]) {
      const a = points[i].clone().add(V(off, 0, 0));
      const b = points[i + 1].clone().add(V(off, 0, 0));
      const pts = [];
      for (let k = 0; k <= 12; k++) {
        const t = k / 12;
        const p = a.clone().lerp(b, t);
        p.y -= Math.sin(Math.PI * t) * 0.5; // sag
        pts.push(p);
      }
      parent.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), material));
    }
  }
}

export function bicycle(parent, x, z, ry = 0) {
  const g = group(parent, x, 0, z, ry);
  const frame = mat('#c0392b');
  for (const sx of [-0.55, 0.55]) {
    const w = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.04, 4, 14), mat('#222'));
    w.position.set(sx, 0.36, 0);
    g.add(w);
  }
  beam(g, V(-0.55, 0.36, 0), V(0, 0.75, 0), 0.06, frame);
  beam(g, V(0.55, 0.36, 0), V(0, 0.75, 0), 0.06, frame);
  beam(g, V(0.45, 0.95, 0), V(0.55, 0.36, 0), 0.06, frame);
  box(g, 0.3, 0.06, 0.12, mat('#222'), -0.1, 0.8, 0);
  box(g, 0.08, 0.06, 0.5, mat('#888'), 0.45, 0.95, 0);
  return g;
}

/** Low tiled wall segment (tsuijibei) from a to b along x or z. */
export function wall(parent, x0, z0, x1, z1, h = 1.8) {
  const len = Math.hypot(x1 - x0, z1 - z0);
  const ry = Math.atan2(-(z1 - z0), x1 - x0);
  const g = group(parent, (x0 + x1) / 2, 0, (z0 + z1) / 2, ry);
  box(g, len, 0.4, 0.7, mat(C.stoneDark), 0, 0, 0);
  box(g, len, h - 0.4, 0.55, mat(C.plaster), 0, 0.4, 0);
  for (let i = 0; i <= Math.floor(len / 2.5); i++) box(g, 0.18, h - 0.4, 0.6, mat(C.woodDark), -len / 2 + Math.min(i * 2.5, len), 0.4, 0);
  roof(g, { w: len + 0.3, d: 1.2, h: 0.35, gable: true, curve: 0, thickness: 0.12, segs: 2 }, mat(C.roofSlate), 0, h, 0);
  return g;
}

export function torii(parent, x, z, ry = 0, s = 1, color = C.vermilion) {
  const g = group(parent, x, 0, z, ry);
  g.scale.setScalar(s);
  const red = mat(color);
  const blk = mat(C.black);
  for (const sx of [-1.5, 1.5]) {
    cyl(g, 0.2, 0.24, 4.4, red, sx, 0, 0, 10);
    cyl(g, 0.28, 0.28, 0.35, blk, sx, 0, 0, 10);
  }
  box(g, 3.9, 0.28, 0.3, red, 0, 3.3, 0); // nuki
  box(g, 0.25, 0.7, 0.25, red, 0, 3.55, 0); // gakuzuka
  box(g, 4.3, 0.3, 0.42, red, 0, 4.25, 0); // shimaki
  box(g, 4.3, 0.25, 0.5, blk, 0, 4.55, 0); // kasagi
  for (const sx of [-1, 1]) {
    const tip = box(g, 0.9, 0.25, 0.5, blk, sx * 2.45, 4.55, 0);
    tip.rotation.z = sx * 0.22;
    tip.position.y += 0.1;
  }
  return g;
}

/** Hanging banner (nobori) on a pole. */
export function nobori(parent, x, z, text, color = '#e7e1d3', fg = C.vermilion) {
  const g = group(parent, x, 0, z);
  cyl(g, 0.05, 0.05, 3.2, mat(C.woodDark), 0, 0, 0, 5);
  sign(g, text, 0.6, 2.1, { bg: color, fg, vertical: true, depth: 0.03, backFace: true }, 0.35, 0.9, 0);
  return g;
}
