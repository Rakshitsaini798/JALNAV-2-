import * as THREE from 'three';
import { createStore } from './state.js';
import { loadData, login, simulateReading, isLoggedIn } from './api.js';
import { makeProjector, latestReadingByAsset, villagesOf, hubAsset } from './geo.js';
import { createWorld, createSurroundings, createCameraMover } from './scene.js';
import { createAssetModel, createPipe, setHighlight, disposeObject } from './models.js';
import { setupInteraction } from './interaction.js';
import { createUI } from './ui.js';

// ---- App state: everything the scene and the UI need to know ----
const store = createStore({
  data: null,
  source: 'live',
  villages: [],
  village: null,
  villageAssets: [],
  infoById: new Map(), // assetId -> { asset, reading, alert }
  selectedId: null,
  hoveredId: null,
  live: false,
  debug: false,
  needsLogin: false
});

const actions = {};
const ui = createUI(document.getElementById('app'), store, actions);
const world = createWorld(ui.viewport);
const mover = createCameraMover(world.camera, world.controls);

let villageGroup = null; // everything built for the current village
let models = new Map(); // assetId -> THREE.Group
let animated = []; // objects with an update() function
let homeView = { target: new THREE.Vector3(), position: new THREE.Vector3(0, 160, 220) };

function buildInfo(data) {
  const latest = latestReadingByAsset(data.readings.map((r) => ({ ...r, assetId: r.assetId ?? r.asset?.id })));
  const openAlerts = new Set(data.alerts.filter((a) => a.status === 'Open').map((a) => a.assetId));
  const infoById = new Map();
  for (const asset of data.assets) {
    infoById.set(asset.id, { asset, reading: latest.get(asset.id) || null, alert: openAlerts.has(asset.id) });
  }
  return infoById;
}

// Builds the 3D scene for one village. Called on start and whenever the village changes.
function buildVillage(village) {
  if (villageGroup) {
    world.scene.remove(villageGroup);
    disposeObject(villageGroup); // free GPU memory from the previous village
  }
  villageGroup = new THREE.Group();
  models = new Map();
  animated = [];

  const assets = store.get().data.assets.filter((a) => a.village === village);
  const project = makeProjector(assets, 8); // 1 scene unit = 8 metres
  const positions = new Map();
  for (const asset of assets) {
    const { x, z } = project(asset.latitude, asset.longitude);
    const model = createAssetModel(asset);
    model.position.set(x, 0, z); // transformation: place the model at its real map position
    villageGroup.add(model);
    models.set(asset.id, model);
    animated.push(model);
    positions.set(asset.id, new THREE.Vector3(x, 0, z));
  }

  // Pipes: every asset is connected to the village's main tank.
  const hub = hubAsset(assets);
  if (hub) {
    const hubPos = positions.get(hub.id).clone().setY(9);
    for (const asset of assets) {
      if (asset.id === hub.id) continue;
      const pipe = createPipe(positions.get(asset.id).clone().setY(1.5), hubPos, () => {
        const info = store.get().infoById.get(asset.id);
        return info && info.asset.status === 'Operational' && info.reading ? info.reading.flowRate : 0;
      });
      villageGroup.add(pipe);
      animated.push(pipe);
    }
  }

  villageGroup.add(createSurroundings([...positions.values()]));
  world.scene.add(villageGroup);

  // Frame the camera around this village's assets.
  const box = new THREE.Box3().setFromPoints([...positions.values()]);
  const center = box.getCenter(new THREE.Vector3());
  const span = Math.max(90, box.getSize(new THREE.Vector3()).length());
  homeView = { target: center, position: center.clone().add(new THREE.Vector3(0, span * 0.75, span * 0.95)) };
  actions.resetView();

  store.set({ village, villageAssets: assets, selectedId: null, hoveredId: null });
}

