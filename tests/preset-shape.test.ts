import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  migratePreset,
  isFlatPreset,
  flatKeyReport,
  getPresetValue,
  presetControlValues,
} from '../src/core/presetShape';
import { validatePreset, assertValidPreset } from '../src/core/validate';
import { parsePreset } from '../src/presets/presetIO';
import { withLiveControls } from '../src/presets/controlCatalog';
import { getPreset, listPresets, type PresetId } from '../src/presets';
import type { AsciiPreset } from '../src/core/types';
import { AsciiEngine } from '../src/core/AsciiEngine';
import { createMockCanvas, stubAnimationFrame, gridFingerprint } from './helpers/mockCanvas';

/** The 30 built ins exactly as 0.2.0 shipped them, flat. Kept as the migration fixture. */
const flatFixtures = JSON.parse(
  readFileSync(join(__dirname, 'fixtures', 'flat-presets.json'), 'utf8'),
) as (Record<string, unknown> & { id: string })[];

describe('preset shape', () => {
  it('tells flat from nested', () => {
    expect(isFlatPreset(flatFixtures[0])).toBe(true);
    expect(isFlatPreset(getPreset('basic'))).toBe(false);
    expect(isFlatPreset({ id: 'x', name: 'x', glyphSet: ['.'], motion: { strength: 1 } })).toBe(false);
    expect(isFlatPreset({ id: 'x', name: 'x', glyphSet: ['.'], strength: 1 })).toBe(true);
  });

  it('reads control defaults from their group', () => {
    const p = getPreset('glyphOrganicBloom');
    expect(getPresetValue(p, 'speed')).toBe(0.55);
    expect(getPresetValue(p, 'strength')).toBe(0.7);
    expect(getPresetValue(p, 'symmetry')).toBeUndefined();
    expect(presetControlValues(getPreset('particleSim')).simSpawnRate).toBe(0.8);
  });

  it('nested presets carry no flat only keys', () => {
    for (const preset of listPresets()) {
      expect(isFlatPreset(preset), preset.id).toBe(false);
    }
  });
});

describe('the flat shape is rejected since 0.5.0', () => {
  it('validatePreset fails a flat preset and names where every field goes', () => {
    const r = validatePreset(flatFixtures.find((p) => p.id === 'chaotic')!);
    expect(r.ok).toBe(false);
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0]).toMatch(/preset "chaotic": the flat preset shape \(0\.2\) is not accepted since 0\.5\.0/);
    expect(r.errors[0]).toMatch(/motionField -> motion\.field/);
    expect(r.errors[0]).toMatch(/strength -> motion\.strength/);
    expect(r.errors[0]).toMatch(/migratePreset\(\)/);
    expect(r.preset).toBeUndefined();
  });

  it('flatKeyReport lists only the flat keys, with their homes', () => {
    expect(flatKeyReport({ id: 'x', name: 'x', glyphSet: ['.'], symmetry: 4, simulations: [], glyphLanguage: 'organic', density: 1 })).toEqual([
      'symmetry -> pattern.symmetry',
      'simulations -> simulation.behaviors',
      'glyphLanguage -> glyphs.language',
    ]);
    expect(flatKeyReport(getPreset('basic'))).toEqual([]);
    expect(flatKeyReport(null)).toEqual([]);
  });

  it('assertValidPreset, parsePreset, and setPreset all throw on a flat preset', () => {
    const flat = flatFixtures.find((p) => p.id === 'terminal')!;
    expect(() => assertValidPreset(flat)).toThrow(/not accepted since 0\.5\.0/);
    expect(() => parsePreset(flat, 'old.json')).toThrow(/old\.json is not a valid preset[\s\S]*not accepted since 0\.5\.0/);

    vi.unstubAllGlobals();
    stubAnimationFrame();
    const engine = new AsciiEngine({ canvas: createMockCanvas(200, 100), preset: getPreset('basic'), width: 200, height: 100, autoStart: false });
    expect(() => engine.setPreset(flat as unknown as AsciiPreset)).toThrow(/not accepted since 0\.5\.0/);
    expect(engine.getPreset().id).toBe('basic');
    engine.destroy();
    vi.unstubAllGlobals();
  });

  it('nested presets validate without a flat warning', () => {
    const n = validatePreset(getPreset('basic'));
    expect(n.ok).toBe(true);
    expect(n.warnings.some((w) => /flat/.test(w))).toBe(false);
  });
});

