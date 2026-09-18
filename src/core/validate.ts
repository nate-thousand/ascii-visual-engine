import { listPluginIds } from '../plugins/builtins';
import { listMotionIds } from '../motion/builtins';
import { MOTION_CONTROLS } from '../motion/Motion';
import { SOURCE_CONTROLS } from '../sources/Source';
import { SIMULATION_CONTROLS } from '../simulation/Simulation';
import { POST_CONTROLS } from '../compositing/builtins';
import { AUDIO_SMOOTHING_CONTROLS } from '../audio/AudioTypes';
import { PERFORMANCE_CONTROLS } from '../performance/PerformanceTypes';
import { listSimulationIds } from '../simulation/builtins';
import { listPatternIds } from '../patterns';
import type { AsciiPreset } from './types';

/** Control names wired through AsciiEngine.setControl / getControl. */
export const KNOWN_CONTROLS = new Set([
  'density',
  'speed',
  'trailAmount',
  'glitchAmount',
  'symmetry',
  'petals',
  'spiralAmount',
  'cellularAmount',
  'scanlineAmount',
  ...MOTION_CONTROLS,
  ...SOURCE_CONTROLS,
  ...SIMULATION_CONTROLS,
  ...POST_CONTROLS,
  ...AUDIO_SMOOTHING_CONTROLS,
  ...PERFORMANCE_CONTROLS,
]);

const warnedControls = new Set<string>();
const warnedPlugins = new Set<string>();
const warnedMotions = new Set<string>();

export function warnUnknownControl(name: string): void {
  if (KNOWN_CONTROLS.has(name) || warnedControls.has(name)) return;
  warnedControls.add(name);
  console.warn(
    `[AsciiEngine] Unknown control "${name}". Known controls: ${[...KNOWN_CONTROLS].join(', ')}`,
  );
}

export function warnUnknownPluginIds(ids: string[]): void {
  const known = new Set(listPluginIds());
  for (const id of ids) {
    if (known.has(id) || warnedPlugins.has(id)) continue;
    warnedPlugins.add(id);
    console.warn(
      `[AsciiEngine] Unknown plugin "${id}" in preset. Registered plugins: ${listPluginIds().join(', ')}`,
    );
  }
}

export function warnUnknownPreset(id: string, knownIds: string[]): void {
  if (knownIds.includes(id)) return;
  console.warn(
    `[AsciiEngine] Unknown preset "${id}". Available presets: ${knownIds.join(', ')}`,
  );
}

const warnedSimulations = new Set<string>();

export function warnUnknownSimulationIds(ids: string[]): void {
  const known = new Set(listSimulationIds());
  for (const id of ids) {
    if (known.has(id) || warnedSimulations.has(id)) continue;
    warnedSimulations.add(id);
    console.warn(
      `[AsciiEngine] Unknown simulation "${id}" in preset. Registered simulations: ${listSimulationIds().join(', ')}`,
    );
  }
}

export function warnUnknownMotionIds(ids: string[]): void {
  const known = new Set(listMotionIds());
  for (const id of ids) {
    if (known.has(id) || warnedMotions.has(id)) continue;
    warnedMotions.add(id);
    console.warn(
      `[AsciiEngine] Unknown motion "${id}" in preset. Registered motions: ${listMotionIds().join(', ')}`,
    );
  }
}

// ---------------------------------------------------------------------------
// Preset schema validation (structural). Runs on every setPreset() so a preset
// loaded from JSON fails loudly and specifically instead of breaking mid-frame.
// See PRESET_SCHEMA.md for the full shape.
// ---------------------------------------------------------------------------

const MOTION_FIELD_TYPES = new Set(['noise', 'wave', 'none']);
const PLUGIN_TYPES = new Set(['pattern', 'effect', 'input', 'renderer', 'utility']);
const REQUIRED_NUMBERS = ['density', 'speed', 'trailAmount', 'glitchAmount'] as const;
/** Optional numeric preset fields that must be finite numbers when present. */
const OPTIONAL_NUMBERS = [
  'symmetry', 'petals', 'spiralAmount', 'cellularAmount', 'scanlineAmount',
  'strength', 'randomness', 'frequency', 'amplitude', 'decay', 'drag', 'gravity',
  'noiseScale', 'flowStrength',
  'simStrength', 'simSpeed', 'simDensity', 'simDecay', 'simSpawnRate',
  'postFeedback', 'postSmear', 'postDisplacement', 'postThreshold', 'postInvert',
  'postEdge', 'postPosterize', 'postScanline', 'postDither',
  'audioAttack', 'audioRelease', 'audioSensitivity', 'audioNoiseGate',
  'audioMinThreshold', 'audioMaxClamp',
] as const;

export interface PresetValidationResult {
  ok: boolean;
  /** Structural problems. The preset cannot be applied safely. */
  errors: string[];
  /** Suspicious but survivable: out-of-range values, unknown ids. */
  warnings: string[];
}

const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isNonEmptyString = (v: unknown): v is string => typeof v === 'string' && v.length > 0;

/**
 * Validate a preset object's structure. Pure: no console output, no side effects.
 * `errors` means the shape is wrong (missing or mistyped required fields).
 * `warnings` means the shape is fine but values look off.
 */