// ---- Actions: what interactions do ----
Object.assign(actions, {
  setVillage: (village) => buildVillage(village),

  select(id) {
    store.set({ selectedId: id });
    const model = models.get(id);
    if (model) {
      const h = model.userData.labelHeight || 8;
      mover.flyTo(model.position.clone().setY(h / 2), Math.max(22, h * 2.6)); // closer for small models
    }
  },

  deselect: () => store.set({ selectedId: null }),

  selectNext(direction) {
    const ids = store.get().villageAssets.map((a) => a.id);
    if (!ids.length) return;
    const index = ids.indexOf(store.get().selectedId);
    actions.select(ids[(index + direction + ids.length) % ids.length]);
  },

  resetView() {
    const { camera, controls } = world;
    controls.target.copy(homeView.target);
    camera.position.copy(homeView.position);
    controls.update();
  },

  toggleDebug() {
    world.debug.visible = !world.debug.visible;
    store.set({ debug: world.debug.visible });
  },

  toggleLive() {
    store.set({ live: !store.get().live });
    ui.toast(store.get().live ? 'Live mode on: refreshing every 5 seconds' : 'Live mode off');
  },

  async login(email, password) {
    try {
      const user = await login(email, password);
      store.set({ needsLogin: false });
      ui.toast(`Logged in as ${user.email}`, 'ok');
    } catch (err) {
      ui.toast(err.message, 'error');
    }
  },

  async simulate() {
    const { selectedId, source } = store.get();
    if (!selectedId) return ui.toast('Select an asset first');
    if (source !== 'live') return ui.toast('Start the backend to simulate readings', 'error');
    if (!isLoggedIn()) return store.set({ needsLogin: true });
    try {
      const result = await simulateReading(selectedId);
      ui.toast(
        result.alert ? `New reading ${result.reading.waterLevel}%: low-water alert raised!` : `New reading: ${result.reading.waterLevel}% water`,
        result.alert ? 'error' : 'ok'
      );
      await refresh();
    } catch (err) {
      if (!isLoggedIn()) store.set({ needsLogin: true });
      ui.toast(err.message, 'error');
    }
  },

  moveTooltip: (x, y) => ui.moveTooltip(x, y)
});

async function refresh() {
  const data = await loadData();
  store.set({ data, source: data.source, infoById: buildInfo(data), villages: villagesOf(data.assets) });
}

setupInteraction({
  canvas: world.renderer.domElement,
  camera: world.camera,
  getModels: () => [...models.values()],
  store,
  actions
});

// Hover and selection glow.
let lastHover = null;
let lastSelected = null;
store.subscribe((state) => {
  if (state.hoveredId === lastHover && state.selectedId === lastSelected) return;
  for (const [id, model] of models) setHighlight(model, id === state.selectedId ? 2 : id === state.hoveredId ? 1 : 0);
  lastHover = state.hoveredId;
  lastSelected = state.selectedId;
});

// ---- Render loop: runs every frame ----
const timer = new THREE.Timer();
let frames = 0;
let fpsTime = 0;
function loop() {
  requestAnimationFrame(loop);
  timer.update();
  const dt = Math.min(timer.getDelta(), 0.1); // clamp, so switching tabs doesn't make things jump
  const time = timer.getElapsed();
  const { infoById } = store.get();
  for (const object of animated) {
    const info = infoById.get(object.userData.assetId);
    if (object.userData.assetId !== undefined && !info) continue; // asset was removed; skip until rebuilt
    object.userData.update(dt, info, time);
  }
  mover.update(dt);
  world.controls.update();
  world.renderer.render(world.scene, world.camera);

  frames += 1;
  fpsTime += dt;
  if (fpsTime >= 0.5) {
    ui.showFps(Math.round(frames / fpsTime));
    frames = 0;
    fpsTime = 0;
  }
}

// ---- Start ----
(async function start() {
  await refresh();
  const { villages, data } = store.get();
  const first = villages.includes('Rampur') ? 'Rampur' : villages[0];
  if (first) buildVillage(first);
  ui.toast(data.source === 'live' ? `Loaded ${data.assets.length} assets from the API` : 'Backend offline: showing sample data');
  setInterval(() => {
    if (store.get().live) refresh();
  }, 5000);
  window.__jn3d = { store, world, actions }; // handy in the browser console when debugging
  loop();
})();
