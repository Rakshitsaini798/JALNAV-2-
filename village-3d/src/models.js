import * as THREE from 'three';
import { levelColor, smoothTowards } from './geo.js';

// Every model is a THREE.Group built from simple shapes (cylinders, boxes, cones, tori).
// group.userData holds the asset id (for clicking) and an update(dt, info, time) function
// that the render loop calls every frame to animate the model from live data.

const STATUS_COLORS = { Operational: 0x22c55e, Maintenance: 0xf59e0b, Inactive: 0x64748b };

function mat(color, options = {}) {
  // Each model gets its own material instances, so highlighting one model never highlights another.
  return new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.1, ...options });
}

function mesh(geometry, material, { x = 0, y = 0, z = 0, shadow = true } = {}) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(x, y, z);
  m.castShadow = shadow;
  m.receiveShadow = true;
  return m;
}

function statusLight(group, y) {
  const light = mesh(new THREE.SphereGeometry(0.6, 16, 12), mat(0x22c55e, { emissive: 0x22c55e, emissiveIntensity: 0.8 }), { y });
  group.add(light);
  return (status) => {
    const color = STATUS_COLORS[status] || STATUS_COLORS.Inactive;
    light.material.color.setHex(color);
    light.material.emissive.setHex(color);
  };
}

// A red ring on the ground that pulses while the asset has an open alert.
function alertRing(group, radius) {
  const ring = mesh(
    new THREE.TorusGeometry(radius, 0.35, 8, 48),
    mat(0xef4444, { emissive: 0xef4444, emissiveIntensity: 1.2, transparent: true, opacity: 0.9 }),
    { y: 0.4, shadow: false }
  );
  ring.rotation.x = -Math.PI / 2;
  ring.visible = false;
  group.add(ring);
  return (active, time) => {
    ring.visible = active;
    if (active) {
      const pulse = 1 + 0.15 * Math.sin(time * 4);
      ring.scale.set(pulse, pulse, pulse);
      ring.material.opacity = 0.5 + 0.4 * (0.5 + 0.5 * Math.sin(time * 4));
    }
  };
}

export function createTank(asset) {
  const group = new THREE.Group();
  const height = 10;
  const radius = 4;
  const standHeight = 8;

  // Four legs: same geometry, rotated around the centre.
  const legGeometry = new THREE.CylinderGeometry(0.35, 0.35, standHeight, 8);
  const legMaterial = mat(0x64748b, { metalness: 0.5 });
  for (let i = 0; i < 4; i += 1) {
    const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
    group.add(mesh(legGeometry, legMaterial, { x: Math.cos(angle) * 3, y: standHeight / 2, z: Math.sin(angle) * 3 }));
  }

  // See-through shell so you can watch the water level inside.
  const shell = mesh(
    new THREE.CylinderGeometry(radius, radius, height, 32, 1, true),
    mat(0xe2e8f0, { transparent: true, opacity: 0.3, side: THREE.DoubleSide, roughness: 0.1 }),
    { y: standHeight + height / 2 }
  );
  group.add(shell);
  group.add(mesh(new THREE.CylinderGeometry(radius, radius, 0.4, 32), mat(0x94a3b8), { y: standHeight }));
  group.add(mesh(new THREE.ConeGeometry(radius + 0.4, 2.5, 32), mat(0x475569), { y: standHeight + height + 1.25 }));

  // The water is a cylinder 1 unit tall; we scale it on Y to match the water level.
  const water = mesh(
    new THREE.CylinderGeometry(radius - 0.25, radius - 0.25, 1, 32),
    mat(0x22c55e, { transparent: true, opacity: 0.85, roughness: 0.2, emissive: 0x000000 }),
    { y: standHeight }
  );
  water.userData.noHighlight = true; // keep the real water colour visible when selected
  group.add(water);

  const setStatus = statusLight(group, standHeight + height + 3);
  const setAlert = alertRing(group, radius + 2);
  let level = 0;
  const targetColor = new THREE.Color();

  group.userData.update = (dt, info, time) => {
    const target = info.reading ? info.reading.waterLevel : 0;
    level = smoothTowards(level, target, 3, dt);
    const fill = Math.max(0.02, level / 100) * (height - 0.4);
    water.scale.y = fill;
    water.position.y = standHeight + 0.2 + fill / 2;
    targetColor.setHex(levelColor(info.reading ? level : null));
    water.material.color.lerp(targetColor, 1 - Math.exp(-5 * dt));
    setStatus(info.asset.status);
    setAlert(info.alert, time);
  };
  group.userData.labelHeight = standHeight + height + 5;
  return group;
}

