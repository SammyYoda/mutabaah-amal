import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

// Run from the repo root as `vite web` (dev) / `vite build web --outDir ../dist/web`; `root` is this folder.
export default defineConfig({
  resolve: {
    alias: { '@shared': fileURLToPath(new URL('../shared', import.meta.url)) }, // == '../shared'
  },
  server: {
    port: 3000,
    strictPort: true,
    proxy: { '/api': 'http://localhost:3001' },
    fs: { allow: ['..'] }, // ../shared lives outside the web root
  },
  build: {
    emptyOutDir: true, // outDir (../dist/web) is outside the root, so Vite would not clear it otherwise
  },
});
