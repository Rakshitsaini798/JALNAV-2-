# JalNavigator 3D Village View (local only)

An interactive 3D view of a village's water network, built with **Three.js**.
It reads live data from the local JalNavigator backend: assets, sensor readings and alerts.

This folder is separate from `frontend` and `backend`, and is **not part of the deployed website**.

## Run it
1. Start the backend: in `backend`, run `npm start`.
2. In this folder:
   ```
   npm install
   npm run dev
   ```
3. Open http://localhost:5174

If the backend isn't running, the app shows built-in sample data.

## Controls
| Input | Action |
|---|---|
| Left-drag / one finger | Rotate the camera |
| Right-drag / two fingers | Pan |
| Wheel / pinch | Zoom |
| Click / tap an asset | Select it, fly the camera to it, show its details |
| Tab / Shift+Tab | Next / previous asset |
| Space | Simulate a new sensor reading for the selected asset (staff login) |
| L | Live mode: refresh data every 5 seconds |
| R | Reset the camera |
| H | Debug view: axes, grid, shadow camera, FPS |
| Esc | Deselect |

## Structure
```
village-3d/
  index.html          page shell
  vite.config.js      dev server on :5174, forwards /api to the backend on :3000
  src/main.js         start-up, builds the scene for a village, render loop, actions
  src/scene.js        renderer, camera, orbit controls, lights, shadows, terrain, houses/trees, camera fly-to
  src/models.js       3D models (tank, borewell, pump, valve, pipe) and their animations
  src/interaction.js  raycasting (hover/click) and keyboard shortcuts
  src/state.js        small state store the scene and UI subscribe to
  src/ui.js           HTML overlay: top bar, info panel, tooltip, messages
  src/api.js          calls to the JalNavigator API (with sample-data fallback)
  src/geo.js          pure maths: lat/lng to scene coordinates, colours, smoothing
  tests/geo.test.js   unit tests (npm test)
```

## Tests
```
npm test
```
