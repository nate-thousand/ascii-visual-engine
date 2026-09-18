import { describe, it, expect, vi } from 'vitest';
import { validatePreset, assertValidPreset } from '../src/core/validate';
import { listPresets } from '../src/presets';
import { basicPreset } from '../src/presets/basic';
import type { AsciiPreset } from '../src/core/types';

const clone = (p: AsciiPreset): AsciiPreset => JSON.parse(JSON.stringify(p));

describe('validatePreset', () => {
  it('accepts every built-in preset with no errors', () => {
    for (const preset of listPresets()) {
      const r = validatePreset(preset);
      expect(r.errors, preset.id).toEqual([]);
      expect(r.ok, preset.id).toBe(true);
    }
  });

  it('rejects non-objects', () => {
    expect(validatePreset(null).ok).toBe(false);
    expect(validatePreset('basic').ok).toBe(false);
    expect(validatePreset([]).ok).toBe(false);
  });

  it('reports missing required fields by name', () => {
    const p = clone(basicPreset) as Partial<AsciiPreset> & { density?: unknown };
    delete p.glyphSet;
    p.density = 'thick';
    const r = validatePreset(p);
    expect(r.ok).toBe(false);
    expect(r.errors.join('\n')).toMatch(/glyphSet must be a non-empty array/);
    expect(r.errors.join('\n')).toMatch(/density must be a finite number/);
  });

  it('rejects a bad motion field and bad plugin types, nested or flat', () => {
    const nested = clone(basicPreset) as Record<string, unknown>;
    nested.motion = { field: 'spiral' };
    (nested.plugins as unknown[]).push({ id: 'wave', type: 'shader' });
    const r = validatePreset(nested);
    expect(r.errors.some(e => /motion\.field must be one of/.test(e))).toBe(true);
    expect(r.errors.some(e => /plugins\[\d+\]\.type must be one of/.test(e))).toBe(true);
    expect(r.warnings.some(e => /flat preset shape is deprecated/.test(e))).toBe(false);

    const flat = clone(basicPreset) as Record<string, unknown>;
    flat.motionField = 'spiral';
    const f = validatePreset(flat);
    expect(f.errors.some(e => /motion\.field must be one of/.test(e))).toBe(true);
    expect(f.warnings.some(e => /flat preset shape is deprecated/.test(e))).toBe(true);
  });

  it('rejects controls with min greater than max, warns on out-of-range defaults', () => {
    const p = clone(basicPreset);
    p.controls = [
      { name: 'density', min: 1, max: 0, default: 0.5 },
      { name: 'speed', min: 0, max: 1, default: 5 },
    ];
    const r = validatePreset(p);
    expect(r.errors.some(e => /min \(1\) greater than max \(0\)/.test(e))).toBe(true);
    expect(r.warnings.some(w => /default 5 is outside \[0, 1\]/.test(w))).toBe(true);
  });

  it('warns on unknown control names without failing', () => {
    const p = clone(basicPreset);
    p.controls = [{ name: 'wobble', min: 0, max: 1, default: 0.2 }];
    const r = validatePreset(p);
    expect(r.ok).toBe(true);
    expect(r.warnings.some(w => /"wobble" is not a known engine control/.test(w))).toBe(true);
  });

  it('rejects NaN and non-number optional fields', () => {
    const p = clone(basicPreset) as Record<string, unknown>;
    p.speed = Number.NaN;
    p.postFeedback = '0.5';
    const r = validatePreset(p);
    expect(r.errors.some(e => /speed must be a finite number/.test(e))).toBe(true);
    expect(r.errors.some(e => /postFeedback must be a finite number when present/.test(e))).toBe(true);
  });
});

describe('assertValidPreset', () => {
  it('throws with every error listed', () => {
    const p = clone(basicPreset) as Record<string, unknown>;
    p.id = '';
    p.glyphSet = [];
    expect(() => assertValidPreset(p)).toThrow(/Invalid preset[\s\S]*id must be[\s\S]*glyphSet must be/);
  });

  it('does not throw for warnings, logs them once per preset id', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const p = clone(basicPreset);
    p.id = 'warn-once-test';
    p.controls = [{ name: 'wobble', min: 0, max: 1, default: 0.2 }];
    expect(() => assertValidPreset(p)).not.toThrow();
    expect(() => assertValidPreset(p)).not.toThrow();
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it('rejects unknown legacy pattern ids', () => {
    const result = validatePreset({ ...basicPreset, patterns: ['wave', 'notARealPattern' as never] });
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes('notARealPattern'))).toBe(true);
  });

  it('throws from assertValidPreset with the preset id and field in the message', () => {
    expect(() => assertValidPreset({ ...basicPreset, speed: Number.POSITIVE_INFINITY })).toThrow(/Invalid preset "basic".*speed/s);
  });
});
