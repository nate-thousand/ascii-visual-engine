import { describe, it, expect } from 'vitest';
import { validatePreset, assertValidPreset } from '../src/core/validate';
import { basicPreset } from '../src/presets/basic';
import { listPresets } from '../src/presets';
import type { AsciiPreset } from '../src/core/types';

describe('Preset validation', () => {
  it('accepts all built-in presets', () => {
    for (const preset of listPresets()) {
      const result = validatePreset(preset);
      expect(result.ok, `${preset.id}: ${result.errors.join(', ')}`).toBe(true);
    }
  });

  it('accepts basicPreset via assertValidPreset', () => {
    expect(() => assertValidPreset(basicPreset)).not.toThrow();
  });

  it('rejects missing id and glyphSet', () => {
    const result = validatePreset({
      ...basicPreset,
      id: '',
      glyphSet: [],
    });
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes('id'))).toBe(true);
    expect(result.errors.some((e) => e.includes('glyphSet'))).toBe(true);
  });

  it('rejects invalid motionField and numeric fields', () => {
    const invalid = {
      ...basicPreset,
      motionField: 'invalid' as AsciiPreset['motionField'],
      density: Number.NaN,
    };
    const result = validatePreset(invalid);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes('motionField'))).toBe(true);
    expect(result.errors.some((e) => e.includes('density'))).toBe(true);
  });

  it('rejects unknown legacy pattern ids', () => {
    const result = validatePreset({
      ...basicPreset,
      patterns: ['wave', 'notARealPattern' as never],
    });
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes('notARealPattern'))).toBe(true);
  });

  it('throws from assertValidPreset with a helpful message', () => {
    expect(() =>
      assertValidPreset({
        ...basicPreset,
        speed: Number.POSITIVE_INFINITY,
      }),
    ).toThrow(/Invalid preset "basic".*speed/);
  });
});
