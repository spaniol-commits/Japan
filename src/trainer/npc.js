import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mat } from '../core/materials.js';

/**
 * The person you talk to at each place (chef, clerk, police officer…): a
 * small stylised figure dressed for the role, with idle, talk, bow and nod
 * animations. One NPC is reused and re-dressed for each scene.
 */

const smooth = { flatShading: false, roughness: 0.6 };
const SKIN = ['#f1c9a5', '#e8b48c', '#d79c76'];

// Outfit per lesson id. `voice` tunes the speech pitch for the character.
export const NPC_STYLES = {
  sushi: { top: '#f4f4f2', bottom: '#2f3a4f', hat: 'headband', hatColor: '#2c4a8f', apron: '#2c4a8f', hair: '#2a2a2a', voice: 0.85 },
  ramen: { top: '#2b2b2b', bottom: '#3b3b3b', hat: 'headband', hatColor: '#f4f4f2', apron: '#8a5a33', hair: '#1f1f1f', voice: 0.8 },
  chaya: { top: '#5b7f3a', bottom: '#5b7f3a', kimono: true, obi: '#e8c88a', hair: '#2a2a2a', hairStyle: 'bun', voice: 1.2 },
  jinja: { top: '#ffffff', bottom: '#c62f2f', kimono: true, obi: '#c62f2f', hair: '#1f1f1f', hairStyle: 'long', voice: 1.25 },
  pagoda: { top: '#e2a03a', bottom: '#3b4a5c', hat: 'cap', hatColor: '#e2a03a', hair: '#3a2a1f', flag: true, voice: 1.0 },
  ryokan: { top: '#7a3b5c', bottom: '#7a3b5c', kimono: true, obi: '#e8c88a', hair: '#2a2a2a', hairStyle: 'bun', voice: 1.15 },
  shiro: { top: '#3d5a80', bottom: '#2f3a4f', hat: null, scarf: '#d9534f', hair: '#2a2a2a', hairStyle: 'bob', voice: 1.2 },
  fuji: { top: '#d9534f', bottom: '#4b5b3a', hat: 'bucket', hatColor: '#c9b27a', backpack: '#4b7cc4', hair: '#2a2a2a', voice: 0.9 },
  konbini: { top: '#2c7fd1', bottom: '#2f3a4f', stripes: '#2fb35a', hat: null, hair: '#4a3020', hairStyle: 'bob', voice: 1.2 },
  koban: { top: '#2b3f6b', bottom: '#2b3f6b', hat: 'police', hatColor: '#1e2d50', hair: '#1f1f1f', voice: 0.8 },
  eki: { top: '#1e3a6e', bottom: '#1e3a6e', hat: 'police', hatColor: '#1e3a6e', tie: '#c0392b', hair: '#1f1f1f', voice: 0.85 },
  hotel: { top: '#2f2f3a', bottom: '#2f2f3a', tie: '#c9a227', hat: null, hair: '#2a2a2a', hairStyle: 'bun', voice: 1.15 },
  fukuya: { top: '#f4f4f2', bottom: '#2f3a4f', apron: '#d7262e', hair: '#3a2a1f', hairStyle: 'bob', voice: 1.25 },
  shinkansen: { top: '#2e6f4e', bottom: '#2f3a4f', hat: 'police', hatColor: '#2e6f4e', scarf: '#f4f4f2', hair: '#1f1f1f', voice: 0.9 },
  kuko: { top: '#2c5fb3', bottom: '#2c5fb3', scarf: '#f2c14e', hair: '#2a2a2a', hairStyle: 'bun', voice: 1.2 },
  minato: { top: '#f4f4f2', bottom: '#2f3a4f', hat: 'cap', hatColor: '#2c3e70', tie: '#2c3e70', hair: '#2a2a2a', voice: 0.85 },
  onsen: { top: '#3b6b8f', bottom: '#3b6b8f', kimono: true, obi: '#f4f4f2', hair: '#2a2a2a', hairStyle: 'bun', voice: 1.15 },
  koen: { top: '#f08a9b', bottom: '#5d7387', hat: null, hair: '#5a3a24', hairStyle: 'long', backpack: '#f2c14e', voice: 1.25 },
};

function rbox(parent, w, h, d, material, x = 0, y = 0, z = 0, r = 0.05) {
  const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2, h / 2, d / 2)), material);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}
function mesh(parent, geo, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}
function pivot(parent, x = 0, y = 0, z = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);
  return g;
}

