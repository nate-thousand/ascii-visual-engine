import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  normalizePreset,
  flattenPreset,
  isFlatPreset,
  getPresetValue,
  presetControlValues,
} from '../src/core/presetShape';
import { validatePreset, assertValidPreset } from '../src/core/validate';
import { withLiveControls } from '../src/presets/controlCatalog';
import { getPreset, listPresets, type PresetId } from '../src/presets';
import type { FlatPreset } from '../src/core/types';
import { AsciiEngine } from '../src/core/AsciiEngine';
import { createMockCanvas, stubAnimationFrame, gridFingerprint } from './helpers/mockCanvas';

/** The 30 built ins exactly as 0.2.0 shipped them, flat. */
const flatFixtures = JSON.parse(
  readFileSync(join(__dirname, 'fixtures', 'flat-presets.json'), 'utf8'),
) as FlatPreset[];

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

  it('every 0.2.0 flat built in normalizes to the converted nested built in', () => {
    for (const flat of flatFixtures) {
      const converted = withLiveControls(normalizePreset(flat));
      const nested = getPreset(flat.id as PresetId);
      const { controls: cc, ...convertedRest } = converted;
      const { controls: nc, ...nestedRest } = nested;
      expect(convertedRest, flat.id).toEqual(nestedRest);
      // Controls: same names and defaults (ranges may come from the catalog now).
      expect(cc.map((c) => [c.name, c.default]), flat.id).toEqual(nc!.map((c) => [c.name, c.default]));
    }
  });

  it('nested presets carry no flat only keys', () => {
    for (const preset of listPresets()) {
      expect(isFlatPreset(preset), preset.id).toBe(false);
    }
  });

  it('flatten is the inverse of normalize for the built ins', () => {
    for (const preset of listPresets()) {
      const back = normalizePreset(flattenPreset(preset));
      expect(withLiveControls(back), preset.id).toEqual(preset);
    }
  });

  it('validatePreset accepts flat input, warns, and returns the nested preset', () => {
    const r = validatePreset(flatFixtures[0]);
    expect(r.ok).toBe(true);
    expect(r.warnings.some((w) => /flat preset shape is deprecated/.test(w))).toBe(true);
    expect(r.preset?.motion?.field).toBe('wave');
    expect(isFlatPreset(r.preset)).toBe(false);

    const n = validatePreset(getPreset('basic'));
    expect(n.warnings.some((w) => /flat preset shape/.test(w))).toBe(false);
  });

  it('assertValidPreset warns once per flat preset id', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const flat = { ...flatFixtures.find((p) => p.id === 'chaotic')!, id: 'chaotic-flat-test' };
    assertValidPreset(flat);
    assertValidPreset(flat);
    expect(warn.mock.calls.filter((c) => String(c[0]).includes('chaotic-flat-test'))).toHaveLength(1);
    warn.mockRestore();
  });

  it('folds legacy effects, patterns, and motionField into plugins when plugins are empty', () => {
    const p = normalizePreset({
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

  it('a minimal nested preset is valid, gets its controls derived, and runs', () => {
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

  it('a flat preset and its nested form render the same frames', () => {
    const run = (preset: unknown) => {
      // A fresh clock per run so both engines see the same frames.
      vi.unstubAllGlobals();
      const frames = stubAnimationFrame();
      const engine = new AsciiEngine({
        canvas: createMockCanvas(320, 240),
        preset: preset as FlatPreset,
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
    expect(run(flat)).toBe(run(getPreset('terminal')));
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });
});
