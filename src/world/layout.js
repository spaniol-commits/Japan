// City layout in world units (~1 unit = 1 metre). The diorama is split by a
// river: the old town (Edo-style) lies to the west with Mount Fuji rising in
// the north-west corner, modern Tokyo spreads out to the east.

export const WORLD = { x0: -135, x1: 135, z0: -95, z1: 95, depth: 9 };
export const RIVER = { x0: -6, x1: 6, bed: -1.8, surface: -0.55 };

// Old town core (the original district) and its outskirts
export const MAIN_STREET = { z0: -2.6, z1: 2.6 };
export const POND = { x: -15, z: -15, r: 6.5 };
export const FUJI = { x: -92, z: -54, r: 41, h: 68 };
export const LAKE = { x: -72, z: -18, rx: 10, rz: 6.5 };
export const CASTLE = { x: -38, z: 70, moat: 20 };
export const PADDIES = { x0: -132, x1: -66, z0: 32, z1: 92 };
export const VILLAGE = { x0: -132, x1: -64, z0: -8, z1: 26 };

// Modern district: three east-west avenues and six north-south streets.
export const AVENUES = [
  { z0: -4, z1: 4, main: true },
  { z0: -53, z1: -47 },
  { z0: 41, z1: 47 },
];
export const AVENUE = AVENUES[0];
export const STREETS = [20, 40, 60, 80, 100, 120].map((x0) => ({ x0, x1: x0 + 6 }));
export const BLOCK_X = [[RIVER.x1 + 2, 20], ...STREETS.map((s, i) => [s.x1, STREETS[i + 1]?.x0 ?? WORLD.x1])];
export const BLOCK_Z = [
  [WORLD.z0, AVENUES[1].z0],
  [AVENUES[1].z1, AVENUE.z0],
  [AVENUE.z1, AVENUES[2].z0],
  [AVENUES[2].z1, WORLD.z1],
];
export const SIDEWALK_H = 0.22;

// Elevated railway along the north of the modern district.
export const RAIL = { z: -37, deck: 8, x0: RIVER.x1 + 1, x1: WORLD.x1 };

// Modern landmarks that take whole lots
export const PARKS = [
  { x0: 66, x1: 80, z0: 47, z1: 95 },
  { x0: 86, x1: 100, z0: 47, z1: 95 },
];
export const SKYTREE = { x: 113, z: -74 };
