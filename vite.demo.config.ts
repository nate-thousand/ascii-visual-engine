import { defineConfig } from 'vite';
import { resolve } from 'path';

/** Builds the vanilla browser demo to dist-demo/ for static hosting (Vercel). */
export default defineConfig({
  root: resolve(__dirname, 'examples/vanilla'),
  resolve: {
    alias: {
      'ascii-visual-engine': resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: resolve(__dirname, 'dist-demo'),
    emptyOutDir: true,
  },
});
