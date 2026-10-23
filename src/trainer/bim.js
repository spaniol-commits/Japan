import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mat, matExact, glowMat, glow } from '../core/materials.js';
import { sign } from '../core/signs.js';
import { THEME, tint, tintGlow } from '../core/palette.js';

/**
 * Bim (ビム), the trainer: a small companion robot in the spirit of Robohon,
 * modelled after the porcelain samurai figure — kabuto with hooked kuwagata
 * horns and a plume, lamellar neck guard, white breastplate, grid-plated
 * shoulder guards and waist plates, ribbed shin guards, a rope obi with a
 * katana worn across the front, and a paw-print banner on an L-shaped pole.
 *
 * About 2.1 units tall. Built facing +z with named pivots so it can idle,
 * blink, bow (ojigi), wave, walk and "talk".
 */

const smooth = { flatShading: false };
// Bim has his own hand-picked colours per theme: in pastel blue the armour is
// porcelain white and the robot body periwinkle, like the reference figure.
const PASTEL = THEME !== 'classic';
const bm = (classic, pastel, opts) => (PASTEL ? matExact(pastel, opts) : mat(classic, opts));

// --- Surface detail textures (drawn once on canvases) ------------------------

function canvasTexture(size, draw, color = false) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (color) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}

// Lamellar armour: a grid of small raised scales (kozane)
const lamellarBump = canvasTexture(128, (ctx, S) => {
  ctx.fillStyle = '#3a3a3a';
  ctx.fillRect(0, 0, S, S);
  const n = 4,
    c = S / n;
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      const g = ctx.createLinearGradient(i * c, j * c, i * c + c, j * c + c);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(1, '#b0b0b0');
      ctx.fillStyle = g;
      roundRect(ctx, i * c + 4, j * c + 4, c - 8, c - 8, 6);
    }
});
const lamellarMap = canvasTexture(
  128,
  (ctx, S) => {
    ctx.fillStyle = PASTEL ? '#d5e0f6' : '#7a141c';
    ctx.fillRect(0, 0, S, S);
    const n = 4,
      c = S / n;
    ctx.fillStyle = PASTEL ? '#f6f9ff' : '#b3202b';
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) roundRect(ctx, i * c + 4, j * c + 4, c - 8, c - 8, 6);
  },
  true,
);

// Vertical ribs for the shin guards (suneate)
const ribBump = canvasTexture(128, (ctx, S) => {
  for (let i = 0; i < 8; i++) {
    const g = ctx.createLinearGradient(i * 16, 0, i * 16 + 16, 0);
    g.addColorStop(0, '#404040');
    g.addColorStop(0.5, '#ffffff');
    g.addColorStop(1, '#404040');
    ctx.fillStyle = g;
    ctx.fillRect(i * 16, 0, 16, S);
  }
});
ribBump.repeat.set(3, 1);

// Braided rope for the obi and cords
const braidBump = canvasTexture(64, (ctx, S) => {
  ctx.fillStyle = '#555';
  ctx.fillRect(0, 0, S, S);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 6;
  for (let k = -S; k < S * 2; k += 16) {
    ctx.beginPath();
    ctx.moveTo(k, 0);
    ctx.lineTo(k + S, S);
    ctx.stroke();
  }
});
braidBump.repeat.set(8, 1);

// Diamond wrapping on the katana hilt (tsuka-ito)
const hiltMap = canvasTexture(
  128,
  (ctx, S) => {
    ctx.fillStyle = PASTEL ? '#9fb7ee' : '#1d1d22';
    ctx.fillRect(0, 0, S, S);
    ctx.fillStyle = PASTEL ? '#f2f6ff' : '#ece5d3';
    for (let i = 0; i < 4; i++) {
      const cx = i * 32 + 16;
      ctx.beginPath();
      ctx.moveTo(cx, S * 0.2);
      ctx.lineTo(cx + 12, S / 2);
      ctx.lineTo(cx, S * 0.8);
      ctx.lineTo(cx - 12, S / 2);
      ctx.closePath();
      ctx.fill();
    }
  },
  true,
);
hiltMap.repeat.set(2, 1);