export function createBorewell(asset) {
  const group = new THREE.Group();
  group.add(mesh(new THREE.CylinderGeometry(2.5, 2.8, 1, 24), mat(0x78716c)));
  group.add(mesh(new THREE.CylinderGeometry(0.5, 0.5, 6, 12), mat(0x334155, { metalness: 0.6 }), { y: 3.5 }));
  const spout = mesh(new THREE.CylinderGeometry(0.3, 0.3, 2.5, 8), mat(0x334155, { metalness: 0.6 }), { x: 1.2, y: 6 });
  spout.rotation.z = Math.PI / 2;
  group.add(spout);

  // Water droplets with simple physics: each has a velocity, gravity pulls it down,
  // and when it hits the ground it is reset at the spout.
  const count = 120;
  const positions = new Float32Array(count * 3);
  const velocities = new Float32Array(count * 3);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const drops = new THREE.Points(geometry, new THREE.PointsMaterial({ color: 0x38bdf8, size: 0.45 }));
  group.add(drops);
  const spoutTip = new THREE.Vector3(2.4, 6, 0);
  const GRAVITY = -9.8 * 2;

  const respawn = (i) => {
    positions[i * 3] = spoutTip.x;
    positions[i * 3 + 1] = spoutTip.y;
    positions[i * 3 + 2] = spoutTip.z;
    velocities[i * 3] = 2 + Math.random() * 1.5;
    velocities[i * 3 + 1] = Math.random() * 1.5;
    velocities[i * 3 + 2] = (Math.random() - 0.5) * 1.2;
  };
  for (let i = 0; i < count; i += 1) {
    respawn(i);
    positions[i * 3 + 1] = -100; // start hidden, then flow in gradually
  }

  const setStatus = statusLight(group, 7.5);
  const setAlert = alertRing(group, 4);
  let spawnBudget = 0;

  group.userData.update = (dt, info, time) => {
    const flowing = info.asset.status === 'Operational' && info.reading;
    spawnBudget += flowing ? dt * (info.reading.flowRate * 3) : 0;
    for (let i = 0; i < count; i += 1) {
      const y = i * 3 + 1;
      if (positions[y] <= 0) {
        if (spawnBudget >= 1) {
          respawn(i);
          spawnBudget -= 1;
        } else {
          positions[y] = -100;
        }
        continue;
      }
      velocities[y] += GRAVITY * dt;
      positions[i * 3] += velocities[i * 3] * dt;
      positions[y] += velocities[y] * dt;
      positions[i * 3 + 2] += velocities[i * 3 + 2] * dt;
    }
    geometry.attributes.position.needsUpdate = true;
    setStatus(info.asset.status);
    setAlert(info.alert, time);
  };
  group.userData.labelHeight = 10;
  return group;
}

export function createPump(asset) {
  const group = new THREE.Group();
  group.add(mesh(new THREE.BoxGeometry(6, 1, 4), mat(0x57534e)));
  group.add(mesh(new THREE.BoxGeometry(4, 3, 3), mat(0x2563eb, { metalness: 0.4 }), { y: 2 }));

  // The impeller spins faster when the flow rate is higher, and stops during maintenance.
  const impeller = new THREE.Group();
  impeller.position.set(0, 2, 1.8);
  const bladeGeometry = new THREE.BoxGeometry(0.4, 2.4, 0.2);
  const bladeMaterial = mat(0xe2e8f0, { metalness: 0.7 });
  for (let i = 0; i < 4; i += 1) {
    const blade = mesh(bladeGeometry, bladeMaterial);
    blade.rotation.z = (i * Math.PI) / 4;
    impeller.add(blade);
  }
  group.add(impeller);

  const setStatus = statusLight(group, 4.3);
  const setAlert = alertRing(group, 5);
  let speed = 0;

  group.userData.update = (dt, info, time) => {
    const running = info.asset.status === 'Operational' && info.reading;
    speed = smoothTowards(speed, running ? info.reading.flowRate * 0.6 : 0, 2, dt);
    impeller.rotation.z += speed * dt;
    setStatus(info.asset.status);
    setAlert(info.alert, time);
  };
  group.userData.labelHeight = 7;
  return group;
}

