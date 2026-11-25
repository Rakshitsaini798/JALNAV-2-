import { levelColor } from './geo.js';

const hex = (n) => `#${n.toString(16).padStart(6, '0')}`;

// The HTML overlay: title bar, side panel, tooltip, help and messages. It re-renders when the state changes.
export function createUI(root, store, actions) {
  root.innerHTML = `
    <div id="viewport"></div>
    <header class="bar">
      <strong>JalNavigator 3D</strong>
      <label>Village <select id="village"></select></label>
      <span id="source" class="pill"></span>
      <button id="live" type="button">Live mode: off</button>
      <button id="reset" type="button">Reset view</button>
    </header>
    <aside id="panel" class="panel"></aside>
    <div id="tooltip" class="tooltip"></div>
    <div id="fps" class="fps"></div>
    <div id="toast" class="toast"></div>
    <footer class="help">
      Drag: rotate &nbsp;·&nbsp; Right-drag: pan &nbsp;·&nbsp; Wheel: zoom &nbsp;·&nbsp; Click: select &nbsp;·&nbsp;
      Tab: next asset &nbsp;·&nbsp; Space: simulate reading &nbsp;·&nbsp; L: live mode &nbsp;·&nbsp; R: reset &nbsp;·&nbsp; H: debug
    </footer>`;

  const $ = (id) => root.querySelector(`#${id}`);
  const villageSelect = $('village');
  villageSelect.addEventListener('change', () => actions.setVillage(villageSelect.value));
  $('live').addEventListener('click', () => actions.toggleLive());
  $('reset').addEventListener('click', () => actions.resetView());

  let toastTimer;
  function toast(message, kind = 'info') {
    const el = $('toast');
    el.textContent = message;
    el.className = `toast show ${kind}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (el.className = 'toast'), 3200);
  }

  function renderPanel(state) {
    const panel = $('panel');
    const info = state.selectedId ? state.infoById.get(state.selectedId) : null;
    if (!info) {
      const counts = {};
      state.villageAssets.forEach((a) => (counts[a.type] = (counts[a.type] || 0) + 1));
      panel.innerHTML = `
        <h2>${state.village || 'No village'}</h2>
        <p>${state.villageAssets.length} water assets</p>
        <ul class="legend">
          ${Object.entries(counts).map(([type, n]) => `<li>${n} × ${type}</li>`).join('')}
        </ul>
        <div class="key">
          <span><i style="background:#22c55e"></i>50%+</span>
          <span><i style="background:#f59e0b"></i>20–50%</span>
          <span><i style="background:#ef4444"></i>below 20%</span>
        </div>
        <p class="muted">Click an asset, or press Tab, to inspect it.</p>`;
      return;
    }
    const { asset, reading, alert } = info;
    const level = reading ? reading.waterLevel : null;
    panel.innerHTML = `
      <h2>${asset.name}</h2>
      <p class="muted">${asset.type} · ${asset.village}</p>
      <p>Status: <b>${asset.status}</b></p>
      ${
        reading
          ? `<div class="meter"><div style="width:${level}%;background:${hex(levelColor(level))}"></div></div>
             <p>Water level <b>${level.toFixed(1)}%</b></p>
             <p>Flow <b>${reading.flowRate.toFixed(1)} L/s</b> · Pressure <b>${reading.pressure.toFixed(1)} bar</b></p>
             <p class="muted">Updated ${new Date(reading.recordedAt).toLocaleTimeString()}</p>`
          : '<p class="muted">No sensor readings yet.</p>'
      }
      ${alert ? '<p class="alert">⚠ Open alert: low water level</p>' : ''}
      ${
        state.needsLogin
          ? `<form id="login" class="login">
               <p>Staff login to simulate readings</p>
               <input name="email" type="email" placeholder="Email" value="operator.rampur@jalnavigator.in" />
               <input name="password" type="password" placeholder="Password" />
               <button type="submit">Log in</button>
             </form>`
          : `<button id="simulate" type="button" ${state.source !== 'live' ? 'disabled' : ''}>Simulate new reading (Space)</button>`
      }`;
    const simulate = panel.querySelector('#simulate');
    if (simulate) simulate.addEventListener('click', () => actions.simulate());
    const login = panel.querySelector('#login');
    if (login) {
      login.addEventListener('submit', (event) => {
        event.preventDefault();
        actions.login(login.email.value, login.password.value);
      });
      login.password.focus();
    }
  }

  let lastPanelKey = '';
  store.subscribe((state) => {
    const villages = state.villages.map((v) => `<option ${v === state.village ? 'selected' : ''}>${v}</option>`).join('');
    if (villageSelect.innerHTML !== villages) villageSelect.innerHTML = villages;
    $('source').textContent = state.source === 'live' ? '● Live data from API' : '● Sample data (backend offline)';
    $('source').className = `pill ${state.source}`;
    $('live').textContent = `Live mode: ${state.live ? 'on' : 'off'}`;
    $('live').classList.toggle('on', state.live);
    $('fps').style.display = state.debug ? 'block' : 'none';

    const hovered = state.hoveredId ? state.infoById.get(state.hoveredId) : null;
    $('tooltip').style.display = hovered ? 'block' : 'none';
    if (hovered) $('tooltip').textContent = hovered.asset.name;

    // Only rebuild the panel when something it shows has changed (keeps the login form from resetting).
    const info = state.selectedId ? state.infoById.get(state.selectedId) : null;
    const key = JSON.stringify([state.village, state.selectedId, state.needsLogin, state.source, info && info.reading, info && info.alert, info && info.asset.status]);
    if (key !== lastPanelKey) {
      lastPanelKey = key;
      renderPanel(state);
    }
  });

  return {
    viewport: $('viewport'),
    toast,
    moveTooltip(x, y) {
      const el = $('tooltip');
      el.style.left = `${x + 14}px`;
      el.style.top = `${y + 14}px`;
    },
    showFps(fps) {
      $('fps').textContent = `${fps} FPS`;
    }
  };
}
