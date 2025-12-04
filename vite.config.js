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
    // Copy all assets including JS files
    copyPublicDir: true,
    minify: 'esbuild',
    sourcemap: false
  },
  // Public directory for static assets that should be copied as-is
  publicDir: 'public',
  server: {
    port: 3000,
    open: '/index-enhanced.html'
  },
  preview: {
    port: 4173,
    open: '/index-enhanced.html'
  }
});