export function createValve(asset) {
  const group = new THREE.Group();
  group.add(mesh(new THREE.CylinderGeometry(1.4, 1.4, 3, 16), mat(0x0f766e, { metalness: 0.5 }), { y: 1.5 }));
  const wheel = mesh(new THREE.TorusGeometry(1.2, 0.2, 8, 24), mat(0xdc2626), { y: 3.6 });
  wheel.rotation.x = Math.PI / 2;
  group.add(wheel);
  const setStatus = statusLight(group, 5);
  const setAlert = alertRing(group, 3);
  group.userData.update = (dt, info, time) => {
    if (info.asset.status === 'Operational') wheel.rotation.z += dt * 0.5;
    setStatus(info.asset.status);
    setAlert(info.alert, time);
  };
  group.userData.labelHeight = 7;
  return group;
}

export const MODEL_BUILDERS = { tank: createTank, borewell: createBorewell, pump: createPump, pipeline: createValve };

export function createAssetModel(asset) {
  const build = MODEL_BUILDERS[asset.type] || createValve;
  const group = build(asset);
  group.userData.assetId = asset.id;
  group.name = asset.name;
  return group;
}

// A curved pipe between two points, with small "water" balls flowing along it.
export function createPipe(from, to, getFlow) {
  const group = new THREE.Group();
  const mid = from.clone().lerp(to, 0.5);
  mid.y += Math.min(12, from.distanceTo(to) * 0.08);
  const curve = new THREE.CatmullRomCurve3([from, mid, to]);
  group.add(mesh(new THREE.TubeGeometry(curve, 48, 0.45, 8, false), mat(0x94a3b8, { metalness: 0.4, transparent: true, opacity: 0.8 })));

  const ballCount = 10;
  const balls = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.55, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0ea5e9, emissiveIntensity: 0.6 }),
    ballCount
  );
  group.add(balls);
  const dummy = new THREE.Object3D();
  let offset = 0;

  group.userData.update = (dt) => {
    const flow = getFlow();
    offset = (offset + dt * flow * 0.02) % 1;
    for (let i = 0; i < ballCount; i += 1) {
      const t = (i / ballCount + offset) % 1;
      curve.getPointAt(t, dummy.position);
      dummy.scale.setScalar(flow > 0 ? 1 : 0.001);
      dummy.updateMatrix();
      balls.setMatrixAt(i, dummy.matrix);
    }
    balls.instanceMatrix.needsUpdate = true;
  };
  return group;
}

// Glow effect for hover/selection: turn up the emissive colour on every material in the model.
export function setHighlight(group, level) {
  group.traverse((child) => {
    if (!child.isMesh || child.isInstancedMesh || child.userData.noHighlight || !child.material.emissive) return;
    if (child.userData.baseEmissive === undefined) {
      child.userData.baseEmissive = child.material.emissive.getHex();
      child.userData.baseIntensity = child.material.emissiveIntensity;
    }
    if (level === 0) {
      child.material.emissive.setHex(child.userData.baseEmissive);
      child.material.emissiveIntensity = child.userData.baseIntensity;
    } else if (child.userData.baseEmissive === 0x000000) {
      child.material.emissive.setHex(0x38bdf8);
      child.material.emissiveIntensity = level === 2 ? 0.3 : 0.15;
    }
  });
}

export function disposeObject(object) {
  object.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
    if (child.material) [].concat(child.material).forEach((m) => m.dispose());
  });
}
