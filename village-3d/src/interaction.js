import * as THREE from 'three';

// Mouse/touch picking with a raycaster, plus keyboard shortcuts.
export function setupInteraction({ canvas, camera, getModels, store, actions }) {
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let downAt = null;

  // A click usually hits a small part (a leg, the roof...). Walk up to the group that knows its asset id.
  function assetIdAt(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(getModels(), true);
    for (const hit of hits) {
      let object = hit.object;
      while (object && object.userData.assetId === undefined) object = object.parent;
      if (object) return object.userData.assetId;
    }
    return null;
  }

  canvas.addEventListener('pointermove', (event) => {
    const id = assetIdAt(event);
    canvas.style.cursor = id ? 'pointer' : 'grab';
    if (id !== store.get().hoveredId) store.set({ hoveredId: id });
    actions.moveTooltip(event.clientX, event.clientY);
  });

  canvas.addEventListener('pointerdown', (event) => {
    downAt = { x: event.clientX, y: event.clientY };
  });

  // Only count it as a click if the mouse didn't move much (otherwise the user was rotating the camera).
  canvas.addEventListener('pointerup', (event) => {
    if (!downAt || Math.hypot(event.clientX - downAt.x, event.clientY - downAt.y) > 5) return;
    const id = assetIdAt(event);
    if (id) actions.select(id);
    else actions.deselect();
  });

  window.addEventListener('keydown', (event) => {
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'SELECT') return;
    switch (event.key) {
      case 'Tab':
        event.preventDefault();
        actions.selectNext(event.shiftKey ? -1 : 1);
        break;
      case 'r':
      case 'R':
        actions.resetView();
        break;
      case 'h':
      case 'H':
        actions.toggleDebug();
        break;
      case 'l':
      case 'L':
        actions.toggleLive();
        break;
      case ' ':
        event.preventDefault();
        actions.simulate();
        break;
      case 'Escape':
        actions.deselect();
        break;
      default:
    }
  });
}
