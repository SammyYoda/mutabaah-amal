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
    // API_URL overrides the API target when port 3001 is taken locally (e.g. API_URL=http://localhost:3101).
    proxy: { '/api': process.env.API_URL ?? 'http://localhost:3001' },
    fs: { allow: ['..'] }, // ../shared lives outside the web root
  },
  build: {
    emptyOutDir: true, // outDir (../dist/web) is outside the root, so Vite would not clear it otherwise
  },
});
