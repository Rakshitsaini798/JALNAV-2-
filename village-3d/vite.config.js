import { defineConfig } from 'vite';

// The 3D view runs on its own port and forwards /api calls to the local JalNavigator backend.
export default defineConfig({
  server: {
    port: 5174,
    proxy: {
      '/api': process.env.API_TARGET || 'http://localhost:3000'
    }
  }
});
