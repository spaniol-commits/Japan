import * as THREE from 'three';
import { mat, glowMat } from '../core/materials.js';
import { tint, tintGlow } from '../core/palette.js';
import { box, cyl, rng, pick } from '../core/geo.js';
import { WORLD, STREETS, POND, RAIL } from './layout.js';
import { LOC } from '../locations.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * Things that move: cars, the commuter train, koi in the pond and drifting
 * sakura petals. Returns an update(dt, time) function for the render loop.
 */
export function buildLife(root, view) {
  const updates = [cars(root), train(root), koi(root), petals(root, view)];
  return (dt, t) => updates.forEach((u) => u(dt, t));
}

function carModel(color, kind) {
  const g = new THREE.Group();
  const body = mat(color, { roughness: 0.4, flatShading: false });
  const glass = mat('#2b3946', { roughness: 0.2 });
  if (kind === 'kei') {
    // tall boxy kei car
    box(g, 1.6, 0.9, 3.0, body, 0, 0.3, 0);
    box(g, 1.5, 0.9, 2.2, glass, 0, 1.2, -0.2);
    box(g, 1.52, 0.75, 2.0, body, 0, 1.25, -0.25);
  } else if (kind === 'taxi') {
    box(g, 1.7, 0.75, 3.8, body, 0, 0.3, 0);
    box(g, 1.55, 0.65, 2.0, glass, 0, 1.05, -0.2);
    box(g, 0.5, 0.25, 0.25, mat('#ffe28a'), 0, 1.7, -0.2);
  } else {
    box(g, 1.7, 0.7, 3.8, body, 0, 0.3, 0);
    box(g, 1.55, 0.6, 2.1, glass, 0, 1.0, -0.3);
  }
  const len = kind === 'kei' ? 1.5 : 1.9;
  for (const sx of [-0.85, 0.85]) {
    for (const sz of [-len * 0.65, len * 0.65]) {
      const w = cyl(g, 0.33, 0.33, 0.25, mat('#1f1f1f'), sx, 0, sz, 10);
      w.rotation.z = Math.PI / 2;
      w.position.y = 0.33;
    }
    box(g, 0.35, 0.18, 0.06, mat('#fffbe8'), sx * 0.7, 0.55, len);
    box(g, 0.35, 0.15, 0.06, mat('#ff4a4a'), sx * 0.7, 0.6, -len);
  }
  // Flatten into one geometry, colouring each part through vertex colours
  g.updateMatrixWorld(true);
  const parts = [];
  g.traverse((o) => {
    if (!o.isMesh) return;
    const geo = o.geometry.clone().applyMatrix4(o.matrixWorld).toNonIndexed();
    const c = o.material.color;
    const n = geo.attributes.position.count;
    const col = new Float32Array(n * 3);
    for (let k = 0; k < n; k++) col.set([c.r, c.g, c.b], k * 3);
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.deleteAttribute('uv');
    parts.push(geo);
  });
  return mergeGeometries(parts, false);
}

/**
 * Traffic on every street. Cars are instanced per model and colour, so a few
 * hundred cars cost about a dozen draw calls.
 */