// Banner with a paw-print crest (mon)
const pawMap = canvasTexture(
  256,
  (ctx, S) => {
    ctx.fillStyle = PASTEL ? '#f4f7ff' : '#f4efe4';
    ctx.fillRect(0, 0, S, S);
    const ink = PASTEL ? '#93ace9' : '#b3202b';
    ctx.strokeStyle = ink;
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(S / 2, S / 2, S * 0.36, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = ink;
    ctx.beginPath();
    ctx.ellipse(S / 2, S * 0.6, S * 0.13, S * 0.11, 0, 0, Math.PI * 2);
    ctx.fill();
    for (const [dx, dy, r] of [
      [-0.16, -0.04, 0.055],
      [-0.06, -0.15, 0.06],
      [0.06, -0.15, 0.06],
      [0.16, -0.04, 0.055],
    ]) {
      ctx.beginPath();
      ctx.ellipse(S / 2 + dx * S, S / 2 + dy * S, r * S, r * S * 1.2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  },
  true,
);

// --- Materials ----------------------------------------------------------------

const M = {
  body: bm('#1b1c1f', '#9db4ec', { ...smooth, roughness: 0.35 }),
  joint: bm('#4a4d52', '#89a2e2', { ...smooth, roughness: 0.4 }),
  white: bm('#f5f4f0', '#f4f7ff', { ...smooth, roughness: 0.32, emissive: '#ffffff', emissiveIntensity: 0.05 }),
  armor: bm('#f2f2f2', '#f1f5ff', { ...smooth, roughness: 0.4, map: lamellarMap, bumpMap: lamellarBump, bumpScale: 3 }),
  armorPlain: bm('#b3202b', '#eef3fe', { ...smooth, roughness: 0.35 }),
  armorSide: bm('#9e1c26', '#e6eefc', { ...smooth, roughness: 0.4, side: THREE.DoubleSide, map: lamellarMap, bumpMap: lamellarBump, bumpScale: 3 }),
  helm: bm('#2a1d1c', '#f2f6ff', { ...smooth, roughness: 0.3 }),
  accent: bm('#d6a93c', '#cbdaf7', { ...smooth, roughness: 0.35, metalness: PASTEL ? 0 : 0.7 }),
  horn: bm('#d6a93c', '#dbe6fb', { ...smooth, roughness: 0.35, metalness: PASTEL ? 0 : 0.7, side: THREE.DoubleSide }),
  plume: bm('#e8e2d0', '#b9cbf3', { ...smooth, roughness: 0.7 }),
  rope: bm('#4b2a6b', '#d3dff8', { ...smooth, roughness: 0.6, bumpMap: braidBump, bumpScale: 2 }),
  shin: bm('#2a1d1c', '#f0f4fe', { ...smooth, roughness: 0.4, bumpMap: ribBump, bumpScale: 3 }),
  saya: bm('#2a1d1c', '#a9bef0', { ...smooth, roughness: 0.3 }),
  hilt: bm('#1d1d22', '#ffffff', { ...smooth, roughness: 0.6, map: hiltMap }),
  sole: bm('#ff7a1a', '#97b0ec', { ...smooth, roughness: 0.45 }),
  lens: bm('#0d0d10', '#86a3e6', { ...smooth, roughness: 0.15 }),
  flag: bm('#f4efe4', '#ffffff', { ...smooth, roughness: 0.8, map: pawMap, side: THREE.DoubleSide }),
  eyeRing: PASTEL
    ? glow(new THREE.MeshStandardMaterial({ color: '#d9e5fc', emissive: '#a9c6ff', roughness: 0.35 }), 1.8, 0.25)
    : glowMat('#ffb347', '#ff8a1f', 2.4, 1.1, smooth),
};

function rbox(parent, w, h, d, material, x = 0, y = 0, z = 0, r = 0.04) {
  const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2, h / 2, d / 2)), material);
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

function mesh(parent, geo, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}

/** One kuwagata horn: a flat blade sweeping up and out, ending in a hooked tip. */
function hornGeometry() {
  const s = new THREE.Shape();
  s.moveTo(0.03, -0.01);
  s.bezierCurveTo(0.17, 0.0, 0.27, 0.1, 0.3, 0.24); // outer edge rising
  s.bezierCurveTo(0.31, 0.3, 0.31, 0.34, 0.34, 0.37); // up into the head of the hook
  s.bezierCurveTo(0.38, 0.41, 0.45, 0.41, 0.48, 0.36); // rounded crown, outwards
  s.bezierCurveTo(0.44, 0.35, 0.42, 0.33, 0.41, 0.3); // beak tip turning back
  s.bezierCurveTo(0.38, 0.31, 0.35, 0.3, 0.3, 0.33); // under the hook
  s.bezierCurveTo(0.24, 0.35, 0.21, 0.28, 0.19, 0.2); // inner edge down
  s.bezierCurveTo(0.16, 0.12, 0.1, 0.09, 0.0, 0.08);
  s.lineTo(0.03, -0.01);
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.03, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 2, curveSegments: 10 });
  geo.translate(0, 0, -0.015);
  return geo;
}

