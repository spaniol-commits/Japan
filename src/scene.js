import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { applyNight } from './core/materials.js';
import { THEME } from './core/palette.js';
import { WORLD } from './world/layout.js';

const PASTEL = THEME !== 'classic';
const DAY = {
  skyTop: new THREE.Color(PASTEL ? '#3f86f7' : '#9d84e3'),
  skyBottom: new THREE.Color(PASTEL ? '#acd0ff' : '#ffc4d6'),
  sun: new THREE.Color(PASTEL ? '#ffffff' : '#fff1dc'),
  sunI: PASTEL ? 2.2 : 2.6,
  hemiI: PASTEL ? 1.35 : 1.25,
  bloom: PASTEL ? 0.05 : 0.12,
  exposure: PASTEL ? 0.95 : 1.0,
};
const NIGHT = {
  skyTop: new THREE.Color('#0a0f2e'),
  skyBottom: new THREE.Color(PASTEL ? '#23406e' : '#40285e'),
  sun: new THREE.Color('#8fa8ff'),
  sunI: 0.45,
  hemiI: 0.6,
  bloom: 0.55,
  exposure: 1.05,
};

/** Renderer, camera, lights, sky, post-processing and the day/night cycle. */
export function createStage(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  container.appendChild(renderer.domElement);

  const labels = new CSS2DRenderer();
  labels.setSize(window.innerWidth, window.innerHeight);
  labels.domElement.className = 'label-layer';
  container.appendChild(labels.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, window.innerWidth / window.innerHeight, 1, 1200);
  camera.position.set(-150, 120, 170);

  const controls = new OrbitControls(camera, labels.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.maxPolarAngle = 1.32;
  controls.minDistance = 4;
  controls.maxDistance = 280;
  controls.target.set(0, 0, 0);
  controls.screenSpacePanning = false;

  // Sky dome with a vertical gradient (the pastel backdrop of the references)
  const skyUniforms = { top: { value: DAY.skyTop.clone() }, bottom: { value: DAY.skyBottom.clone() } };
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(600, 32, 16),
    new THREE.ShaderMaterial({
      uniforms: skyUniforms,
      side: THREE.BackSide,
      depthWrite: false,
      vertexShader: `varying vec3 vPos; void main(){ vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `uniform vec3 top; uniform vec3 bottom; varying vec3 vPos;
        void main(){ float h = clamp(normalize(vPos).y * 1.4 + 0.35, 0.0, 1.0); gl_FragColor = vec4(mix(bottom, top, h), 1.0); }`,
    }),
  );
  scene.add(sky);

  // Stars, only visible at night
  const starGeo = new THREE.BufferGeometry();
  const starPos = [];
  for (let i = 0; i < 900; i++) {
    const v = new THREE.Vector3().randomDirection();
    v.y = Math.abs(v.y) * 0.9 + 0.1;
    starPos.push(...v.normalize().multiplyScalar(550).toArray());
  }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
  const starMat = new THREE.PointsMaterial({ color: '#ffffff', size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0 });
  scene.add(new THREE.Points(starGeo, starMat));

  const hemi = new THREE.HemisphereLight(PASTEL ? '#f4f8ff' : '#fff4f8', PASTEL ? '#7f97c4' : '#8a6f86', DAY.hemiI);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(DAY.sun, DAY.sunI);
  sun.position.set(60, 90, 45);
  sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096);
  const sc = sun.shadow.camera;
  sc.left = -85;
  sc.right = 85;
  sc.top = 70;
  sc.bottom = -70;
  sc.near = 10;
  sc.far = 260;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.04;
  scene.add(sun);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), DAY.bloom, 0.45, 0.88);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    labels.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
  });

  let night = 0;
  let nightTarget = 0;
  const setNight = (on) => (nightTarget = on ? 1 : 0);
  const applyLighting = (t) => {
    skyUniforms.top.value.lerpColors(DAY.skyTop, NIGHT.skyTop, t);
    skyUniforms.bottom.value.lerpColors(DAY.skyBottom, NIGHT.skyBottom, t);
    sun.color.lerpColors(DAY.sun, NIGHT.sun, t);
    sun.intensity = THREE.MathUtils.lerp(DAY.sunI, NIGHT.sunI, t);
    hemi.intensity = THREE.MathUtils.lerp(DAY.hemiI, NIGHT.hemiI, t);
    bloom.strength = THREE.MathUtils.lerp(DAY.bloom, NIGHT.bloom, t);
    renderer.toneMappingExposure = THREE.MathUtils.lerp(DAY.exposure, NIGHT.exposure, t);
    starMat.opacity = Math.max(0, t * 1.2 - 0.2);
    applyNight(t);
  };
  applyLighting(0);

  // Smooth camera flights between places
  let flight = null;
  let follow = null;
  const flyTo = (target, distance = 34, duration = 1.4, facing = null, pitch = 0.85, side = 0.55) => {
    follow = null;
    let dir;
    if (facing) {
      // three-quarter view of the entrance: facing direction, nudged sideways, from above
      dir = new THREE.Vector3(facing[0] + facing[1] * side, 0, facing[1] - facing[0] * side).normalize();
      dir.y = pitch;
    } else {
      dir = camera.position.clone().sub(controls.target).normalize();
      dir.y = THREE.MathUtils.clamp(dir.y, 0.45, 0.75); // keep a pleasant oblique angle
    }
    dir.normalize();
    flight = {
      t: 0,
      duration,
      fromPos: camera.position.clone(),
      fromTarget: controls.target.clone(),
      toTarget: target.clone(),
      toPos: target.clone().addScaledVector(dir, distance),
    };
  };
  const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

  const update = (dt) => {
    if (Math.abs(night - nightTarget) > 0.001) {
      night += Math.sign(nightTarget - night) * Math.min(Math.abs(nightTarget - night), dt / 1.8);
      applyLighting(night);
    }
    if (flight) {
      flight.t = Math.min(1, flight.t + dt / flight.duration);
      const k = ease(flight.t);
      camera.position.lerpVectors(flight.fromPos, flight.toPos, k);
      controls.target.lerpVectors(flight.fromTarget, flight.toTarget, k);
      if (flight.t >= 1) flight = null;
    } else if (follow) {
      // Keep a moving object (Bim) centred, preserving the user's orbit angle
      const desired = follow.obj.getWorldPosition(new THREE.Vector3()).add(follow.offset);
      const delta = desired.sub(controls.target).multiplyScalar(1 - Math.exp(-4 * dt));
      controls.target.add(delta);
      camera.position.add(delta);
    }
    // keep the orbit centre on the diorama
    controls.target.x = THREE.MathUtils.clamp(controls.target.x, WORLD.x0, WORLD.x1);
    controls.target.z = THREE.MathUtils.clamp(controls.target.z, WORLD.z0, WORLD.z1);
    controls.target.y = THREE.MathUtils.clamp(controls.target.y, 0, 20);
    controls.update();
    composer.render();
    labels.render(scene, camera);
  };

  return {
    renderer,
    scene,
    camera,
    controls,
    update,
    setNight,
    isNight: () => nightTarget === 1,
    flyTo,
    cancelFlight: () => (flight = null),
    follow: (obj, offset = new THREE.Vector3(0, 1.1, 0)) => (follow = obj ? { obj, offset } : null),
  };
}

/**
 * Merge all static meshes that share a material into one draw call each.
 * Meshes flagged `userData.keepSeparate` (signs, facades, water) stay as-is.
 */
export function bakeStatic(root) {
  root.updateMatrixWorld(true);
  const buckets = new Map();
  const toRemove = [];
  root.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || o.userData.keepSeparate || Array.isArray(o.material)) return;
    let g = o.geometry.clone().applyMatrix4(o.matrixWorld);
    if (g.index) g = g.toNonIndexed();
    for (const name of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(name)) g.deleteAttribute(name);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    if (!g.attributes.normal) g.computeVertexNormals();
    g.clearGroups();
    const key = o.material.uuid;
    if (!buckets.has(key)) buckets.set(key, { material: o.material, geos: [] });
    buckets.get(key).geos.push(g);
    toRemove.push(o);
  });
  for (const o of toRemove) {
    o.parent.remove(o);
    o.geometry.dispose();
  }
  const baked = new THREE.Group();
  for (const { material, geos } of buckets.values()) {
    const merged = mergeGeometries(geos, false);
    geos.forEach((g) => g.dispose());
    const mesh = new THREE.Mesh(merged, material);
    mesh.castShadow = !material.transparent;
    mesh.receiveShadow = true;
    baked.add(mesh);
  }
  root.add(baked);
  // Whatever stayed separate still takes part in shadows
  root.traverse((o) => {
    if (o.isMesh && !baked.children.includes(o) && !o.userData.noShadow) {
      o.castShadow = !o.material.transparent;
      o.receiveShadow = true;
    }
  });
  return { drawCalls: buckets.size, merged: toRemove.length };
}
