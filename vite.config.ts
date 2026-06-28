import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig(({ command }) => {
  const isBuild = command === 'build';

  return {
    root: isBuild ? process.cwd() : resolve(__dirname, 'examples/vanilla'),
    resolve: {
      alias: {
        'ascii-visual-engine': resolve(__dirname, 'src'),
      },
    },
    server: {
      open: true,
    },
    build: isBuild
      ? {
          lib: {
            entry: resolve(__dirname, 'src/index.ts'),
            name: 'AsciiVisualEngine',
            formats: ['es', 'cjs'],
            fileName: (format) =>
              format === 'es' ? 'ascii-visual-engine.js' : 'ascii-visual-engine.cjs',
          },
          rollupOptions: {
            external: [],
          },
          outDir: 'dist',
          emptyOutDir: true,
        }
      : undefined,
    plugins: isBuild
      ? [
          dts({
            insertTypesEntry: true,
            rollupTypes: true,
          }),
        ]
      : [],
  };
});
