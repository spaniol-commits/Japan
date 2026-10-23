import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { createStage, bakeStatic } from './scene.js';
import { loadFonts } from './core/signs.js';
import { buildTerrain } from './world/terrain.js';
import { buildOldTown } from './world/oldtown.js';
import { buildOutskirts } from './world/outskirts.js';
import { buildExpansion } from './world/expansion.js';
import { buildModern } from './world/modern.js';
import { buildLife } from './world/life.js';
import { LOCATIONS } from './locations.js';
import { createUI, speak } from './ui.js';
import { createBim } from './trainer/bim.js';
import { TRAINER } from './trainer/profile.js';
import './style.css';

async function main() {
  const stage = createStage(document.getElementById('app'));
  await loadFonts();

  const city = new THREE.Group();
  stage.scene.add(city);
  buildTerrain(city);
  buildOldTown(city);
  buildOutskirts(city);
  const updateExpansion = buildExpansion(city, stage.scene);
  buildModern(city);
  const stats = bakeStatic(city, { lod: true });
  const updateLife = buildLife(stage.scene, stage);
  stage.scene.traverse((o) => {
    if (o.isInstancedMesh) o.frustumCulled = false;
  });

  // Bim, the trainer, waits at the old-town end of the bridge
  const bim = createBim();
  const home = TRAINER.home;
  bim.root.position.set(home.x, 0.1, home.z);
  bim.root.rotation.y = home.yaw;
  bim.root.scale.setScalar(0.85);
  stage.scene.add(bim.root);
  const bimFacing = () => [Math.sin(bim.root.rotation.y), Math.cos(bim.root.rotation.y)];
  const talk = (extra = {}) => ({
    pitch: 1.45,
    rate: 0.9,
    ...extra,
    onStart: () => bim.setTalking(true),
    onEnd: () => {
      bim.setTalking(false);
      extra.onEnd?.();
    },
  });
  const say = (text) => new Promise((resolve) => speak(text, talk({ onEnd: resolve })));

  let meeting = 0;
  const meetBim = async () => {
    const id = ++meeting;
    stage.follow(null);
    bim.face(home.yaw);
    const pos = bim.root.position;
    const yaw = home.yaw;
    stage.flyTo(new THREE.Vector3(pos.x, 1.1, pos.z), 5.4, 1.6, [Math.sin(yaw), Math.cos(yaw)], 0.24, 0.2);
    await new Promise((r) => setTimeout(r, 1500));
    if (id !== meeting) return;
    bim.play('bow');
    await say(TRAINER.phrases[0].jp);
    if (id !== meeting) return;
    bim.play('wave');
    await say(TRAINER.phrases[1].jp);
  };

  const trainerAction = async (name, phrase) => {
    if (name === 'say') {
      bim.play('nod');
      return say(phrase.jp);
    }
    if (name === 'walk') {
      if (bim.busy) return;
      stage.follow(bim.root);
      await bim.walkTo(TRAINER.stroll);
      bim.face(home.yaw);
      bim.play('bow');
      return;
    }
    bim.play(name);
    if (name === 'bow') say('よろしくお願いします。');
    if (name === 'cheer') say('がんばって！');
    if (name === 'wave') say('やあ！');
  };

  const ui = createUI({
    locations: LOCATIONS,
    trainer: TRAINER,
    onMeetTrainer: meetBim,
    onTrainerAction: trainerAction,
    onSpeak: () => talk({ pitch: 1 }),
    onSelect: (loc) => (meeting++, stage.flyTo(new THREE.Vector3(loc.pos[0], loc.labelY * 0.35, loc.pos[1]), 28 + loc.labelY * 1.4, 1.4, loc.facing)),
    onOverview: () => (meeting++, stage.flyTo(new THREE.Vector3(0, 0, 0), 920, 2.0)),
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

  // Bim's own label rides along with him
  const bimLabel = document.createElement('button');
  bimLabel.className = 'place-label trainer';
  bimLabel.innerHTML = `<span class="jp">ビム先生</span><span class="ro">Bim · your trainer</span>`;
  bimLabel.addEventListener('pointerdown', (e) => e.stopPropagation());
  bimLabel.addEventListener('click', () => ui.select('trainer'));
  const bimTag = new CSS2DObject(bimLabel);
  bimTag.position.set(0, 3.2, 0);
  bim.root.add(bimTag);

  stage.controls.addEventListener('start', () => stage.cancelFlight());

  const timer = new THREE.Timer();
  let lodTimer = 0;
  stage.renderer.setAnimationLoop((now) => {
    timer.update(now);
    const dt = Math.min(timer.getDelta(), 0.05);
    updateLife(dt, timer.getElapsed());
    updateExpansion(dt, timer.getElapsed());
    // Small details only near the camera
    if ((lodTimer -= dt) <= 0) {
      lodTimer = 0.25;
      for (const m of stats.details) m.visible = m.geometry.boundingSphere.center.distanceTo(stage.camera.position) < 260;
    }
    bim.update(dt, timer.getElapsed(), stage.camera);
    stage.update(dt);
  });

  // Gentle intro flight
  stage.flyTo(new THREE.Vector3(-10, 4, 0), 860, 2.8);
  ui.ready();
  console.info(`[machi] baked ${stats.merged} meshes into ${stats.drawCalls} draw calls`);
  window.__machi = { stage, stats, bim };
}

main();
