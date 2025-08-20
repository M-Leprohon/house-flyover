// web/vite.config.js

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        // When your frontend requests a path starting with /api (e.g., /api/flights)
        // Target: The base URL for *any* function in your project/region emulator
        target: 'http://127.0.0.1:5001/house-flyover/us-central1',
        changeOrigin: true, // Needed for virtual hosted sites
        // Rewrite: Prepend the Cloud Function's name ('api') to the path
        // Client request: /api/flights
        // After rewrite, it becomes: /api/api/flights (where the first 'api' is the function name)
        rewrite: (path) => `/api${path}`, // <--- THIS IS THE CRUCIAL ADJUSTMENT!
      },
    },
  },
  // Your existing build configuration (e.g., outDir, emptyOutDir) should be here
  build: {
    emptyOutDir: true,
  },
});
