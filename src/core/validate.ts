import { listPluginIds } from '../plugins/builtins';
import { listMotionIds } from '../motion/builtins';
import { MOTION_CONTROLS } from '../motion/Motion';
import { SOURCE_CONTROLS } from '../sources/Source';
import { SIMULATION_CONTROLS } from '../simulation/Simulation';
import { POST_CONTROLS } from '../compositing/builtins';
import { AUDIO_SMOOTHING_CONTROLS } from '../audio/AudioTypes';
import { PERFORMANCE_CONTROLS } from '../performance/PerformanceTypes';
import { listSimulationIds } from '../simulation/builtins';

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
