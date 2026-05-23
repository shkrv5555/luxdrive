/**
 * Vite konfiqurasiyası
 *
 * • React fast refresh
 * • Proxy: dev-də /api və /socket.io → backend (5000 portu)
 * • Path alias-lər: @, @api, @components, @pages, @store, @hooks, @routes, @utils
 */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// ESM-də __dirname-i bərpa etmək üçün URL helperi istifadə edirik
const r = (p) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  plugins: [react()],

  // Alias-lər: import dəfələri qısa olsun
  resolve: {
    alias: {
      '@':           r('./src'),
      '@api':        r('./src/api'),
      '@components': r('./src/components'),
      '@pages':      r('./src/pages'),
      '@store':      r('./src/store'),
      '@hooks':      r('./src/hooks'),
      '@routes':     r('./src/routes'),
      '@utils':      r('./src/utils'),
    },
  },

  server: {
    port: 5173,
    // Backend-ə proxy — CORS olmadan API çağırışları
    proxy: {
      '/api':       { target: 'http://localhost:5000', changeOrigin: true },
      '/uploads':   { target: 'http://localhost:5000', changeOrigin: true },
      '/socket.io': { target: 'http://localhost:5000', ws: true, changeOrigin: true },
    },
  },

  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'redux-vendor': ['@reduxjs/toolkit', 'react-redux'],
          'utils':         ['axios', 'socket.io-client', 'zod'],
        },
      },
    },
  },
});