function buildHead(head, J) {
  // Periwinkle shell with the white face plate bulging out at the front
  const shell = mesh(head, new THREE.SphereGeometry(0.34, 32, 24), M.body, 0, 0.3, 0);
  shell.scale.set(1.12, 0.95, 1.0);
  const face = mesh(head, new THREE.SphereGeometry(0.31, 32, 24), M.white, 0, 0.25, 0.08);
  face.scale.set(1.08, 0.8, 0.95);

  // Eyes: big blue lenses in a pale ring
  J.eyes = [];
  for (const s of [-1, 1]) {
    const eye = pivot(head, s * 0.128, 0.27, 0.343);
    eye.rotation.y = s * 0.32;
    const lens = mesh(eye, new THREE.CylinderGeometry(0.078, 0.078, 0.03, 32), M.lens);
    lens.rotation.x = Math.PI / 2;
    mesh(eye, new THREE.TorusGeometry(0.086, 0.017, 12, 36), M.eyeRing, 0, 0, 0.01);
    const shine = mesh(eye, new THREE.SphereGeometry(0.016, 8, 6), matExact('#ffffff', { ...smooth, emissive: '#ffffff', emissiveIntensity: 0.5 }), -0.028, 0.028, 0.018);
    shine.scale.z = 0.4;
    J.eyes.push(eye);
  }
  // Forehead camera dot
  const dot = mesh(head, new THREE.CylinderGeometry(0.022, 0.022, 0.02, 16), M.lens, 0, 0.395, 0.318);
  dot.rotation.x = Math.PI / 2 - 0.5;
  // Mouth that lights up when Bim speaks
  J.mouthMat = new THREE.MeshStandardMaterial({ color: PASTEL ? '#7f9be0' : tint('#3a3a40'), emissive: tintGlow('#ff8a1f'), emissiveIntensity: 0, roughness: 0.3 });
  const mouth = mesh(head, new THREE.CapsuleGeometry(0.028, 0.05, 6, 16), J.mouthMat, 0, 0.14, 0.348);
  mouth.rotation.z = Math.PI / 2;
  mouth.scale.set(1, 1, 0.5);
  mouth.rotation.x = 0.3;

  // Ear discs (mostly tucked under the helmet flaps)
  for (const s of [-1, 1]) {
    const ear = mesh(head, new THREE.CylinderGeometry(0.14, 0.14, 0.06, 32), M.joint, s * 0.36, 0.29, -0.02);
    ear.rotation.z = Math.PI / 2;
  }

  // --- Kabuto ---------------------------------------------------------------
  const helm = pivot(head, 0, 0.3, 0);
  const bowlG = pivot(helm);
  bowlG.scale.set(1.1, 1.0, 1.04);
  mesh(bowlG, new THREE.SphereGeometry(0.365, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.36), M.helm);
  // Raised centre ridge, front to back
  const ridge = mesh(bowlG, new THREE.TorusGeometry(0.366, 0.012, 6, 32, Math.PI * 0.72), M.helm);
  ridge.rotation.set(0, Math.PI / 2, Math.PI / 2 - Math.PI * 0.36);
  const rimY = 0.365 * Math.cos(Math.PI * 0.36);
  const rimR = 0.365 * Math.sin(Math.PI * 0.36);
  const band = mesh(helm, new THREE.TorusGeometry(rimR, 0.024, 10, 48), M.armorPlain, 0, rimY, 0);
  band.rotation.x = Math.PI / 2;
  band.scale.set(1.1, 1.04, 1);
  // Short visor
  const visor = mesh(helm, new THREE.CylinderGeometry(0.41, 0.41, 0.03, 32, 1, false, -Math.PI * 0.3, Math.PI * 0.6), M.helm, 0, rimY + 0.005, 0);
  visor.scale.set(1.02, 1, 0.92);
  visor.rotation.x = -0.3;

  // Neck guard (shikoro): lamellar tiers around sides and back
  for (let k = 0; k < 2; k++) {
    const r0 = 0.37 + k * 0.018;
    const tier = mesh(helm, new THREE.CylinderGeometry(r0, r0 + 0.02, 0.1, 32, 1, true, Math.PI * 0.34, Math.PI * 1.32), M.armorSide, 0, rimY - 0.06 - k * 0.09, -0.02);
    tier.scale.set(1.1, 1, 1.02);
  }
  // Turned-back flaps (fukigaeshi)
  for (const s of [-1, 1]) {
    const f = pivot(helm, s * 0.4, rimY - 0.06, 0.14);
    f.rotation.y = s * 1.0;
    rbox(f, 0.17, 0.2, 0.035, M.armor, 0, -0.03, 0, 0.03);
  }
  // Front crest: hooked kuwagata horns rising from a round boss
  const crest = pivot(helm, 0, rimY + 0.05, 0.33);
  crest.rotation.x = -0.18;
  const horn = hornGeometry();
  for (const s of [-1, 1]) {
    const h = mesh(crest, horn, M.horn, 0, 0.03, 0);
    h.scale.set(s * 0.95, 0.95, 1.3);
  }
  const boss = mesh(crest, new THREE.TorusGeometry(0.055, 0.022, 12, 28), M.horn, 0, 0.03, 0.01);
  boss.scale.z = 0.8;
  const bossDisc = mesh(crest, new THREE.CylinderGeometry(0.04, 0.04, 0.03, 20), M.accent, 0, 0.03, 0.005);
  bossDisc.rotation.x = Math.PI / 2;
  // Plume (a tuft swept back over the crown)
  const plumePath = [
    [0.0, 0.35, -0.05, 0.05],
    [0.0, 0.42, -0.1, 0.06],
    [0.0, 0.45, -0.17, 0.065],
    [0.0, 0.43, -0.24, 0.06],
    [0.0, 0.38, -0.29, 0.05],
    [0.0, 0.31, -0.32, 0.04],
    [0.0, 0.25, -0.33, 0.03],
  ];
  for (const [x, y, z, r] of plumePath) {
    const b = mesh(helm, new THREE.SphereGeometry(r, 14, 10), M.plume, x, y, z);
    b.scale.set(0.9, 1, 1.25);
  }
}

