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

export interface PresetValidationResult {
  ok: boolean;
  errors: string[];
}

const VALID_MOTION_FIELDS = new Set(['noise', 'wave', 'none']);

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/** Structural validation for preset objects at load time. */
export function validatePreset(preset: AsciiPreset): PresetValidationResult {
  const errors: string[] = [];

  if (!preset || typeof preset !== 'object') {
    return { ok: false, errors: ['preset must be a non-null object'] };
  }

  if (typeof preset.id !== 'string' || preset.id.trim().length === 0) {
    errors.push('preset.id must be a non-empty string');
  }
  if (typeof preset.name !== 'string' || preset.name.trim().length === 0) {
    errors.push('preset.name must be a non-empty string');
  }
  if (!Array.isArray(preset.glyphSet) || preset.glyphSet.length === 0) {
    errors.push('preset.glyphSet must be a non-empty string array');
  } else if (preset.glyphSet.some((g) => typeof g !== 'string' || g.length === 0)) {
    errors.push('preset.glyphSet entries must be non-empty strings');
  }
  if (!VALID_MOTION_FIELDS.has(preset.motionField)) {
    errors.push(`preset.motionField must be one of: ${[...VALID_MOTION_FIELDS].join(', ')}`);
  }

  for (const field of ['density', 'speed', 'trailAmount', 'glitchAmount'] as const) {
    if (!isFiniteNumber(preset[field])) {
      errors.push(`preset.${field} must be a finite number`);
    }
  }

  const pluginConfigs = preset.plugins ?? [];
  if (!Array.isArray(pluginConfigs)) {
    errors.push('preset.plugins must be an array when provided');
  } else {
    for (const [index, plugin] of pluginConfigs.entries()) {
      if (!plugin || typeof plugin !== 'object') {
        errors.push(`preset.plugins[${index}] must be an object`);
        continue;
      }
      if (typeof plugin.id !== 'string' || plugin.id.trim().length === 0) {
        errors.push(`preset.plugins[${index}].id must be a non-empty string`);
      }
      if (typeof plugin.type !== 'string' || plugin.type.trim().length === 0) {
        errors.push(`preset.plugins[${index}].type must be a non-empty string`);
      }
    }
  }

  if (preset.patterns !== undefined) {
    const knownPatterns = new Set(listPatternIds());
    if (!Array.isArray(preset.patterns)) {
      errors.push('preset.patterns must be an array when provided');
    } else {
      for (const patternId of preset.patterns) {
        if (!knownPatterns.has(patternId)) {
          errors.push(`preset.patterns contains unknown pattern "${patternId}"`);
        }
      }
    }
  }

  if (preset.controls !== undefined) {
    if (!Array.isArray(preset.controls)) {
      errors.push('preset.controls must be an array when provided');
    } else {
      for (const [index, control] of preset.controls.entries()) {
        if (!control || typeof control !== 'object') {
          errors.push(`preset.controls[${index}] must be an object`);
          continue;
        }
        if (typeof control.name !== 'string' || control.name.trim().length === 0) {
          errors.push(`preset.controls[${index}].name must be a non-empty string`);
        }
        for (const bound of ['min', 'max', 'default'] as const) {
          if (!isFiniteNumber(control[bound])) {
            errors.push(`preset.controls[${index}].${bound} must be a finite number`);
          }
        }
        if (
          isFiniteNumber(control.min) &&
          isFiniteNumber(control.max) &&
          control.min > control.max
        ) {
          errors.push(`preset.controls[${index}] min must be <= max`);
        }
      }
    }
  }

  return { ok: errors.length === 0, errors };
}

export function assertValidPreset(preset: AsciiPreset): void {
  const result = validatePreset(preset);
  if (!result.ok) {
    const label = preset?.id ? `"${preset.id}"` : '(unknown)';
    throw new Error(`Invalid preset ${label}: ${result.errors.join('; ')}`);
  }
}

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