function cars(root) {
  const rand = rng(77);
  const colors = ['#f2f2f2', '#d64545', '#2f6fb3', '#2a2a2a', '#c9c9c9', '#f2c14e', '#5aa36b'];
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45 });
  const variants = new Map();
  const list = [];
  for (const s of STREETS) {
    const span = s.z1 - s.z0;
    for (const dir of [1, -1]) {
      const x = dir > 0 ? s.x1 - 1.5 : s.x0 + 1.5;
      const n = Math.max(2, Math.round(span / 45));
      for (let i = 0; i < n; i++) {
        const kind = rand() < 0.25 ? 'taxi' : rand() < 0.5 ? 'kei' : 'sedan';
        const color = kind === 'taxi' ? pick(rand, ['#f5c518', '#2e7d32', '#1a1a1a']) : pick(rand, colors);
        const key = kind + color;
        if (!variants.has(key)) variants.set(key, { geo: carModel(color, kind), cars: [] });
        const c = { x, z: s.z0 + rand() * span, z0: s.z0 + 1.5, z1: s.z1 - 1.5, dir, speed: 5 + rand() * 4 };
        variants.get(key).cars.push(c);
        list.push(c);
      }
    }
  }
  const meshes = [...variants.values()].map(({ geo, cars }) => {
    const m = new THREE.InstancedMesh(geo, material, cars.length);
    m.castShadow = true;
    m.frustumCulled = false;
    m.userData.keepSeparate = true;
    root.add(m);
    return { m, cars };
  });
  const o = new THREE.Object3D();
  return (dt) => {
    for (const c of list) {
      c.z += c.dir * c.speed * dt;
      // wrap around at the ends of the street
      if (c.z > c.z1) c.z = c.z0;
      if (c.z < c.z0) c.z = c.z1;
    }
    for (const { m, cars } of meshes) {
      cars.forEach((c, i) => {
        o.position.set(c.x, 0, c.z);
        o.rotation.y = c.dir > 0 ? 0 : Math.PI;
        o.updateMatrix();
        m.setMatrixAt(i, o.matrix);
      });
      m.instanceMatrix.needsUpdate = true;
    }
  };
}

/** Commuter train that pulls into the station, waits, and departs again. */
function train(root) {
  const cars = [];
  const N = 3,
    L = 7.6;
  const white = mat('#eef1f2', { roughness: 0.35, flatShading: false });
  const stripe = mat('#2e9c4f');
  const win = glowMat('#33424f', '#ffe9b8', 1.2, 0);
  for (let i = 0; i < N; i++) {
    const g = new THREE.Group();
    box(g, L, 2.6, 2.6, white, 0, 0.35, 0);
    box(g, L + 0.02, 0.3, 2.62, stripe, 0, 1.0, 0);
    box(g, L - 0.6, 0.8, 2.64, win, 0, 1.5, 0);
    for (const dx of [-L / 2 + 1.2, L / 2 - 1.2]) box(g, 1.2, 0.35, 2.2, mat('#3a3a3a'), dx, 0, 0);
    if (i === 0) box(g, 0.1, 0.25, 0.4, glowMat('#fff', '#fff6d0', 2.5, 0.5), -L / 2 - 0.05, 0.8, 0);
    g.position.y = RAIL.deck + 0.15;
    g.position.z = RAIL.z;
    root.add(g);
    cars.push(g);
  }
  const stop = LOC.eki.pos[0] - (N - 1) * (L + 0.3) * 0.5;
  const start = WORLD.x1 + 30;
  let phase = 0; // 0 arriving, 1 waiting, 2 departing, 3 pause off-board
  let x = start,
    v = 0,
    timer = 0;
  return (dt) => {
    if (phase === 0) {
      const dist = x - stop;
      v = Math.min(14, Math.max(1.2, Math.sqrt(2 * 3 * dist)));
      x -= v * dt;
      if (x <= stop) {
        x = stop;
        phase = 1;
        timer = 6;
      }
    } else if (phase === 1) {
      timer -= dt;
      if (timer <= 0) {
        phase = 2;
        v = 0;
      }
    } else if (phase === 2) {
      v = Math.min(14, v + 3 * dt);
      x += v * dt;
      if (x > start) {
        phase = 3;
        timer = 8;
      }
    } else {
      timer -= dt;
      if (timer <= 0) phase = 0;
    }
    cars.forEach((c, i) => {
      c.position.x = x + i * (L + 0.3);
      c.visible = c.position.x + L / 2 < WORLD.x1 + 0.5;
    });
  };
}