function dress(root, style, seed) {
  const M = (c) => mat(c, smooth);
  const skin = M(SKIN[seed % SKIN.length]);
  const top = M(style.top);
  const bottom = M(style.bottom);
  const hair = M(style.hair);
  const J = {};

  const body = pivot(root);
  // Legs and shoes (hidden under a kimono)
  for (const s of [-1, 1]) {
    if (!style.kimono) rbox(body, 0.2, 0.62, 0.22, bottom, s * 0.12, 0.42, 0);
    rbox(body, 0.22, 0.12, 0.32, M('#3b3b3b'), s * 0.12, 0.06, 0.04, 0.04);
  }
  const hips = pivot(body, 0, 0.74, 0);
  J.hips = hips;
  // Torso
  if (style.kimono) {
    const robe = mesh(hips, new THREE.CylinderGeometry(0.28, 0.36, 0.95, 16), top, 0, -0.18, 0);
    robe.scale.z = 0.8;
    rbox(hips, 0.5, 0.14, 0.4, M(style.obi), 0, 0.12, 0, 0.05);
    if (style.bottom !== style.top) {
      const hakama = mesh(hips, new THREE.CylinderGeometry(0.3, 0.38, 0.68, 16), bottom, 0, -0.38, 0);
      hakama.scale.z = 0.8;
    }
  } else {
    rbox(hips, 0.46, 0.2, 0.28, bottom, 0, 0.0, 0);
  }
  rbox(hips, 0.5, 0.55, 0.3, top, 0, 0.36, 0, 0.1);
  if (style.stripes) for (const y of [0.25, 0.42]) rbox(hips, 0.51, 0.05, 0.31, M(style.stripes), 0, y, 0, 0.02);
  if (style.apron) rbox(hips, 0.4, 0.62, 0.04, M(style.apron), 0, 0.1, 0.16, 0.02);
  if (style.tie) rbox(hips, 0.07, 0.3, 0.03, M(style.tie), 0, 0.42, 0.16, 0.01);
  if (style.scarf) {
    const sc = mesh(hips, new THREE.TorusGeometry(0.17, 0.05, 8, 20), M(style.scarf), 0, 0.62, 0.02);
    sc.rotation.x = Math.PI / 2;
  }
  if (style.backpack) rbox(hips, 0.38, 0.45, 0.2, M(style.backpack), 0, 0.3, -0.25, 0.08);

  // Arms
  J.arms = [];
  for (const s of [-1, 1]) {
    const sh = pivot(hips, s * 0.31, 0.58, 0);
    sh.rotation.z = s * 0.08;
    const sleeve = style.kimono ? rbox(sh, 0.2, 0.5, 0.3, top, s * 0.02, -0.25, 0, 0.08) : rbox(sh, 0.14, 0.5, 0.16, top, 0, -0.25, 0, 0.06);
    sleeve.userData.arm = true;
    mesh(sh, new THREE.SphereGeometry(0.075, 12, 10), skin, 0, -0.55, 0);
    J.arms.push(sh);
  }
  if (style.flag) {
    // tour guide's little flag in the right hand
    const f = pivot(J.arms[1], 0, -0.55, 0.05);
    mesh(f, new THREE.CylinderGeometry(0.012, 0.012, 0.9, 6), M('#555'), 0, 0.35, 0);
    rbox(f, 0.3, 0.2, 0.01, M('#f2c14e'), 0.15, 0.72, 0, 0.01);
  }

  // Head
  const neck = pivot(hips, 0, 0.66, 0);
  J.neck = neck;
  const head = mesh(neck, new THREE.SphereGeometry(0.21, 20, 16), skin, 0, 0.2, 0);
  head.scale.set(1, 1.05, 0.95);
  for (const s of [-1, 1]) {
    mesh(neck, new THREE.SphereGeometry(0.028, 8, 6), M('#222'), s * 0.075, 0.23, 0.19);
    const cheek = mesh(neck, new THREE.SphereGeometry(0.03, 8, 6), M('#f2a7a0'), s * 0.12, 0.16, 0.17);
    cheek.scale.z = 0.4;
  }
  J.mouth = rbox(neck, 0.07, 0.02, 0.02, M('#8a3b3b'), 0, 0.12, 0.2, 0.008);
  // Hair
  const cap = mesh(neck, new THREE.SphereGeometry(0.225, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), hair, 0, 0.22, -0.01);
  cap.scale.set(1.02, 1.05, 1.02);
  if (style.hairStyle === 'bun') mesh(neck, new THREE.SphereGeometry(0.09, 12, 10), hair, 0, 0.42, -0.12);
  if (style.hairStyle === 'bob' || style.hairStyle === 'long') {
    const back = rbox(neck, 0.42, style.hairStyle === 'long' ? 0.5 : 0.28, 0.2, hair, 0, style.hairStyle === 'long' ? -0.02 : 0.1, -0.1, 0.08);
    back.userData.hair = true;
  }
  // Hats
  const hatM = M(style.hatColor || '#333');
  if (style.hat === 'headband') {
    const band = mesh(neck, new THREE.TorusGeometry(0.21, 0.035, 8, 24), hatM, 0, 0.3, 0);
    band.rotation.x = Math.PI / 2;
  } else if (style.hat === 'cap' || style.hat === 'police') {
    mesh(neck, new THREE.CylinderGeometry(0.22, 0.23, 0.12, 20), hatM, 0, 0.4, 0);
    const brim = mesh(neck, new THREE.CylinderGeometry(0.16, 0.16, 0.025, 20, 1, false, -Math.PI / 2, Math.PI), hatM, 0, 0.35, 0.1);
    brim.scale.z = 0.9;
    if (style.hat === 'police') mesh(neck, new THREE.CylinderGeometry(0.035, 0.035, 0.02, 12), M('#e8c88a'), 0, 0.42, 0.22).rotation.x = Math.PI / 2;
  } else if (style.hat === 'bucket') {
    mesh(neck, new THREE.CylinderGeometry(0.2, 0.24, 0.14, 20), hatM, 0, 0.38, 0);
    mesh(neck, new THREE.CylinderGeometry(0.33, 0.33, 0.02, 20), hatM, 0, 0.33, 0);
  }
  root.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  return J;
}

