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
import type { AsciiPreset, } from './types';
import { CONTROL_GROUP, isFlatPreset, flatKeyReport } from './presetShape';
import { liveControlDefs } from '../presets/controlCatalog';

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

const warnedNonFinite = new Set<string>();

/** Once per call site and name: a NaN or infinite number reached the engine and was ignored. */
export function warnNonFinite(where: string, name: string, value: unknown): void {
  const key = `${where}:${name}`;
  if (warnedNonFinite.has(key)) return;
  warnedNonFinite.add(key);
  console.warn(`[AsciiEngine] ${where}: "${name}" was ${String(value)}; ignored. Numbers must be finite.`);
}

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
// Only the nested shape is accepted; the 0.2 flat shape is an error that
// names every field to move (or `migratePreset()` does it once). See
// PRESET_SCHEMA.md.
// ---------------------------------------------------------------------------

const MOTION_FIELD_TYPES = new Set(['noise', 'wave', 'none']);
const PLUGIN_TYPES = new Set(['pattern', 'effect', 'input', 'renderer', 'utility']);
const BASE_NUMBERS = ['density', 'speed', 'trailAmount', 'glitchAmount'] as const;
const GROUP_LISTS: Record<string, string> = {
  motion: 'behaviors',
  simulation: 'behaviors',
  post: 'passes',
};

export interface PresetValidationResult {
  ok: boolean;
  /** Structural problems. The preset cannot be applied safely. */
  errors: string[];
  /** Suspicious but survivable: out-of-range values, unknown ids. */
  warnings: string[];
  /** The preset with `controls` filled in, when `ok`. */
  preset?: AsciiPreset;
}

const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isNonEmptyString = (v: unknown): v is string => typeof v === 'string' && v.length > 0;
const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Validate a preset's structure. Pure: no console output, no side effects.
 * Nested shape only; a 0.2 flat preset fails with every field to move
 * listed, and `migratePreset()` converts one in place.
 */