function buildArm(parent, s) {
  const shoulder = pivot(parent, s * 0.37, 0.6, 0);
  mesh(shoulder, new THREE.SphereGeometry(0.1, 20, 14), M.joint);
  rbox(shoulder, 0.15, 0.28, 0.17, M.body, s * 0.01, -0.15, 0, 0.06);
  const elbow = pivot(shoulder, s * 0.01, -0.29, 0);
  mesh(elbow, new THREE.SphereGeometry(0.07, 16, 10), M.joint);
  // Bracer (kote): white cuff with two raised bands
  mesh(elbow, new THREE.CylinderGeometry(0.085, 0.095, 0.22, 24), M.white, 0, -0.13, 0);
  for (const y of [-0.06, -0.2]) {
    const ring = mesh(elbow, new THREE.TorusGeometry(0.093, 0.014, 8, 24), M.armorPlain, 0, y, 0);
    ring.rotation.x = Math.PI / 2;
  }
  // Chunky C-shaped white hand
  const hand = pivot(elbow, 0, -0.31, 0.01);
  const c = mesh(hand, new THREE.TorusGeometry(0.06, 0.04, 14, 24, Math.PI * 1.4), M.white);
  c.rotation.set(0, Math.PI / 2, Math.PI * 0.3 + Math.PI);
  return { shoulder, elbow };
}

