// City layout in world units (~1 unit = 1 metre).
//
//                 north (−z)
//   ┌──────────────────┬─────┬──────────────────────────┐
//   │  Mount Fuji      │  r  │ central park │ downtown  │
//   │  + lake, pagoda  │  i  ├──────────────┴───────────┤
//   │ onsen │ old town │  v  │ modern Tokyo │ shopping  │
//   │ valley│ village  │  e  │              │ arcade    │
//   │═══════════════ Shinkansen ═════════════════════════│
//   │ tea & farms      │  r  │ station/port │ airport   │
//   │~~~~~~~~~~~~~~~~~~~ sea ~~~~~~~~~~~~~~│           │
//   └──────────────────────────────────────┴───────────┘
//                 south (+z)

export const WORLD = { x0: -300, x1: 300, z0: -215, z1: 215, depth: 10 };
export const RIVER = { x0: -6, x1: 6, bed: -1.8, surface: -0.55 };
export const COAST = 172; // the bay starts south of this line
export const SEA = { x0: WORLD.x0, x1: 160, z0: COAST, z1: WORLD.z1 };

// Old town core (the original district) and its outskirts
export const MAIN_STREET = { z0: -2.6, z1: 2.6 };
export const POND = { x: -15, z: -15, r: 6.5 };
export const FUJI = { x: -185, z: -112, r: 98, h: 150 };
export const LAKE = { x: -72, z: -18, rx: 10, rz: 6.5 };
export const FUJI_LAKE = { x: -50, z: -152, rx: 24, rz: 13 };
export const CHUREITO = { x: -24, z: -118 };
export const CASTLE = { x: -38, z: 70, moat: 20 };
export const PADDIES = { x0: -132, x1: -66, z0: 32, z1: 92 };
export const VILLAGE = { x0: -132, x1: -64, z0: -8, z1: 26 };
export const ONSEN = { x0: -296, x1: -150, z0: -6, z1: 90 };
export const COUNTRY = { x0: -296, x1: -62, z0: 106, z1: COAST - 2 };

// Modern district: avenues run east from the river, streets every 20 units.
// (Order matters: index 1 and 2 are used by the old-town paths and bridges.)
export const AVENUES = [
  { z0: -4, z1: 4, main: true },
  { z0: -53, z1: -47 },
  { z0: 41, z1: 47 },
  { z0: -103, z1: -97 },
];
export const AVENUE = AVENUES[0];
export const GRID = { x0: RIVER.x1 + 2, x1: WORLD.x1, z1: 95 };
const ROWS = [
  [WORLD.z0, -103],
  [-97, -53],
  [-47, -4],
  [4, 41],
  [47, GRID.z1],
];
// Streets west of x=140 stop at the north avenue; the land beyond is the park.
export const STREETS = [];
for (let x0 = 20; x0 < WORLD.x1 - 10; x0 += 20) STREETS.push({ x0, x1: x0 + 6, z0: x0 < 140 ? -97 : WORLD.z0, z1: GRID.z1 });
export const SIDEWALK_H = 0.22;

/** Every city block as a rectangle; each row is cut by the streets running through it. */
export const BLOCKS = [];
for (const [z0, z1] of ROWS) {
  let x = GRID.x0;
  for (const s of STREETS.filter((s) => s.z0 <= z0)) {
    BLOCKS.push({ x0: x, x1: s.x0, z0, z1 });
    x = s.x1;
  }
  BLOCKS.push({ x0: x, x1: GRID.x1, z0, z1 });
}

// Railways: the commuter viaduct in the city and the Shinkansen across the map.
export const RAIL = { z: -37, deck: 8, x0: RIVER.x1 + 1, x1: WORLD.x1 };
export const SHINKANSEN = { z: 99, deck: 9, x0: WORLD.x0, x1: WORLD.x1 };

// Landmarks
export const PARKS = BLOCKS.filter((b) => b.z0 === WORLD.z0 && b.x1 <= 140).concat([
  { x0: 66, x1: 80, z0: 47, z1: GRID.z1 },
  { x0: 86, x1: 100, z0: 47, z1: GRID.z1 },
]);
export const SKYTREE = { x: 113, z: -74 };
export const ARCADE = { x0: 146, x1: 280, z0: 21, z1: 27 };
export const FUKUYA = { x: 153, z: 10.4 };
export const GRAND_STATION = { x: 96, z: 122 };
export const HARBOUR = { x0: 8, x1: 158, z0: 140, z1: COAST };
export const AIRPORT = { x0: 162, x1: WORLD.x1, z0: 106, z1: WORLD.z1 };