describe('migratePreset', () => {
  it('turns every 0.2.0 flat built in into the converted nested built in', () => {
    for (const flat of flatFixtures) {
      const converted = withLiveControls(migratePreset(flat));
      const nested = getPreset(flat.id as PresetId);
      const { controls: cc, ...convertedRest } = converted;
      const { controls: nc, ...nestedRest } = nested;
      expect(convertedRest, flat.id).toEqual(nestedRest);
      // Controls: same names and defaults (ranges may come from the catalog now).
      expect(cc.map((c) => [c.name, c.default]), flat.id).toEqual(nc!.map((c) => [c.name, c.default]));
      expect(isFlatPreset(converted), flat.id).toBe(false);
      expect(validatePreset(converted).ok, flat.id).toBe(true);
    }
  });

  it('returns a nested preset unchanged, as a copy', () => {
    const basic = getPreset('basic');
    const out = migratePreset(basic);
    expect(out).toEqual(basic);
    expect(out).not.toBe(basic);
  });

  it('folds legacy effects, patterns, and motionField into plugins when plugins are empty', () => {
    const p = migratePreset({
      id: 'legacy',
      name: 'Legacy',
      glyphSet: ['.'],
      motionField: 'noise',
      plugins: [],
      controls: [],
      density: 1,
      speed: 1,
      trailAmount: 0.3,
      glitchAmount: 0.1,
      effects: [{ type: 'burst', enabled: true }, { type: 'glitch', enabled: false }],
      patterns: ['wave', 'spiral'],
    });
    expect(p.plugins?.map((x) => x.id)).toEqual(['noise', 'burst', 'wavePattern', 'spiral']);
    expect(p.motion?.field).toBe('noise');
  });

  it('a migrated flat preset renders the same frames as its nested built in', () => {
    const run = (preset: AsciiPreset) => {
      // A fresh clock per run so both engines see the same frames.
      vi.unstubAllGlobals();
      const frames = stubAnimationFrame();
      const engine = new AsciiEngine({
        canvas: createMockCanvas(320, 240),
        preset,
        width: 320,
        height: 240,
        autoStart: true,
        seed: 1,
      });
      frames.advanceFrames(4);
      const fp = gridFingerprint(engine.getRendererManager().getGridState(0).cells);
      engine.destroy();
      return fp;
    };
    const flat = flatFixtures.find((p) => p.id === 'terminal')!;
    expect(run(migratePreset(flat))).toBe(run(getPreset('terminal')));
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });
});

describe('a minimal nested preset', () => {
  it('is valid, gets its controls derived, and runs', () => {
    const r = validatePreset({ id: 'tiny', name: 'Tiny', glyphSet: ['.', '#'], motion: { behaviors: [{ id: 'breathing' }] } });
    expect(r.ok).toBe(true);
    expect(r.preset?.controls?.map((c) => c.name)).toEqual(['density', 'speed', 'strength', 'amplitude', 'tempoSync']);

    const frames = stubAnimationFrame();
    const engine = new AsciiEngine({
      canvas: createMockCanvas(200, 100),
      preset: { id: 'tiny', name: 'Tiny', glyphSet: ['.', '#'] },
      width: 200,
      height: 100,
      autoStart: true,
    });
    frames.advanceFrames(2);
    expect(engine.getControl('speed')).toBe(1);
    expect(engine.getPreset().controls?.map((c) => c.name)).toEqual(['density', 'speed']);
    engine.destroy();
    vi.unstubAllGlobals();
  });
});
