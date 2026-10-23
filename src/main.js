import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { createStage, bakeStatic } from './scene.js';
import { loadFonts } from './core/signs.js';
import { buildTerrain } from './world/terrain.js';
import { buildOldTown } from './world/oldtown.js';
import { buildModern } from './world/modern.js';
import { buildLife } from './world/life.js';
import { LOCATIONS } from './locations.js';
import { createUI } from './ui.js';
import './style.css';

async function main() {
  const stage = createStage(document.getElementById('app'));
  await loadFonts();

  const city = new THREE.Group();
  stage.scene.add(city);
  buildTerrain(city);
  buildOldTown(city);
  buildModern(city);
  const stats = bakeStatic(city);
  const updateLife = buildLife(stage.scene);
  stage.scene.traverse((o) => {
    if (o.isInstancedMesh) o.frustumCulled = false;
  });

  const ui = createUI({
    locations: LOCATIONS,
    onSelect: (loc) => stage.flyTo(new THREE.Vector3(loc.pos[0], loc.labelY * 0.35, loc.pos[1]), 28 + loc.labelY * 1.4, 1.4, loc.facing),
    onOverview: () => stage.flyTo(new THREE.Vector3(0, 0, 0), 205, 1.6),
    onNight: (on) => stage.setNight(on),
  });

  // Floating, clickable place labels
  for (const loc of LOCATIONS) {
    const el = document.createElement('button');
    el.className = `place-label ${loc.district}`;
    el.innerHTML = `<span class="jp">${loc.jp}</span><span class="ro">${loc.romaji}</span>`;
    el.addEventListener('pointerdown', (e) => e.stopPropagation());
    el.addEventListener('click', () => ui.select(loc.id));
    const label = new CSS2DObject(el);
    label.position.set(loc.pos[0], loc.labelY, loc.pos[1]);
    stage.scene.add(label);
  }

  stage.controls.addEventListener('start', () => stage.cancelFlight());

  const timer = new THREE.Timer();
  stage.renderer.setAnimationLoop((now) => {
    timer.update(now);
    const dt = Math.min(timer.getDelta(), 0.05);
    updateLife(dt, timer.getElapsed());
    stage.update(dt);
  });

  // Gentle intro flight
  stage.flyTo(new THREE.Vector3(-2, 0, 0), 170, 2.6);
  ui.ready();
  console.info(`[machi] baked ${stats.merged} meshes into ${stats.drawCalls} draw calls`);
  window.__machi = { stage, stats };
}

main();
