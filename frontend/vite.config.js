import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { Agent } from 'node:http';

const backendTarget = 'http://127.0.0.1:8000';
const backendAgent = new Agent({ keepAlive: false });

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    strictPort: true,
    proxy: {
      '/api': {
        target: backendTarget,
        changeOrigin: true,
        agent: backendAgent,
      },
      '/storage': {
        target: backendTarget,
        changeOrigin: true,
        agent: backendAgent,
      },
    },
  },
});
