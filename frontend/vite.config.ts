import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

export default defineConfig({
  // La app Vue se sirve bajo /app (la raíz del dominio es la homepage de ventas).
  base: '/app/',
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  worker: {
    format: 'es',
  },
  server: {
    host: true,          // escucha en 0.0.0.0 → accesible desde la red local (móviles/tablets)
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',   // el proxy corre en el servidor; localhost = la PC que sirve
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ['phaser'],
          monaco: ['monaco-editor'],
          blockly: ['blockly'],
        },
      },
    },
  },
  optimizeDeps: {
    exclude: ['monaco-editor'],
  },
});
