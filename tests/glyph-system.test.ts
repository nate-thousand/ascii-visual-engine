import { describe, it, expect, beforeEach } from 'vitest';
import {
  GlyphRegistry,
  GlyphGenerator,
  GlyphMorpher,
  GlyphComposer,
  classifyRole,
  getCategoryGlyphs,
  getBuiltinLanguage,
  resolvePresetGlyphSet,
  BUILTIN_GLYPH_LANGUAGES,
} from '../src/glyphs';
import { organicBloomPreset } from '../src/presets/glyphs';
import { AsciiEngine } from '../src/core/AsciiEngine';
import { basicPreset } from '../src/presets/basic';
import { vi } from 'vitest';

function makeGrid(cols = 8, rows = 6) {
  const cells = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      cells.push({
        char: '.',
        baseChar: '.',
        x,
        y,
        phase: (x + y) * 0.1,
        brightness: (x + y) / (cols + rows),
        burst: 0,
        ox: 0,
        oy: 0,
        vx: 0.01 * x,
        vy: 0.01 * y,
        scale: 1,
        rotation: 0,
        deformation: 0,
      });
    }
  }
  return { cells, cols, rows, time: 1, width: 800, height: 600 };
}

function createMockCanvas(): HTMLCanvasElement {
  const ctx = {
    fillStyle: '',
    font: '',
    textBaseline: 'top',
    fillRect: vi.fn(),
    fillText: vi.fn(),
    clearRect: vi.fn(),
    canvas: { width: 800, height: 600 },
  };
  return {
    width: 800,
    height: 600,
    style: { width: '', height: '' },
    getContext: () => ctx,
  } as unknown as HTMLCanvasElement;
}

describe('GlyphRegistry', () => {
  let registry: GlyphRegistry;

  beforeEach(() => {
    registry = new GlyphRegistry();
  });

  it('registers and enables builtin languages', () => {
    registry.applyPresetConfig({ glyphLanguage: 'organicBloom', glyphSet: ['.'] });
    expect(registry.isEnabled()).toBe(true);
    expect(registry.getActiveLanguage()?.id).toBe('organicBloom');
    expect(registry.getResolvedGlyphSet().length).toBeGreaterThan(5);
  });

  it('composes multiple languages', () => {
    registry.applyPresetConfig({
      glyphLanguage: ['organicBloom', 'crtTerminal'],
      glyphSet: ['.'],
    });
    expect(registry.isEnabled()).toBe(true);
    expect(registry.getResolvedGlyphSet().length).toBeGreaterThan(10);
  });

  it('selects glyphs by semantic role', () => {
    registry.applyPresetConfig({ glyphLanguage: 'organicBloom', glyphSet: ['.'] });
    const grid = makeGrid();
    registry.applyToGrid(grid, { time: 1, cols: 8, rows: 6, density: 1 });

    const state = registry.getCellState(0);
    expect(state?.role).toBeDefined();
    expect(state?.category).toBeDefined();
    expect(state?.character.length).toBeGreaterThan(0);
    expect(registry.getResolvedGlyphSet().length).toBeGreaterThan(1);
  });

  it('falls back to legacy glyphSet when no language configured', () => {
    registry.applyPresetConfig({ glyphSet: [' ', '.', '#', '@'] });
    expect(registry.isEnabled()).toBe(false);
    expect(registry.getResolvedGlyphSet()).toEqual([' ', '.', '#', '@']);
  });
});

describe('GlyphClassifier', () => {
  it('classifies explosion for high burst', () => {
    expect(
      classifyRole({
        brightness: 0.5,
        velocity: 0,
        density: 0.5,
        curvature: 0,
        noise: 0,
        burst: 0.9,
        audioAmplitude: 0,
        motionStrength: 0,
        simulationEnergy: 0,
        x: 0.5,
        y: 0.5,
        phase: 0,
        time: 0,
      }),
    ).toBe('explosion');
  });

  it('classifies seed for low brightness', () => {
    expect(
      classifyRole({
        brightness: 0.28,
        velocity: 0,
        density: 0.5,
        curvature: 0,
        noise: 0,
        burst: 0,
        audioAmplitude: 0,
        motionStrength: 0,
        simulationEnergy: 0,
        x: 0.5,
        y: 0.5,
        phase: 0,
        time: 0,
      }),
    ).toBe('seed');
  });
});

describe('GlyphMorpher', () => {
  it('morphs through chain steps', () => {
    const morpher = new GlyphMorpher();
    const states = [
      {
        role: 'fill' as const,
        category: 'noise' as const,
        glyphId: 'n1',
        character: '.',
        morphProgress: 0,
        morphIndex: 0,
        animPhase: 0,
        animKind: null,
        weight: 0.5,
        density: 0.5,
        unicode: 46,
      },
    ];
    morpher.update(0.5, {
      enabled: true,
      chains: [{ id: 'test', steps: ['.', '°', '*'], duration: 1, loop: true }],
      speed: 1,
    });
    morpher.applyToStates(states, {
      enabled: true,
      chains: [{ id: 'test', steps: ['.', '°', '*'], duration: 1, loop: true }],
    }, 1);
    expect(['.', '°', '*']).toContain(states[0].character);
  });
});

describe('GlyphComposer', () => {
  it('merges language configs', () => {
    const composer = new GlyphComposer();
    const merged = composer.compose(['organicBloom', 'crtTerminal']);
    expect(merged?.categories?.length).toBeGreaterThan(2);
  });
});

describe('Glyph libraries', () => {
  it('provides organic glyph category', () => {
    const glyphs = getCategoryGlyphs('organic');
    expect(glyphs.some((g) => g.character === '✿')).toBe(true);
  });

  it('has all builtin languages', () => {
    expect(BUILTIN_GLYPH_LANGUAGES.length).toBeGreaterThanOrEqual(8);
    expect(getBuiltinLanguage('minimalZen')).toBeDefined();
  });
});

describe('resolvePresetGlyphSet', () => {
  it('resolves glyph language preset', () => {
    const set = resolvePresetGlyphSet(organicBloomPreset);
    expect(set.length).toBeGreaterThan(5);
  });
});

describe('AsciiEngine glyph integration', () => {
  it('loads glyph language preset', () => {
    const engine = new AsciiEngine({
      canvas: createMockCanvas(),
      preset: organicBloomPreset,
      width: 800,
      height: 600,
      autoStart: false,
    });

    expect(engine.getDebugState().glyph.enabled).toBe(true);
    expect(engine.getDebugState().glyph.languageId).toBe('organicBloom');
    expect(engine.getResolvedGlyphSet().length).toBeGreaterThan(5);
    engine.destroy();
  });

  it('basic preset works without glyph language', () => {
    const engine = new AsciiEngine({
      canvas: createMockCanvas(),
      preset: basicPreset,
      width: 800,
      height: 600,
      autoStart: false,
    });

    expect(engine.getDebugState().glyph.enabled).toBe(false);
    engine.destroy();
  });
});
