import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      input: {
        main: './index-enhanced.html',
        classic: './index.html'
      }
    },
    // Ensure service worker is copied
    copyPublicDir: true
  },
  server: {
    port: 3000,
    open: '/index-enhanced.html'
  },
  preview: {
    port: 4173,
    open: '/index-enhanced.html'
  }
});