export function validatePreset(input: unknown): PresetValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!isObject(input)) {
    return { ok: false, errors: ['preset must be an object'], warnings };
  }
  const p: Record<string, unknown> = { ...input };
  const where = isNonEmptyString(p.id) ? `preset "${p.id}"` : 'preset';
  if (isFlatPreset(input)) {
    return {
      ok: false,
      errors: [
        `${where}: the flat preset shape (0.2) is not accepted since 0.5.0. Move each field into its group (${flatKeyReport(input).join(', ')}), or run migratePreset() once and save the result. See PRESET_SCHEMA.md`,
      ],
      warnings,
    };
  }

  if (!isNonEmptyString(p.id)) errors.push('id must be a non-empty string');
  if (!isNonEmptyString(p.name)) errors.push(`${where}: name must be a non-empty string`);

  if (!Array.isArray(p.glyphSet) || p.glyphSet.length === 0) {
    errors.push(`${where}: glyphSet must be a non-empty array of strings`);
  } else if (!p.glyphSet.every((g) => typeof g === 'string' && g.length > 0)) {
    errors.push(`${where}: glyphSet entries must be non-empty strings`);
  }

  if (p.plugins !== undefined) {
    if (!Array.isArray(p.plugins)) {
      errors.push(`${where}: plugins must be an array`);
    } else {
      p.plugins.forEach((pl, i) => {
        if (!isObject(pl)) { errors.push(`${where}: plugins[${i}] must be an object`); return; }
        if (!isNonEmptyString(pl.id)) errors.push(`${where}: plugins[${i}].id must be a non-empty string`);
        if (!PLUGIN_TYPES.has(pl.type as string)) errors.push(`${where}: plugins[${i}].type must be one of ${[...PLUGIN_TYPES].join(', ')}`);
        if (pl.params !== undefined) {
          if (!isObject(pl.params)) {
            errors.push(`${where}: plugins[${i}].params must be an object when present`);
          } else {
            for (const [k, v] of Object.entries(pl.params)) {
              if (!isFiniteNumber(v)) errors.push(`${where}: plugins[${i}].params.${k} must be a finite number`);
            }
          }
        }
      });
    }
  }

  if (p.controls !== undefined) {
    if (!Array.isArray(p.controls)) {
      errors.push(`${where}: controls must be an array`);
    } else {
      p.controls.forEach((ctl, i) => {
        if (!isObject(ctl)) { errors.push(`${where}: controls[${i}] must be an object`); return; }
        const c = ctl;
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
  }

  for (const k of BASE_NUMBERS) {
    if (p[k] !== undefined && !isFiniteNumber(p[k])) errors.push(`${where}: ${k} must be a finite number when present`);
  }
  if (isFiniteNumber(p.density) && p.density <= 0) errors.push(`${where}: density must be greater than 0`);
  for (const k of ['speed', 'trailAmount', 'glitchAmount'] as const) {
    if (isFiniteNumber(p[k]) && (p[k] as number) < 0) warnings.push(`${where}: ${k} is negative`);
  }

  // Groups: an object when present; numeric fields finite; list fields arrays.
  for (const group of ['motion', 'pattern', 'simulation', 'post', 'audio', 'glyphs'] as const) {
    const g = p[group];
    if (g === undefined) continue;
    if (!isObject(g)) { errors.push(`${where}: ${group} must be an object when present`); continue; }
    for (const [k, v] of Object.entries(g)) {
      const owner = (CONTROL_GROUP as Record<string, string | undefined>)[k];
      if (owner === group && v !== undefined && !isFiniteNumber(v)) {
        errors.push(`${where}: ${group}.${k} must be a finite number when present`);
      }
    }
    const list = GROUP_LISTS[group];
    if (list && g[list] !== undefined && !Array.isArray(g[list])) {
      errors.push(`${where}: ${group}.${list} must be an array when present`);
    }
  }
  const motion = isObject(p.motion) ? p.motion : undefined;
  if (motion?.field !== undefined && !MOTION_FIELD_TYPES.has(motion.field as string)) {
    errors.push(`${where}: motion.field must be one of ${[...MOTION_FIELD_TYPES].join(', ')}`);
  }
  if (Array.isArray(motion?.behaviors)) {
    motion.behaviors.forEach((m, i) => {
      if (!isObject(m) || !isNonEmptyString(m.id)) errors.push(`${where}: motion.behaviors[${i}].id must be a non-empty string`);
      else if (m.weight !== undefined && !isFiniteNumber(m.weight)) errors.push(`${where}: motion.behaviors[${i}].weight must be a finite number`);
    });
  }
  for (const k of ['layers'] as const) {
    if (p[k] !== undefined && !Array.isArray(p[k])) errors.push(`${where}: ${k} must be an array when present`);
  }
  if (p.input !== undefined && !isObject(p.input)) errors.push(`${where}: input must be an object when present`);
  if (p.source !== undefined && !isObject(p.source)) errors.push(`${where}: source must be an object when present`);

  if (Array.isArray(p.plugins)) {
    const known = new Set<string>(listPatternIds());
    for (const pl of p.plugins) {
      if (isObject(pl) && pl.type === 'pattern' && isNonEmptyString(pl.id) && !known.has(pl.id) && !listPluginIds().includes(pl.id)) {
        errors.push(`${where}: plugin "${pl.id}" is not a known pattern id`);
      }
    }
  }

  const ok = errors.length === 0;
  if (!ok) return { ok, errors, warnings };
  const preset = p as unknown as AsciiPreset;
  // Sliders default to whatever the composition reads; an empty list means the same as none.
  if (!preset.controls || preset.controls.length === 0) preset.controls = liveControlDefs(preset);
  return { ok, errors, warnings, preset };
}

/**
 * Validate and throw on structural errors. Warnings go to the console once
 * per preset id. Returns the preset with `controls` filled in. Called from
 * AsciiEngine.setPreset().
 */
const warnedPresetIds = new Set<string>();
export function assertValidPreset(input: unknown): AsciiPreset {
  const result = validatePreset(input);
  if (!result.ok || !result.preset) {
    const id = (input as { id?: unknown })?.id;
    const label = typeof id === 'string' && id ? ` "${id}"` : '';
    throw new Error(`[AsciiEngine] Invalid preset${label}:\n  - ${result.errors.join('\n  - ')}`);
  }
  const id = result.preset.id;
  if (result.warnings.length && !warnedPresetIds.has(id)) {
    warnedPresetIds.add(id);
    console.warn(`[AsciiEngine] Preset "${id}" loaded with warnings:\n  - ${result.warnings.join('\n  - ')}`);
  }
  return result.preset;
}
