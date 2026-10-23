import * as THREE from 'three';
import { tint, tintGlow } from './palette.js';

// Shared palette, loosely sampled from the reference dioramas:
// warm timber, cream plaster, slate roof tiles, vermilion shrine red,
// and the pink/lavender sky of the low-poly renders.
export const C = {
  wood: '#b8733a',
  woodLight: '#d89a5b',
  woodDark: '#6b3a22',
  woodDeep: '#4a2617',
  plaster: '#efe4cf',
  plasterWarm: '#e9cdb3',
  roofSlate: '#4f5d66',
  roofTeal: '#3e5a60',
  roofTerracotta: '#c8693e',
  roofPlum: '#8a3e63',
  roofGray: '#7c8287',
  vermilion: '#d1352b',
  black: '#26221f',
  stone: '#a7a39a',
  stoneDark: '#7b776f',
  soil: '#7a4f36',
  soilDark: '#5b3826',
  path: '#c9b79a',
  grass: '#9fb36b',
  grassDark: '#7f9a52',
  sand: '#d9c8a6',
  asphalt: '#4b4d52',
  sidewalk: '#b9b6b0',
  curb: '#d6d3cc',
  white: '#f4f2ee',
  sakura: ['#f6b7cf', '#f19bbb', '#fbd3e0', '#e886ad'],
  leaf: ['#6f9a4e', '#5d8a43', '#86ab5c'],
  water: '#3fd0c9',
};

const cache = new Map();

/** Cached flat-shaded standard material, so identical colors share one instance (needed for merging). */
export function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  let m = cache.get(key);
  if (!m) {
    const o = { ...opts };
    if (o.emissive) o.emissive = tintGlow(o.emissive);
    m = new THREE.MeshStandardMaterial({ color: tint(color), roughness: 0.85, metalness: 0, flatShading: true, ...o });
    cache.set(key, m);
  }
  return m;
}

/** Like `mat`, but the colour is used exactly as given (no theme tint). */
export function matExact(color, opts = {}) {
  const key = 'exact' + color + JSON.stringify(opts);
  let m = cache.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, flatShading: true, ...opts });
    cache.set(key, m);
  }
  return m;
}

// Materials whose emissive glow follows the day/night cycle.
const glowing = [];

/** Register a material to glow at night. `day` is its emissive intensity at noon, `night` at midnight. */
export function glow(material, night = 1.5, day = 0) {
  glowing.push({ material, night, day });
  material.emissiveIntensity = day;
  return material;
}

/** Emissive material (lanterns, neon, lit windows) that brightens at night. */
export function glowMat(color, emissive = color, night = 1.6, day = 0.15, opts = {}) {
  const key = 'glow' + color + emissive + night + day + JSON.stringify(opts);
  let m = cache.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color: tint(color), emissive: tintGlow(emissive), roughness: 0.6, flatShading: true, ...opts });
    glow(m, night, day);
    cache.set(key, m);
  }
  return m;
}

export function applyNight(t) {
  for (const g of glowing) g.material.emissiveIntensity = THREE.MathUtils.lerp(g.day, g.night, t);
}