export function createNPC() {
  const root = new THREE.Group();
  root.visible = false;
  let J = null;
  let style = null;
  let action = null;
  let talking = false;
  const queue = [];
  const damp = (cur, target, k, dt) => cur + (target - cur) * (1 - Math.exp(-k * dt));

  return {
    root,
    get pitch() {
      return style?.voice ?? 1;
    },
    /** Dress the NPC for a lesson id and show it. */
    dress(id, seed = 0) {
      for (const c of [...root.children]) {
        root.remove(c);
        c.traverse((o) => o.geometry?.dispose());
      }
      style = NPC_STYLES[id] || NPC_STYLES.konbini;
      J = dress(root, style, seed);
      root.visible = true;
    },
    hide() {
      root.visible = false;
      talking = false;
    },
    setTalking(on) {
      talking = on;
    },
    play(name) {
      queue.push({ name, t: 0, d: name === 'bow' ? 2.0 : 1.0 });
    },
    update(dt, t) {
      if (!J || !root.visible) return;
      if (!action && queue.length) action = queue.shift();
      let hipsX = 0,
        neckX = Math.sin(t * 0.8) * 0.03,
        neckY = Math.sin(t * 0.5) * 0.12,
        armZ = 0.08,
        armX = 0;
      if (talking) {
        neckX += Math.sin(t * 6) * 0.05;
        armX = -0.3 + Math.sin(t * 3.2) * 0.25;
      }
      if (action) {
        action.t += dt;
        const k = action.t / action.d;
        const env = Math.max(0, Math.min(1, Math.min(k / 0.3, (1 - k) / 0.3)));
        if (action.name === 'bow') {
          hipsX = 0.45 * env;
          neckX = 0.15 * env;
        } else if (action.name === 'nod') neckX = Math.sin(k * Math.PI * 2) * 0.2;
        if (action.t >= action.d) action = null;
      }
      J.hips.rotation.x = damp(J.hips.rotation.x, hipsX, 8, dt);
      J.neck.rotation.x = damp(J.neck.rotation.x, neckX, 8, dt);
      J.neck.rotation.y = damp(J.neck.rotation.y, neckY, 4, dt);
      J.arms.forEach((a, i) => {
        a.rotation.z = damp(a.rotation.z, (i ? 1 : -1) * armZ, 8, dt);
        a.rotation.x = damp(a.rotation.x, i ? armX : 0, 6, dt);
      });
      J.hips.position.y = 0.74 + Math.sin(t * 2) * 0.005;
      J.mouth.scale.y = talking ? 1 + Math.abs(Math.sin(t * 18)) * 2.5 : 1;
    },
  };
}