function buildSode(parent, s) {
  // Shoulder guard: lamellar plates hanging from a rounded cap
  const g = pivot(parent, s * 0.42, 0.71, 0);
  g.rotation.z = -s * 0.5;
  rbox(g, 0.22, 0.08, 0.3, M.armorPlain, 0, 0.02, 0, 0.035);
  for (let k = 0; k < 3; k++) rbox(g, 0.24 + k * 0.01, 0.075, 0.31 + k * 0.01, M.armor, s * k * 0.012, -0.05 - k * 0.07, 0, 0.025);
  return g;
}

function buildLeg(parent, s) {
  const hip = pivot(parent, s * 0.14, 0.78, 0);
  rbox(hip, 0.2, 0.26, 0.24, M.body, 0, -0.13, 0, 0.06);
  const knee = pivot(hip, 0, -0.27, 0);
  rbox(knee, 0.19, 0.36, 0.23, M.body, 0, -0.17, 0, 0.07);
  // Knee cap and ribbed shin guard (suneate)
  rbox(knee, 0.2, 0.1, 0.08, M.armorPlain, 0, 0.0, 0.12, 0.04);
  mesh(knee, new THREE.CylinderGeometry(0.13, 0.135, 0.27, 24, 1, true), M.shin, 0, -0.2, 0.01);
  for (const y of [-0.07, -0.33]) {
    const band = mesh(knee, new THREE.TorusGeometry(0.133, 0.013, 8, 28), M.armorPlain, 0, y, 0.01);
    band.rotation.x = Math.PI / 2;
  }
  // Chunky shoe: white upper on a thick blue sole
  const foot = pivot(knee, 0, -0.44, 0);
  rbox(foot, 0.25, 0.08, 0.36, M.white, 0, 0.02, 0.04, 0.04);
  rbox(foot, 0.28, 0.075, 0.42, M.sole, 0, -0.05, 0.05, 0.03);
  return { hip, knee };
}

