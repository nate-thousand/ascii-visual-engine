import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createMockCanvas, stubAnimationFrame } from './helpers/mockCanvas';

const distPath = resolve(
  fileURLToPath(new URL('.', import.meta.url)),
  '../dist/ascii-visual-engine.js',
);
const distExists = existsSync(distPath);

describe('Consumer smoke (dist bundle)', () => {
  beforeEach(() => {
    vi.spyOn(Math, 'random').mockReturnValue(0.42);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it.skipIf(!distExists)(
    'imports built dist bundle and runs a short frame loop',
    async () => {
      const mod = await import(pathToFileURL(distPath).href);
      expect(mod.AsciiEngine).toBeTypeOf('function');
      expect(mod.getPreset).toBeTypeOf('function');

      const { advanceFrames } = stubAnimationFrame();
      const canvas = createMockCanvas(640, 480);

      const engine = new mod.AsciiEngine({
        canvas,
        preset: mod.getPreset('basic'),
        width: 640,
        height: 480,
        autoStart: true,
      });

      advanceFrames(10);

      const cells = engine.getRendererManager().getGridState(0).cells;
      expect(cells.length).toBeGreaterThan(0);

      const chars = cells.map((c: { char: string }) => c.char);
      expect(chars.some((c: string) => c !== chars[0])).toBe(true);

      const debug = engine.getDebugState();
      expect(debug.preset).toBe('basic');
      expect(debug.effects).toContain('wave');

      engine.destroy();
      expect(engine.getDebugState().preset).toBe('basic');
    },
  );

  it('dist artifact exists when running test:all', () => {
    if (process.env.REQUIRE_DIST === '1') {
      expect(distExists, `Missing ${distPath}. Run npm run build first.`).toBe(true);
    }
  });
});
