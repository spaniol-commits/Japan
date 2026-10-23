import * as THREE from 'three';
import { box } from './geo.js';

/**
 * Japanese-style roof as a single mesh.
 *
 * Handles three shapes with one parameterisation:
 *   - hip roof (yosemune / irimoya look): ridge shorter than the long side
 *   - pyramid (pagoda tiers, pavilions): w === d
 *   - gable (kirizuma, townhouses): `gable: true`, ridge spans the full width
 *
 * `curve` bends the slope concave (steep at the ridge, flat at the eaves) and
 * `lift` raises the eave corners — the two features that read as "Japanese".
 * The roof sits with its eaves at y = 0 and is centred on the origin.
 */
export function roofGeometry({ w, d, h, curve = 0.6, lift = 0, gable = false, thickness = 0.22, segs = 6 }) {
  const a = w / 2;
  const b = d / 2;
  const E = [
    [-a, -b],
    [a, -b],
    [a, b],
    [-a, b],
  ];
  let R0, R1;
  if (gable) {
    R0 = [-a, 0];
    R1 = [a, 0];
  } else if (w >= d) {
    R0 = [-(a - b), 0];
    R1 = [a - b, 0];
  } else {
    R0 = [0, -(b - a)];
    R1 = [0, b - a];
  }
  // For each eave edge, the ridge segment it rises towards.
  const sides =
    gable || w >= d
      ? [
          [E[0], E[1], R0, R1],
          [E[1], E[2], R1, R1],
          [E[2], E[3], R1, R0],
          [E[3], E[0], R0, R0],
        ]
      : [
          [E[0], E[1], R0, R0],
          [E[1], E[2], R0, R1],
          [E[2], E[3], R1, R1],
          [E[3], E[0], R1, R0],
        ];
  // Gable roofs have no slopes on the short ends.
  const active = gable ? [sides[0], sides[2]] : sides;

  const profile = (u) => h * ((1 - curve) * u + curve * u * u);
  const point = (side, s, u) => {
    const [A, B, RA, RB] = side;
    const ex = A[0] + (B[0] - A[0]) * s;
    const ez = A[1] + (B[1] - A[1]) * s;
    const rx = RA[0] + (RB[0] - RA[0]) * s;
    const rz = RA[1] + (RB[1] - RA[1]) * s;
    const corner = Math.pow(Math.abs(2 * s - 1), 4) * (1 - u) * (1 - u);
    return [ex + (rx - ex) * u, profile(u) + lift * corner, ez + (rz - ez) * u];
  };

  const pos = [];
  const tri = (p, q, r) => pos.push(...p, ...q, ...r);
  const down = (p) => [p[0], p[1] - thickness, p[2]];

  for (const side of active) {
    for (let i = 0; i < segs; i++) {
      for (let j = 0; j < segs; j++) {
        const s0 = i / segs,
          s1 = (i + 1) / segs,
          u0 = j / segs,
          u1 = (j + 1) / segs;
        const p00 = point(side, s0, u0),
          p10 = point(side, s1, u0),
          p01 = point(side, s0, u1),
          p11 = point(side, s1, u1);
        // top surface
        tri(p00, p11, p10);
        tri(p00, p01, p11);
        // underside
        tri(down(p00), down(p10), down(p11));
        tri(down(p00), down(p11), down(p01));
      }
      // fascia along the eave
      const e0 = point(side, i / segs, 0);
      const e1 = point(side, (i + 1) / segs, 0);
      tri(e0, e1, down(e1));
      tri(e0, down(e1), down(e0));
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array((pos.length / 3) * 2), 2));
  geo.computeVertexNormals();
  return geo;
}

/** Roof mesh with an optional ridge cap, eaves placed at height y. */
export function roof(parent, opts, material, x = 0, y = 0, z = 0, ridgeMaterial = null) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  const mesh = new THREE.Mesh(roofGeometry(opts), material);
  g.add(mesh);
  if (ridgeMaterial) {
    const { w, d, h, gable } = opts;
    const len = gable ? w + 0.2 : Math.abs(w - d) + 0.4;
    if (w >= d || gable) box(g, len, 0.3, 0.35, ridgeMaterial, 0, h - 0.12, 0);
    else box(g, 0.35, 0.3, len, ridgeMaterial, 0, h - 0.12, 0);
  }
  parent.add(g);
  return g;
}

/** Single sloped plane (lean-to awning, hisashi), high edge at the back (−z). */
export function leanTo(parent, w, depth, drop, material, x, y, z) {
  const len = Math.hypot(depth, drop);
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.18, len), material);
  m.position.set(x, y - drop / 2, z + depth / 2);
  m.rotation.x = Math.atan2(drop, depth);
  parent.add(m);
  return m;
}