function buildTorso(hips, J) {
  rbox(hips, 0.46, 0.18, 0.3, M.body, 0, 0.04, 0, 0.06);
  rbox(hips, 0.58, 0.58, 0.38, M.body, 0, 0.42, 0, 0.12);
  // White breastplate (dō) with an embossed name plate
  rbox(hips, 0.5, 0.52, 0.16, M.white, 0, 0.44, 0.13, 0.08);
  rbox(hips, 0.22, 0.075, 0.02, M.accent, 0, 0.55, 0.215, 0.02);
  sign(hips, 'BIM', 0.2, 0.06, { bg: PASTEL ? '#eef3ff' : '#ff7a1a', fg: PASTEL ? '#7f9be0' : '#ffffff', weight: 700, depth: 0.012 }, 0, 0.522, 0.222);
  // Shoulder cords tying the breastplate
  for (const s of [-1, 1]) {
    const cord = mesh(hips, new THREE.TorusGeometry(0.05, 0.014, 8, 18), M.rope, s * 0.22, 0.7, 0.06);
    cord.rotation.y = Math.PI / 2;
  }

  // Rope obi with a knot and hanging tassels
  rbox(hips, 0.62, 0.08, 0.42, M.rope, 0, 0.17, 0, 0.04);
  for (const dx of [-0.04, 0.04]) {
    const loop = mesh(hips, new THREE.TorusGeometry(0.035, 0.015, 8, 16), M.rope, -0.06 + dx * 1.4, 0.18, 0.22);
    loop.rotation.z = dx * 10;
  }
  for (const dx of [-0.09, -0.04]) {
    mesh(hips, new THREE.CylinderGeometry(0.011, 0.011, 0.18, 6), M.rope, dx, 0.07, 0.225);
    mesh(hips, new THREE.SphereGeometry(0.018, 8, 6), M.rope, dx, -0.02, 0.225);
  }

  // Waist plates (kusazuri): big lamellar plates in front, smaller round the sides
  const plates = [
    [-0.13, 0.2, 0, 0.24],
    [0.13, 0.2, 0, 0.24],
    [0.3, 0, Math.PI / 2, 0.22],
    [-0.3, 0, -Math.PI / 2, 0.22],
    [-0.13, -0.2, Math.PI, 0.22],
    [0.13, -0.2, Math.PI, 0.22],
  ];
  J.kusazuri = [];
  for (const [x, z, ry, w] of plates) {
    const p = pivot(hips, x, 0.13, z);
    p.rotation.set(-0.2, ry, 0, 'YXZ');
    rbox(p, w, 0.27, 0.035, M.armor, 0, -0.13, 0.02, 0.02);
    rbox(p, w + 0.01, 0.03, 0.045, M.armorPlain, 0, -0.005, 0.02, 0.012);
    J.kusazuri.push(p);
  }

  // Katana worn across the front: hilt to the front, pointing over the belly
  const katana = pivot(hips, 0.2, 0.2, 0.17);
  katana.rotation.set(-0.12, -1.0, 0, 'YXZ');
  rbox(katana, 0.045, 0.055, 0.95, M.saya, 0, 0, -0.42, 0.02);
  rbox(katana, 0.05, 0.06, 0.035, M.armorPlain, 0, 0, -0.88, 0.012); // kojiri
  const tsuba = mesh(katana, new THREE.CylinderGeometry(0.065, 0.065, 0.022, 24), M.saya, 0, 0, 0.07);
  tsuba.rotation.x = Math.PI / 2;
  rbox(katana, 0.044, 0.052, 0.28, M.hilt, 0, 0, 0.22, 0.016);
  rbox(katana, 0.05, 0.058, 0.03, M.saya, 0, 0, 0.37, 0.012); // kashira

  // Back banner (sashimono): L-shaped pole with a paw-print flag
  const pole = pivot(hips, 0.26, 0.55, -0.24);
  pole.rotation.z = -0.12;
  mesh(pole, new THREE.CylinderGeometry(0.014, 0.014, 1.15, 8), M.accent, 0, 0.5, 0);
  mesh(pole, new THREE.CylinderGeometry(0.012, 0.012, 0.36, 8), M.accent, 0.18, 1.06, 0).rotation.z = Math.PI / 2;
  for (const x of [0, 0.36]) mesh(pole, new THREE.SphereGeometry(0.02, 8, 6), M.accent, x, 1.07, 0);
  const flag = mesh(pole, new THREE.PlaneGeometry(0.3, 0.56), M.flag, 0.18, 0.76, 0);
  flag.rotation.y = 0.35;
  J.flag = flag;

  mesh(hips, new THREE.CylinderGeometry(0.07, 0.08, 0.1, 16), M.joint, 0, 0.74, 0); // neck
}

const ease = (x) => x * x * (3 - 2 * x);
const damp = (cur, target, k, dt) => cur + (target - cur) * (1 - Math.exp(-k * dt));