export function validatePreset(input: unknown): PresetValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return { ok: false, errors: ['preset must be an object'], warnings };
  }
  const p = input as Record<string, unknown>;
  const where = isNonEmptyString(p.id) ? `preset "${p.id}"` : 'preset';

  if (!isNonEmptyString(p.id)) errors.push('id must be a non-empty string');
  if (!isNonEmptyString(p.name)) errors.push(`${where}: name must be a non-empty string`);

  if (!Array.isArray(p.glyphSet) || p.glyphSet.length === 0) {
    errors.push(`${where}: glyphSet must be a non-empty array of strings`);
  } else if (!p.glyphSet.every(g => typeof g === 'string' && g.length > 0)) {
    errors.push(`${where}: glyphSet entries must be non-empty strings`);
  }

  if (!MOTION_FIELD_TYPES.has(p.motionField as string)) {
    errors.push(`${where}: motionField must be one of ${[...MOTION_FIELD_TYPES].join(', ')}`);
  }

  if (!Array.isArray(p.plugins)) {
    errors.push(`${where}: plugins must be an array`);
  } else {
    p.plugins.forEach((pl, i) => {
      if (typeof pl !== 'object' || pl === null) { errors.push(`${where}: plugins[${i}] must be an object`); return; }
      const c = pl as Record<string, unknown>;
      if (!isNonEmptyString(c.id)) errors.push(`${where}: plugins[${i}].id must be a non-empty string`);
      if (!PLUGIN_TYPES.has(c.type as string)) errors.push(`${where}: plugins[${i}].type must be one of ${[...PLUGIN_TYPES].join(', ')}`);
    });
  }

  if (!Array.isArray(p.controls)) {
    errors.push(`${where}: controls must be an array`);
  } else {
    p.controls.forEach((ctl, i) => {
      if (typeof ctl !== 'object' || ctl === null) { errors.push(`${where}: controls[${i}] must be an object`); return; }
      const c = ctl as Record<string, unknown>;
      const label = isNonEmptyString(c.name) ? `controls "${c.name}"` : `controls[${i}]`;
      if (!isNonEmptyString(c.name)) errors.push(`${where}: controls[${i}].name must be a non-empty string`);
      for (const k of ['min', 'max', 'default'] as const) {
        if (!isFiniteNumber(c[k])) errors.push(`${where}: ${label}.${k} must be a finite number`);
      }
      if (isFiniteNumber(c.min) && isFiniteNumber(c.max) && c.min > c.max) {
        errors.push(`${where}: ${label} has min (${c.min}) greater than max (${c.max})`);
      }
      if (isFiniteNumber(c.min) && isFiniteNumber(c.max) && isFiniteNumber(c.default) && (c.default < c.min || c.default > c.max)) {
        warnings.push(`${where}: ${label} default ${c.default} is outside [${c.min}, ${c.max}]`);
      }
      if (c.step !== undefined && !(isFiniteNumber(c.step) && c.step > 0)) {
        errors.push(`${where}: ${label}.step must be a positive number`);
      }
      if (isNonEmptyString(c.name) && !KNOWN_CONTROLS.has(c.name)) {
        warnings.push(`${where}: ${label} is not a known engine control`);
      }
    });
  }

  for (const k of REQUIRED_NUMBERS) {
    if (!isFiniteNumber(p[k])) errors.push(`${where}: ${k} must be a finite number`);
  }
  if (isFiniteNumber(p.density) && p.density <= 0) errors.push(`${where}: density must be greater than 0`);
  for (const k of ['speed', 'trailAmount', 'glitchAmount'] as const) {
    if (isFiniteNumber(p[k]) && (p[k] as number) < 0) warnings.push(`${where}: ${k} is negative`);
  }
  for (const k of OPTIONAL_NUMBERS) {
    if (p[k] !== undefined && !isFiniteNumber(p[k])) errors.push(`${where}: ${k} must be a finite number when present`);
  }

  for (const k of ['motions', 'simulations', 'layers', 'postProcessing', 'effects', 'patterns'] as const) {
    if (p[k] !== undefined && !Array.isArray(p[k])) errors.push(`${where}: ${k} must be an array when present`);
  }
  if (Array.isArray(p.motions)) {
    p.motions.forEach((m, i) => {
      const c = m as Record<string, unknown>;
      if (typeof m !== 'object' || m === null || !isNonEmptyString(c.id)) errors.push(`${where}: motions[${i}].id must be a non-empty string`);
      else if (c.weight !== undefined && !isFiniteNumber(c.weight)) errors.push(`${where}: motions[${i}].weight must be a finite number`);
    });
  }

  if (Array.isArray(p.patterns)) {
    const known = new Set<string>(listPatternIds());
    p.patterns.forEach((id, i) => {
      if (!isNonEmptyString(id) || !known.has(id)) errors.push(`${where}: patterns[${i}] "${String(id)}" is not a known pattern id`);
    });
  }

  return { ok: errors.length === 0, errors, warnings };
}

/**
 * Validate and throw on structural errors. Warnings go to the console once per
 * preset id. Called from AsciiEngine.setPreset().
 */
const warnedPresetIds = new Set<string>();
export function assertValidPreset(input: unknown): asserts input is AsciiPreset {
  const result = validatePreset(input);
  if (!result.ok) {
    const id = (input as { id?: unknown })?.id;
    const label = typeof id === 'string' && id ? ` "${id}"` : '';
    throw new Error(`[AsciiEngine] Invalid preset${label}:\n  - ${result.errors.join('\n  - ')}`);
  }
  const id = (input as AsciiPreset).id;
  if (result.warnings.length && !warnedPresetIds.has(id)) {
    warnedPresetIds.add(id);
    console.warn(`[AsciiEngine] Preset "${id}" loaded with warnings:\n  - ${result.warnings.join('\n  - ')}`);
  }
}
