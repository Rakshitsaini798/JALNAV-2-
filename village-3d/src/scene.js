import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Sets up everything that isn't a water asset: renderer, camera, controls, lights, ground, houses and trees.
export function createWorld(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xbfdbfe);
  scene.fog = new THREE.Fog(0xbfdbfe, 350, 900);

  const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.5, 2000);
  camera.position.set(0, 160, 220);

  // Mouse: left-drag rotates, right-drag pans, wheel zooms. Touch: one finger rotates, pinch zooms.
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI / 2.15; // never go below the ground
  controls.minDistance = 20;
  controls.maxDistance = 600;

  // Lighting: soft sky light from above plus a "sun" that casts shadows.
  scene.add(new THREE.HemisphereLight(0xe0f2fe, 0x3f6212, 1.1));
  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.position.set(120, 200, 80);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -250, right: 250, top: 250, bottom: -250, near: 10, far: 600 });
  scene.add(sun);

  // Ground: a flat plane with gentle hills made by moving its vertices up and down.
  const groundGeometry = new THREE.PlaneGeometry(1200, 1200, 120, 120);
  groundGeometry.rotateX(-Math.PI / 2);
  const pos = groundGeometry.attributes.position;
  const colors = [];
  const grass = new THREE.Color(0x65a30d);
  const field = new THREE.Color(0xa3a35a);
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const distance = Math.hypot(x, z);
    const hills = distance > 260 ? (Math.sin(x * 0.02) + Math.cos(z * 0.025)) * Math.min(1, (distance - 260) / 200) * 12 : 0;
    pos.setY(i, hills);
    const c = grass.clone().lerp(field, 0.5 + 0.5 * Math.sin(x * 0.03) * Math.cos(z * 0.03));
    colors.push(c.r, c.g, c.b);
  }
  groundGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  groundGeometry.computeVertexNormals();
  const ground = new THREE.Mesh(groundGeometry, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }));
  ground.receiveShadow = true;
  scene.add(ground);

  // Debug helpers (press H): axes, grid and the sun's shadow area.
  const debug = new THREE.Group();
  debug.add(new THREE.AxesHelper(40), new THREE.GridHelper(600, 60, 0x1e293b, 0x475569), new THREE.CameraHelper(sun.shadow.camera));
  debug.visible = false;
  scene.add(debug);

  function onResize() {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  }
  window.addEventListener('resize', onResize);

  return { renderer, scene, camera, controls, debug, sun };
}

// Houses and trees drawn with InstancedMesh: hundreds of copies in a single draw call each.
export function createSurroundings(assetPositions, seed = 7) {
  let s = seed;
  const random = () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
  const group = new THREE.Group();
  const free = (x, z) => assetPositions.every((p) => Math.hypot(p.x - x, p.z - z) > 24);

  const houseCount = 140;
  const houses = new THREE.InstancedMesh(new THREE.BoxGeometry(6, 4, 5), new THREE.MeshStandardMaterial({ color: 0xfef3c7 }), houseCount);
  const roofs = new THREE.InstancedMesh(new THREE.ConeGeometry(4.6, 2.6, 4), new THREE.MeshStandardMaterial({ color: 0xb45309 }), houseCount);
  const treeCount = 220;
  const trees = new THREE.InstancedMesh(new THREE.ConeGeometry(2.5, 8, 7), new THREE.MeshStandardMaterial({ color: 0x166534 }), treeCount);
  [houses, roofs, trees].forEach((m) => {
    m.castShadow = true;
    m.receiveShadow = true;
  });

  const dummy = new THREE.Object3D();
  let placed = 0;
  for (let tries = 0; placed < houseCount && tries < 5000; tries += 1) {
    const x = (random() - 0.5) * 420;
    const z = (random() - 0.5) * 420;
    if (!free(x, z)) continue;
    const turn = random() * Math.PI;
    dummy.position.set(x, 2, z);
    dummy.rotation.set(0, turn, 0);
    dummy.scale.setScalar(0.8 + random() * 0.5);
    dummy.updateMatrix();
    houses.setMatrixAt(placed, dummy.matrix);
    dummy.position.y = 5.2 * dummy.scale.y;
    dummy.rotation.y = turn + Math.PI / 4;
    dummy.updateMatrix();
    roofs.setMatrixAt(placed, dummy.matrix);
    placed += 1;
  }
  houses.count = placed;
  roofs.count = placed;

  let planted = 0;
  for (let tries = 0; planted < treeCount && tries < 5000; tries += 1) {
    const x = (random() - 0.5) * 560;
    const z = (random() - 0.5) * 560;
    if (!free(x, z)) continue;
    dummy.position.set(x, 4, z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.setScalar(0.7 + random() * 0.7);
    dummy.updateMatrix();
    trees.setMatrixAt(planted, dummy.matrix);
    planted += 1;
  }
  trees.count = planted;

  group.add(houses, roofs, trees);
  return group;
}

// Smoothly moves the camera to look at a point over `duration` seconds.
export function createCameraMover(camera, controls) {
  let move = null;
  return {
    flyTo(target, distance = 45) {
      const direction = camera.position.clone().sub(controls.target).normalize();
      move = {
        t: 0,
        duration: 0.9,
        fromTarget: controls.target.clone(),
        toTarget: target.clone(),
        fromPos: camera.position.clone(),
        toPos: target.clone().add(direction.multiplyScalar(distance)).setY(target.y + distance * 0.6)
      };
    },
    update(dt) {
      if (!move) return;
      move.t = Math.min(1, move.t + dt / move.duration);
      const k = move.t < 0.5 ? 2 * move.t * move.t : 1 - (-2 * move.t + 2) ** 2 / 2; // ease in-out
      controls.target.lerpVectors(move.fromTarget, move.toTarget, k);
      camera.position.lerpVectors(move.fromPos, move.toPos, k);
      if (move.t === 1) move = null;
    }
  };
}