export function createBim() {
  const J = {};
  const root = new THREE.Group();
  root.name = 'Bim';
  const body = pivot(root); // bobs while walking
  const legs = [buildLeg(body, 1), buildLeg(body, -1)];
  const hips = pivot(body, 0, 0.78, 0);
  buildTorso(hips, J);
  const arms = { left: buildArm(hips, 1, J), right: buildArm(hips, -1, J) };
  buildSode(hips, 1);
  buildSode(hips, -1);
  const neck = pivot(hips, 0, 0.76, 0);
  // Robohon-style big head: everything above the neck is scaled up
  const head = pivot(neck, 0, -0.04, 0);
  head.scale.setScalar(1.28);
  buildHead(head, J);

  root.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });

  // --- Animation state ------------------------------------------------------
  let action = null; // { name, t, duration, onDone }
  const queue = [];
  let path = [];
  let onArrive = null;
  let walkPhase = 0;
  let yawTarget = null;
  let lookTarget = null;
  let talking = false;
  let blinkTimer = 2;
  let blinkT = 0;

  const ACTIONS = { bow: 2.8, wave: 2.6, nod: 1.2, cheer: 1.8 };

  const play = (name) =>
    new Promise((resolve) => {
      queue.push({ name, t: 0, duration: ACTIONS[name], onDone: resolve });
    });

  const walkTo = (points) =>
    new Promise((resolve) => {
      path = points.map((p) => new THREE.Vector3(p.x ?? p[0], root.position.y, p.z ?? p[1]));
      onArrive = resolve;
    });

  /** Turn the whole body towards a world position (or a yaw angle). */
  const face = (target) => {
    yawTarget = typeof target === 'number' ? target : Math.atan2(target.x - root.position.x, target.z - root.position.z);
  };

  const update = (dt, t, camera) => {
    // pick next scripted action
    if (!action && queue.length && !path.length) action = queue.shift();

    // Target pose (radians); everything is damped towards it for smoothness.
    const pose = {
      hipsX: 0,
      neckX: 0,
      neckY: Math.sin(t * 0.6) * 0.18,
      neckZ: Math.sin(t * 0.9) * 0.04,
      lShZ: 0.08,
      rShZ: -0.08,
      lShX: 0,
      rShX: 0,
      lElX: 0,
      rElX: 0,
      rElZ: 0,
      legL: 0,
      legR: 0,
      kneeL: 0,
      kneeR: 0,
      bob: Math.sin(t * 2.2) * 0.006,
    };

    // Look at the camera (or a target) when standing still
    const look = lookTarget || camera?.position;
    if (look && !path.length) {
      const local = root.worldToLocal(look.clone());
      const yaw = Math.atan2(local.x, local.z);
      if (Math.abs(yaw) < 1.4) {
        pose.neckY = THREE.MathUtils.clamp(yaw, -0.7, 0.7) + Math.sin(t * 0.6) * 0.05;
        const dist = Math.hypot(local.x, local.z);
        pose.neckX = THREE.MathUtils.clamp(-Math.atan2(local.y - 1.9, dist) * 0.6, -0.35, 0.25);
      }
    }

    if (path.length) {
      // Walk towards the next waypoint
      const target = path[0];
      const to = target.clone().sub(root.position);
      to.y = 0;
      const dist = to.length();
      if (dist < 0.08) {
        path.shift();
        if (!path.length && onArrive) {
          const cb = onArrive;
          onArrive = null;
          cb();
        }
      } else {
        yawTarget = Math.atan2(to.x, to.z);
        const speed = 1.5;
        root.position.addScaledVector(to.normalize(), Math.min(dist, speed * dt));
        walkPhase += dt * 7.5;
        const s = Math.sin(walkPhase);
        pose.legL = s * 0.55;
        pose.legR = -s * 0.55;
        pose.kneeL = Math.max(0, -Math.cos(walkPhase)) * 0.7;
        pose.kneeR = Math.max(0, Math.cos(walkPhase)) * 0.7;
        pose.lShX = -s * 0.5;
        pose.rShX = s * 0.5;
        pose.lElX = -0.3;
        pose.rElX = -0.3;
        pose.bob = Math.abs(Math.cos(walkPhase)) * 0.04;
        pose.hipsX = 0.06;
        pose.neckY = 0;
      }
    }

    if (action) {
      action.t += dt;
      const k = action.t / action.duration;
      // 0→1→0 envelope with a hold in the middle
      const env = ease(THREE.MathUtils.clamp(Math.min(k / 0.3, (1 - k) / 0.3), 0, 1));
      if (action.name === 'bow') {
        pose.hipsX = 0.55 * env;
        pose.neckX = 0.2 * env;
        pose.neckY = 0;
        pose.lShX = pose.rShX = 0.1 * env;
        pose.lShZ = 0.02;
        pose.rShZ = -0.02;
      } else if (action.name === 'wave') {
        pose.rShZ = -2.5 * env;
        pose.rElZ = (-0.5 + Math.sin(action.t * 11) * 0.45) * env;
        pose.neckZ = 0.12 * env;
      } else if (action.name === 'nod') {
        pose.neckX = Math.sin(k * Math.PI * 3) * 0.25;
      } else if (action.name === 'cheer') {
        pose.lShZ = 2.6 * env;
        pose.rShZ = -2.6 * env;
        pose.lElX = pose.rElX = -0.4 * env;
        pose.bob = Math.abs(Math.sin(action.t * 9)) * 0.12 * env;
      }
      if (action.t >= action.duration) {
        action.onDone?.();
        action = null;
      }
    }

    // Turn the body
    if (yawTarget !== null) {
      let d = yawTarget - root.rotation.y;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      root.rotation.y += d * (1 - Math.exp(-8 * dt));
      if (Math.abs(d) < 0.002) yawTarget = null;
    }

    // Apply pose
    const K = 12;
    body.position.y = damp(body.position.y, pose.bob, K, dt);
    hips.rotation.x = damp(hips.rotation.x, pose.hipsX, K * 0.6, dt);
    neck.rotation.x = damp(neck.rotation.x, pose.neckX, K * 0.6, dt);
    neck.rotation.y = damp(neck.rotation.y, pose.neckY, K * 0.5, dt);
    neck.rotation.z = damp(neck.rotation.z, pose.neckZ, K * 0.5, dt);
    arms.left.shoulder.rotation.z = damp(arms.left.shoulder.rotation.z, pose.lShZ, K, dt);
    arms.right.shoulder.rotation.z = damp(arms.right.shoulder.rotation.z, pose.rShZ, K, dt);
    arms.left.shoulder.rotation.x = damp(arms.left.shoulder.rotation.x, pose.lShX, K, dt);
    arms.right.shoulder.rotation.x = damp(arms.right.shoulder.rotation.x, pose.rShX, K, dt);
    arms.left.elbow.rotation.x = damp(arms.left.elbow.rotation.x, pose.lElX, K, dt);
    arms.right.elbow.rotation.x = damp(arms.right.elbow.rotation.x, pose.rElX, K, dt);
    arms.right.elbow.rotation.z = damp(arms.right.elbow.rotation.z, pose.rElZ, K * 1.5, dt);
    legs[0].hip.rotation.x = damp(legs[0].hip.rotation.x, pose.legL, K * 1.5, dt);
    legs[1].hip.rotation.x = damp(legs[1].hip.rotation.x, pose.legR, K * 1.5, dt);
    legs[0].knee.rotation.x = damp(legs[0].knee.rotation.x, pose.kneeL, K * 1.5, dt);
    legs[1].knee.rotation.x = damp(legs[1].knee.rotation.x, pose.kneeR, K * 1.5, dt);
    // Waist plates sway with the legs
    J.kusazuri.forEach((p, i) => {
      const leg = i % 2 === 0 ? legs[1] : legs[0];
      p.rotation.x = -0.22 - Math.max(0, -leg.hip.rotation.x) * (i < 2 ? 0.8 : 0.2);
    });

    // Blink
    blinkTimer -= dt;
    if (blinkTimer <= 0) {
      blinkT = 0.16;
      blinkTimer = 2.5 + Math.random() * 3;
    }
    blinkT = Math.max(0, blinkT - dt);
    const lid = blinkT > 0 ? 0.12 : 1;
    J.eyes.forEach((e) => (e.scale.y = lid));

    // Talking: mouth flickers, eye rings pulse
    J.mouthMat.emissiveIntensity = talking ? (Math.sin(t * 22) > -0.2 ? 2.2 : 0.2) : 0;
    J.eyes.forEach((e) => e.scale.setX(talking ? 1 + Math.sin(t * 11) * 0.05 : 1));
  };

  return {
    root,
    update,
    play,
    walkTo,
    face,
    lookAt: (v) => (lookTarget = v),
    setTalking: (on) => (talking = on),
    get busy() {
      return !!action || queue.length > 0 || path.length > 0;
    },
  };
}
