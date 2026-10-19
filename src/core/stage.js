import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// Renderer, studio lighting, camera and controls. Units are millimetres.

// A photographic light tent, like NOMOS's own product shots: bright, soft, white
// surroundings with a few black flags. Mirror-polished steel shows whatever it
// reflects, so the tent makes it read as bright silver and the flags draw the
// crisp dark lines that tell the eye the surface is polished.
function buildStudioEnvironment(renderer) {
  const env = new THREE.Scene();
  env.background = new THREE.Color(0x404244);
  const box = new THREE.BoxGeometry(1, 1, 1);
  const light = (intensity, color = 0xffffff) => new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide });
  const flag = new THREE.MeshBasicMaterial({ color: 0x0b0c0d, side: THREE.DoubleSide });

  // the tent: bright overhead, soft grey horizon, darker floor
  const room = new THREE.Mesh(new THREE.SphereGeometry(60, 48, 24), new THREE.MeshBasicMaterial({ side: THREE.BackSide, vertexColors: true }));
  const pos = room.geometry.attributes.position;
  const cols = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) / 60; // -1..1
    const az = Math.atan2(pos.getX(i), pos.getZ(i));
    let v = y >= 0 ? 0.62 + 0.55 * Math.pow(y, 0.8) : 0.62 - 0.42 * Math.pow(-y, 0.7);
    v *= 0.86 + 0.14 * Math.cos(az * 2); // tent seams: slightly darker to the sides
    cols[i * 3] = v; cols[i * 3 + 1] = v * 1.005; cols[i * 3 + 2] = v * 1.02;
  }
  room.geometry.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  env.add(room);

  const add = (w, h, d, x, y, z, mat, lookAt = [0, 0, 0]) => {
    const m = new THREE.Mesh(box, mat);
    m.scale.set(w, h, d);
    m.position.set(x, y, z);
    m.lookAt(...lookAt);
    env.add(m);
  };
  add(44, 0.2, 30, 0, 34, 0, light(3.2)); // overhead soft box
  add(46, 22, 0.2, 0, 10, 46, light(1.9)); // front diffuser (dial side)
  add(46, 22, 0.2, 0, 10, -46, light(1.8)); // back diffuser (movement side)
  add(6, 30, 0.2, -40, 4, 18, light(2.6, 0xf3f6ff)); // left strip
  add(6, 30, 0.2, 40, 4, -18, light(2.3, 0xfff7ec)); // right strip
  // black flags: give polished flanks, bezel and lugs their dark lines
  add(5, 44, 0.2, -36, 0, -14, flag);
  add(5, 44, 0.2, 36, 0, 16, flag);
  add(60, 4, 0.2, 0, -10, 52, flag);
  add(60, 4, 0.2, 0, -10, -52, flag);
  // A ring soft box just above the horizon and a black card ring just below it, all
  // the way round: vertical polished faces (case flanks, lug sides, crown) mirror
  // the horizon, so this gives them the bright band + crisp dark edge of a studio shot.
  const ring = (r, y0, y1, mat) => {
    const g = new THREE.CylinderGeometry(r, r, y1 - y0, 64, 1, true);
    const m = new THREE.Mesh(g, mat);
    m.position.y = (y0 + y1) / 2;
    env.add(m);
  };
  ring(50, 4, 15, light(2.1));
  ring(49.5, -9, -1.5, flag);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const rt = pmrem.fromScene(env, 0.02);
  pmrem.dispose();
  return rt.texture;
}

function gradientBackground(top, bottom, vignette) {
  const c = document.createElement('canvas');
  c.width = 16; c.height = 512;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 16, 512);
  void vignette;
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function createStage(container, { pixelRatioCap = 2 } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, pixelRatioCap));
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.className = 'stage-canvas';
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.environment = buildStudioEnvironment(renderer);
  scene.environmentIntensity = 1.0;

  const camera = new THREE.PerspectiveCamera(28, 1, 1, 2000);
  camera.position.set(0, 0, 120);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 22;
  controls.maxDistance = 420;
  controls.rotateSpeed = 0.7;
  controls.zoomSpeed = 0.9;
  controls.target.set(0, 0, 0);

  // Key light that casts the hands' shadows on the dial — the single strongest cue
  // that the hands float above the dial.
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(-30, 60, 90);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -30; key.shadow.camera.right = 30;
  key.shadow.camera.top = 30; key.shadow.camera.bottom = -30;
  key.shadow.camera.near = 10; key.shadow.camera.far = 260;
  key.shadow.bias = -0.0002;
  key.shadow.normalBias = 0.02;
  key.shadow.radius = 4;
  scene.add(key);
  scene.add(key.target);
  // Back key for the movement side.
  const backKey = new THREE.DirectionalLight(0xffffff, 1.2);
  backKey.position.set(35, 50, -90);
  backKey.castShadow = true;
  backKey.shadow.mapSize.set(2048, 2048);
  Object.assign(backKey.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 10, far: 260 });
  backKey.shadow.bias = -0.0002;
  backKey.shadow.normalBias = 0.02;
  scene.add(backKey);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x404448, 0.25));

  const root = new THREE.Group(); // the whole watch
  scene.add(root);

  function setBackground(top, bottom) {
    if (scene.background?.dispose) scene.background.dispose();
    scene.background = gradientBackground(top, bottom);
  }

  let fixedSize = null; // {w,h} while recording
  // Pixel budget: the internal render size is capped at this many pixels (megapixels)
  // whatever the screen — a 5120×1440 ultrawide at retina density would otherwise
  // render 15+ MP every frame. setPixelBudget(mp) changes it (wallpaper mode lowers it).
  let pixelBudget = 8.3e6;
  function applyPixelRatio(w, h) {
    const dpr = Math.min(window.devicePixelRatio || 1, pixelRatioCap);
    const fit = Math.sqrt(pixelBudget / Math.max(1, w * h));
    renderer.setPixelRatio(Math.max(0.5, Math.min(dpr, fit)));
  }
  function resize() {
    if (fixedSize) return;
    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    applyPixelRatio(w, h);
    renderer.setSize(w, h, false);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  // Render at an exact pixel size (video recording); pass null to go back.
  function setFixedSize(size) {
    fixedSize = size;
    if (size) {
      renderer.setPixelRatio(1);
      renderer.setSize(size.w, size.h, false);
      camera.aspect = size.w / size.h;
      camera.updateProjectionMatrix();
    } else {
      resize();
    }
  }

  function setPixelBudget(megapixels) {
    pixelBudget = Math.max(0.5, megapixels) * 1e6;
    resize();
  }

  function render() {
    renderer.render(scene, camera);
  }

  return {
    renderer, scene, camera, controls, root, key, backKey, setBackground, resize, setFixedSize, render,
    setPixelBudget, get pixelBudget() { return pixelBudget / 1e6; },
  };
}
