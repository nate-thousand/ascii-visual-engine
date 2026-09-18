import type { AsciiPreset } from './types';
import { resolvePresetPlugins } from '../plugins/builtins';
import { resolvePresetMotions } from '../motion/builtins';
import { resolvePresetSimulations } from '../simulation/builtins';
import { resolvePresetLayers, resolvePresetPostProcessing } from '../compositing/builtins';
import { resolvePresetAudioMapping } from '../audio/builtins';

/**
 * Which numeric controls each built in subsystem reads, keyed by kind because
 * ids collide across kinds (`spiral` motion and pattern, `gravity` motion and
 * simulation, `scanline` pattern and post pass). `tests/live-controls.test.ts`
 * checks this table against the `getControl()` calls in the source.
 */
export const CONTROL_CONSUMERS = {
  motion: {
    breathing: ['strength', 'amplitude'],
    brownian: ['strength', 'randomness', 'decay'],
    curlNoise: ['strength', 'amplitude', 'noiseScale'],
    flocking: ['strength'],
    flowField: ['amplitude', 'flowStrength', 'noiseScale'],
    gravity: ['strength', 'gravity', 'drag'],
    orbital: ['strength', 'amplitude'],
    organicGrowth: ['strength', 'frequency'],
    pulse: ['strength', 'amplitude', 'frequency'],
    spiral: ['strength', 'amplitude', 'frequency'],
    wave: ['strength', 'amplitude', 'frequency'],
    wind: ['strength', 'randomness', 'flowStrength'],
  },
  pattern: {
    radialSymmetry: ['symmetry', 'petals'],
    spiral: ['spiralAmount'],
    cellular: ['cellularAmount'],
    scanline: ['scanlineAmount'],
    grid: [],
    wavePattern: [],
  },
  effect: {
    glitch: ['glitchAmount'],
    trails: ['trailAmount'],
    noise: [],
    wave: [],
    burst: [],
  },
  simulation: {
    boids: ['simStrength', 'simSpeed'],
    cellularAutomata: ['simStrength', 'simSpeed', 'simDensity', 'simDecay'],
    fluid: ['simStrength', 'simSpeed', 'simSpawnRate'],
    gravity: ['simStrength', 'simSpeed'],
    lsystem: ['simStrength', 'simSpeed'],
    particle: ['simStrength', 'simSpeed', 'simSpawnRate', 'simDecay'],
    reactionDiffusion: ['simStrength', 'simSpeed'],
    spring: ['simStrength', 'simSpeed', 'simDecay'],
  },
  post: {
    displacement: ['postDisplacement'],
    dither: ['postDither'],
    edge: ['postEdge'],
    feedback: ['postFeedback'],
    invert: ['postInvert'],
    posterize: ['postPosterize'],
    scanline: ['postScanline'],
    smear: ['postSmear'],
    threshold: ['postThreshold'],
  },
} as const satisfies Record<string, Record<string, readonly string[]>>;

/** Read by the engine for every preset. */
export const GLOBAL_CONTROLS = ['density', 'speed'] as const;

/** Read by the audio analyzer whenever a preset maps audio. */
export const AUDIO_CONTROLS = [
  'audioAttack',
  'audioRelease',
  'audioSensitivity',
  'audioNoiseGate',
  'audioMinThreshold',
  'audioMaxClamp',
] as const;

type Kind = keyof typeof CONTROL_CONSUMERS;

function consumersFor(kind: Kind, id: string): readonly string[] {
  const table = CONTROL_CONSUMERS[kind] as Record<string, readonly string[]>;
  return table[id] ?? [];
}

/**
 * The control names a preset's enabled motions, patterns, effects,
 * simulations, post passes, and audio mapping actually read, plus the globals.
 * A host building a panel can intersect this with `preset.controls` to show
 * only sliders that change the output.
 */
export function listLiveControls(preset: AsciiPreset): string[] {
  const live = new Set<string>(GLOBAL_CONTROLS);

  // Glyph language classifies by motion strength (buildGlyphContext).
  if (preset.glyphLanguage) live.add('strength');

  for (const motion of resolvePresetMotions(preset)) {
    for (const c of consumersFor('motion', motion.id)) live.add(c);
  }
  for (const id of resolvePresetPlugins(preset)) {
    for (const c of consumersFor('pattern', id)) live.add(c);
    for (const c of consumersFor('effect', id)) live.add(c);
  }
  for (const sim of resolvePresetSimulations(preset)) {
    for (const c of consumersFor('simulation', sim.id)) live.add(c);
  }
  for (const pass of resolvePresetPostProcessing(preset)) {
    for (const c of consumersFor('post', pass.id)) live.add(c);
  }
  for (const layer of resolvePresetLayers(preset)) {
    if (layer.enabled === false || !layer.pattern) continue;
    for (const c of consumersFor('pattern', layer.pattern)) live.add(c);
  }
  if (resolvePresetAudioMapping(preset)) {
    for (const c of AUDIO_CONTROLS) live.add(c);
  }

  return Array.from(live);
}
