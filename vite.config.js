import { defineConfig } from 'vite';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// Plugin to inject build timestamp into service worker
function injectServiceWorkerVersion() {
  return {
    name: 'inject-sw-version',
    closeBundle() {
      const swPath = join(process.cwd(), 'dist', 'sw.js');
      try {
        let swContent = readFileSync(swPath, 'utf-8');
        const buildTimestamp = Date.now().toString();
        swContent = swContent.replace('__BUILD_TIMESTAMP__', buildTimestamp);
        writeFileSync(swPath, swContent);
        console.log(`[Build] Service worker version set to: ${buildTimestamp}`);
      } catch (error) {
        console.error('[Build] Failed to update service worker version:', error);
      }
    }
  };
}

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
  plugins: [injectServiceWorkerVersion()],
  server: {
    port: 3000,
    open: '/index-enhanced.html'
  },
  preview: {
    port: 4173,
    open: '/index-enhanced.html'
  }
});
