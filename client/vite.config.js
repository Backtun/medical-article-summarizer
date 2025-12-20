/**
 * Vite Configuration
 *
 * Configuración del cliente Vite con proxy hacia el backend Express.
 * Esto permite que las llamadas API desde el frontend pasen por Vite
 * sin problemas de CORS, ya que el proxy reenvía a localhost:3001
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});
