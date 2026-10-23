// City layout in world units (~1 unit = 1 metre). The diorama is split by a
// river: the old town (Edo-style) lies to the west, modern Tokyo to the east.

export const WORLD = { x0: -60, x1: 60, z0: -42, z1: 42, depth: 7 };
export const RIVER = { x0: -6, x1: 6, bed: -1.8, surface: -0.55 };

// Old town
export const MAIN_STREET = { z0: -2.6, z1: 2.6 };
export const POND = { x: -15, z: -15, r: 6.5 };

// Modern district: one east-west avenue and two north-south streets.
export const AVENUE = { z0: -4, z1: 4 };
export const STREETS = [
  { x0: 20, x1: 26 },
  { x0: 40, x1: 46 },
];
export const BLOCK_X = [
  [RIVER.x1 + 2, 20],
  [26, 40],
  [46, WORLD.x1],
];
export const BLOCK_Z = [
  [WORLD.z0, AVENUE.z0],
  [AVENUE.z1, WORLD.z1],
];
export const SIDEWALK_H = 0.22;

// Elevated railway along the north edge of the modern district.
export const RAIL = { z: -37, deck: 8, x0: RIVER.x1 + 1, x1: WORLD.x1 };
