import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mat, glowMat } from '../core/materials.js';
import { sign } from '../core/signs.js';

/**
 * Bim (ビム), the trainer: a small companion robot in the spirit of Robohon,
 * dressed as a samurai — kabuto helmet with a golden crescent, lacquered
 * shoulder guards and waist plates, an obi with a katana and a back banner.
 *
 * About 2.1 units tall. Built facing +z with named pivots so it can idle,
 * blink, bow (ojigi), wave, walk and "talk".
 */

const smooth = { flatShading: false };
const M = {
  black: mat('#1b1c1f', { ...smooth, roughness: 0.28 }),
  white: mat('#f5f4f0', { ...smooth, roughness: 0.3, emissive: '#ffffff', emissiveIntensity: 0.06 }),
  gray: mat('#4a4d52', { ...smooth, roughness: 0.4 }),
  lacquer: mat('#b3202b', { ...smooth, roughness: 0.32 }),
  darkLacquer: mat('#2a1d1c', { ...smooth, roughness: 0.3 }),
  gold: mat('#d6a93c', { ...smooth, roughness: 0.28, metalness: 0.75 }),
  orange: mat('#ff7a1a', { ...smooth, roughness: 0.4 }),
  obi: mat('#4b2a6b', { ...smooth, roughness: 0.6 }),
  hilt: mat('#ece5d3', { ...smooth, roughness: 0.7 }),
  eyeRing: glowMat('#ffb347', '#ff8a1f', 2.4, 1.1, smooth),
  eyeBlack: mat('#0d0d10', { ...smooth, roughness: 0.15 }),
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

function buildHead(head, J) {
  // Black shell with the white face plate bulging out at the front
  const shell = mesh(head, new THREE.SphereGeometry(0.34, 32, 24), M.black, 0, 0.3, 0);
  shell.scale.set(1.12, 0.95, 1.0);
  const face = mesh(head, new THREE.SphereGeometry(0.31, 32, 24), M.white, 0, 0.25, 0.08);
  face.scale.set(1.08, 0.8, 0.95);

  // Eyes: black lenses ringed with glowing amber
  J.eyes = [];
  for (const s of [-1, 1]) {
    const eye = pivot(head, s * 0.125, 0.28, 0.343);
    eye.rotation.y = s * 0.32;
    const lens = mesh(eye, new THREE.CylinderGeometry(0.072, 0.072, 0.03, 28), M.eyeBlack);
    lens.rotation.x = Math.PI / 2;
    mesh(eye, new THREE.TorusGeometry(0.082, 0.016, 10, 32), M.eyeRing, 0, 0, 0.012);
    const shine = mesh(eye, new THREE.SphereGeometry(0.014, 8, 6), mat('#ffffff', { ...smooth, emissive: '#ffffff', emissiveIntensity: 0.6 }), -0.025, 0.025, 0.02);
    shine.scale.z = 0.4;
    J.eyes.push(eye);
  }
  // Little mouth that lights up when Bim speaks
  J.mouthMat = new THREE.MeshStandardMaterial({ color: '#3a3a40', emissive: '#ff8a1f', emissiveIntensity: 0, roughness: 0.3 });
  const mouth = mesh(head, new THREE.CapsuleGeometry(0.028, 0.05, 4, 12), J.mouthMat, 0, 0.13, 0.355);
  mouth.rotation.z = Math.PI / 2;
  mouth.scale.z = 0.5;

  // Ear discs
  for (const s of [-1, 1]) {
    const ear = mesh(head, new THREE.CylinderGeometry(0.15, 0.15, 0.06, 32), M.gold, s * 0.36, 0.29, -0.02);
    ear.rotation.z = Math.PI / 2;
    const rim = mesh(head, new THREE.TorusGeometry(0.15, 0.018, 8, 32), M.orange, s * 0.39, 0.29, -0.02);
    rim.rotation.y = Math.PI / 2;
  }

  // --- Kabuto ---------------------------------------------------------------
  const helm = pivot(head, 0, 0.3, 0);
  const bowlG = pivot(helm);
  bowlG.scale.set(1.12, 0.98, 1.04);
  mesh(bowlG, new THREE.SphereGeometry(0.36, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.36), M.darkLacquer);
  // Raised ribs on the bowl (suji-bachi), each a meridian arc from the crown to the rim
  for (let i = 0; i < 6; i++) {
    const rib = mesh(bowlG, new THREE.TorusGeometry(0.359, 0.006, 4, 24, Math.PI * 0.36), M.gold);
    rib.rotation.set(0, (i / 6) * Math.PI * 2, Math.PI / 2 - Math.PI * 0.36);
  }
  // Golden rim (koshimaki) where bowl meets the visor
  const rimY = 0.36 * Math.cos(Math.PI * 0.36) * 0.98;
  const rimR = 0.36 * Math.sin(Math.PI * 0.36);
  const band = mesh(helm, new THREE.TorusGeometry(rimR, 0.022, 8, 40), M.gold, 0, rimY, 0);
  band.rotation.x = Math.PI / 2;
  band.scale.set(1.12, 1.04, 1);
  mesh(helm, new THREE.TorusGeometry(0.05, 0.014, 8, 16), M.gold, 0, 0.36, 0).rotation.x = Math.PI / 2; // tehen

  // Visor peak (mabizashi)
  const visor = mesh(helm, new THREE.CylinderGeometry(0.4, 0.4, 0.022, 32, 1, false, -Math.PI * 0.3, Math.PI * 0.6), M.darkLacquer, 0, rimY, 0);
  visor.scale.set(1.0, 1, 0.9);
  visor.rotation.x = -0.28;

  // Neck guard (shikoro): flared lacquer tiers around the back
  for (let k = 0; k < 3; k++) {
    const r0 = 0.37 + k * 0.03;
    const tier = mesh(
      helm,
      new THREE.CylinderGeometry(r0, r0 + 0.035, 0.09, 32, 1, true, Math.PI * 0.3, Math.PI * 1.4),
      mat(k % 2 ? '#9e1c26' : '#b3202b', { ...smooth, roughness: 0.32, side: THREE.DoubleSide }),
      0,
      rimY - 0.06 - k * 0.075,
      -0.01,
    );
    tier.scale.x = 1.08;
    const lace = mesh(helm, new THREE.TorusGeometry(r0 + 0.035, 0.006, 4, 32, Math.PI * 1.4), M.gold, 0, rimY - 0.105 - k * 0.075, -0.01);
    lace.rotation.set(Math.PI / 2, 0, -Math.PI * 1.2);
    lace.scale.set(1.08, 1, 1);
  }
  // Turned-back flaps (fukigaeshi) with a gold crest
  for (const s of [-1, 1]) {
    const f = pivot(helm, s * 0.4, rimY - 0.07, 0.15);
    f.rotation.y = s * 1.05;
    rbox(f, 0.15, 0.15, 0.03, M.lacquer, 0, 0, 0, 0.02);
    const mon = mesh(f, new THREE.CylinderGeometry(0.035, 0.035, 0.02, 16), M.gold, 0, 0, 0.02);
    mon.rotation.x = Math.PI / 2;
  }
  // Front crest (maedate): golden crescent moon on a sun disc
  const crest = pivot(helm, 0, rimY + 0.07, 0.33);
  crest.rotation.x = -0.12;
  const disc = mesh(crest, new THREE.CylinderGeometry(0.06, 0.06, 0.025, 24), M.gold);
  disc.rotation.x = Math.PI / 2;
  const sun = mesh(crest, new THREE.CylinderGeometry(0.035, 0.035, 0.03, 24), M.lacquer, 0, 0, 0.004);
  sun.rotation.x = Math.PI / 2;
  const moon = mesh(crest, new THREE.TorusGeometry(0.3, 0.028, 8, 40, Math.PI), M.gold, 0, 0.02, 0);
  moon.scale.set(1.15, 0.85, 0.6);
}

function buildArm(parent, s, J) {
  const shoulder = pivot(parent, s * 0.37, 0.6, 0);
  mesh(shoulder, new THREE.SphereGeometry(0.1, 20, 14), M.black);
  rbox(shoulder, 0.15, 0.28, 0.17, M.black, s * 0.01, -0.15, 0, 0.06);
  const elbow = pivot(shoulder, s * 0.01, -0.29, 0);
  mesh(elbow, new THREE.SphereGeometry(0.07, 16, 10), M.gray);
  rbox(elbow, 0.14, 0.24, 0.16, M.black, 0, -0.13, 0, 0.06);
  // C-shaped white hand
  const hand = pivot(elbow, 0, -0.31, 0.01);
  const c = mesh(hand, new THREE.TorusGeometry(0.065, 0.034, 12, 24, Math.PI * 1.45), M.white);
  c.rotation.set(0, Math.PI / 2, Math.PI * 0.27 + Math.PI);
  return { shoulder, elbow };
}

function buildSode(parent, s) {
  // Lacquered shoulder guard, three lamellar plates laced in gold
  const g = pivot(parent, s * 0.42, 0.7, 0);
  g.rotation.z = -s * 0.45;
  for (let k = 0; k < 3; k++) {
    rbox(g, 0.24, 0.075, 0.3, k === 0 ? M.lacquer : mat(k === 1 ? '#a51d28' : '#b3202b', { ...smooth, roughness: 0.32 }), s * k * 0.012, -k * 0.072, 0, 0.025);
    rbox(g, 0.245, 0.012, 0.305, M.gold, s * k * 0.012, -k * 0.072 - 0.035, 0, 0.004);
  }
  return g;
}

function buildLeg(parent, s) {
  const hip = pivot(parent, s * 0.14, 0.78, 0);
  rbox(hip, 0.2, 0.26, 0.24, M.black, 0, -0.13, 0, 0.06);
  const knee = pivot(hip, 0, -0.27, 0);
  rbox(knee, 0.22, 0.36, 0.27, M.black, 0, -0.17, 0, 0.07);
  rbox(knee, 0.235, 0.06, 0.285, M.white, 0, -0.07, 0, 0.025);
  mesh(knee, new THREE.CylinderGeometry(0.06, 0.06, 0.06, 12), M.gray, 0, -0.37, 0);
  const foot = pivot(knee, 0, -0.44, 0);
  rbox(foot, 0.26, 0.11, 0.4, M.white, 0, 0.0, 0.04, 0.05);
  rbox(foot, 0.25, 0.025, 0.39, M.orange, 0, -0.065, 0.04, 0.01);
  return { hip, knee };
}

function buildTorso(hips, J) {
  rbox(hips, 0.46, 0.18, 0.3, M.black, 0, 0.04, 0, 0.06);
  rbox(hips, 0.6, 0.58, 0.4, M.black, 0, 0.42, 0, 0.12);
  // White chest plate
  const chest = mesh(hips, new THREE.CapsuleGeometry(0.16, 0.2, 8, 20), M.white, 0, 0.4, 0.16);
  chest.scale.set(1, 1, 0.38);
  const badge = sign(hips, 'ビム', 0.2, 0.075, { bg: '#ff7a1a', fg: '#ffffff', weight: 900, depth: 0.01 }, 0, 0.5, 0.222);
  badge.rotation.x = -0.12;

  // Obi sash and knot
  rbox(hips, 0.62, 0.09, 0.42, M.obi, 0, 0.16, 0, 0.04);
  rbox(hips, 0.1, 0.1, 0.06, M.obi, -0.16, 0.16, 0.22, 0.03);

  // Waist plates (kusazuri)
  const plates = [
    [-0.13, 0.2, 0],
    [0.13, 0.2, 0],
    [0.3, 0, Math.PI / 2],
    [-0.3, 0, -Math.PI / 2],
    [-0.13, -0.2, Math.PI],
    [0.13, -0.2, Math.PI],
  ];
  J.kusazuri = [];
  for (const [x, z, ry] of plates) {
    const p = pivot(hips, x, 0.12, z);
    p.rotation.set(-0.22, ry, 0, 'YXZ');
    rbox(p, 0.2, 0.22, 0.03, M.lacquer, 0, -0.11, 0.02, 0.012);
    for (const y of [-0.05, -0.12, -0.19]) rbox(p, 0.205, 0.008, 0.034, M.gold, 0, y, 0.022, 0.003);
    J.kusazuri.push(p);
  }

  // Katana tucked into the obi on the left hip, handle forward
  const katana = pivot(hips, 0.31, 0.16, 0.04);
  katana.rotation.set(-0.38, 0.12, 0);
  rbox(katana, 0.045, 0.055, 0.9, M.darkLacquer, 0, 0, -0.28, 0.02);
  rbox(katana, 0.05, 0.06, 0.04, M.gold, 0, 0, -0.73, 0.01); // kojiri
  const tsuba = mesh(katana, new THREE.CylinderGeometry(0.065, 0.065, 0.02, 20), M.gold, 0, 0, 0.18);
  tsuba.rotation.x = Math.PI / 2;
  rbox(katana, 0.042, 0.05, 0.26, M.hilt, 0, 0, 0.32, 0.015);
  for (let k = 0; k < 5; k++) rbox(katana, 0.046, 0.054, 0.012, M.black, 0, 0, 0.21 + k * 0.05, 0.004);
  rbox(katana, 0.048, 0.056, 0.03, M.gold, 0, 0, 0.46, 0.01); // kashira

  // Back banner (sashimono): 先生
  const pole = mesh(hips, new THREE.CylinderGeometry(0.012, 0.012, 1.15, 8), M.black, 0.06, 0.95, -0.23);
  pole.rotation.z = -0.05;
  const flag = sign(hips, '先生', 0.2, 0.46, { bg: '#f4efe4', fg: '#b3202b', vertical: true, depth: 0.012, backFace: true, border: '#b3202b' }, 0.06, 1.02, -0.345, Math.PI / 2);
  J.flag = flag;

  mesh(hips, new THREE.CylinderGeometry(0.07, 0.08, 0.1, 16), M.gray, 0, 0.74, 0); // neck
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