function koi(root) {
  const fish = [];
  const colors = ['#ff7b2e', '#ffffff', '#ff9f1c', '#e63946', '#f4d35e'];
  for (let i = 0; i < 6; i++) {
    const g = new THREE.Group();
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), mat(colors[i % colors.length]));
    b.scale.set(0.7, 0.45, 1.6);
    g.add(b);
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.35, 4), mat(colors[(i + 1) % colors.length]));
    tail.rotation.x = Math.PI / 2;
    tail.position.z = -0.45;
    g.add(tail);
    g.position.y = 0.1;
    root.add(g);
    fish.push({ g, r: 2.8 + (i % 3) * 1.1, speed: 0.25 + i * 0.05, phase: i * 1.3, dir: i % 2 ? 1 : -1 });
  }
  return (dt, t) => {
    for (const f of fish) {
      const a = f.phase + t * f.speed * f.dir;
      const r = f.r + Math.sin(t * 0.7 + f.phase) * 0.5;
      f.g.position.x = POND.x + Math.cos(a) * r;
      f.g.position.z = POND.z + Math.sin(a) * r * 0.8;
      f.g.rotation.y = -a + (f.dir > 0 ? Math.PI : 0);
    }
  };
}

/**
 * Sakura petals riding the wind all over the city. They live in a box that
 * follows the camera's focus (wrapping around its edges), and grow with zoom
 * distance so they stay visible from the overview.
 */
function petals(root, view) {
  const N = 1600;
  const geo = new THREE.PlaneGeometry(0.3, 0.2);
  const m = new THREE.MeshStandardMaterial({ color: '#f9c4d8', emissive: '#f3a6c2', emissiveIntensity: 0.35, side: THREE.DoubleSide, roughness: 0.8 });
  const mesh = new THREE.InstancedMesh(geo, m, N);
  mesh.userData.keepSeparate = true;
  mesh.userData.noShadow = true;
  mesh.frustumCulled = false;
  root.add(mesh);
  const rand = rng(3);
  const P = [];
  for (let i = 0; i < N; i++) P.push({ x: (rand() - 0.5) * 300, y: rand() * 60, z: (rand() - 0.5) * 200, s: 0.5 + rand(), ph: rand() * 100 });
  const o = new THREE.Object3D();
  const centre = new THREE.Vector3();
  return (dt, t) => {
    centre.copy(view.controls.target);
    const dist = view.camera.position.distanceTo(centre);
    const S = THREE.MathUtils.clamp(dist * 1.1, 50, 900);
    const H = THREE.MathUtils.clamp(dist * 0.32, 14, 160);
    const scale = THREE.MathUtils.clamp(dist / 70, 1, 9);
    // Slowly veering breeze with occasional gusts
    const gust = 1 + 0.8 * Math.max(0, Math.sin(t * 0.21) * Math.sin(t * 0.13));
    const wx = Math.cos(t * 0.05) * 1.8 * gust;
    const wz = Math.sin(t * 0.037) * 1.3 * gust;
    for (let i = 0; i < N; i++) {
      const p = P[i];
      p.x += (wx + Math.sin(p.z * 0.09 + t * 0.9 + p.ph) * 0.9) * dt * p.s;
      p.z += (wz + Math.cos(p.x * 0.08 + t * 0.7 + p.ph) * 0.9) * dt * p.s;
      p.y += (Math.sin(t * 1.3 + p.ph) * 0.5 - 0.45) * dt * p.s;
      // wrap around the box that follows the focus
      if (p.x - centre.x > S / 2) p.x -= S;
      else if (centre.x - p.x > S / 2) p.x += S;
      if (p.z - centre.z > S / 2) p.z -= S;
      else if (centre.z - p.z > S / 2) p.z += S;
      if (p.y < 0.3) p.y += H;
      else if (p.y > H + 2) p.y -= H;
      o.position.set(p.x, p.y, p.z);
      o.rotation.set(t * p.s * 1.7 + p.ph, t * 0.9 * p.s, p.ph + Math.sin(t + p.ph));
      o.scale.setScalar(scale);
      o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  };
}
