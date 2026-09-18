import type { AsciiPreset, ControlDef } from '../core/types';
import { listLiveControls } from '../core/liveControls';

type ControlRange = Omit<ControlDef, 'name'>;

/** Range, step, label, and fallback default for every numeric control the engine reads. */
export const CONTROL_CATALOG: Record<string, ControlRange> = {
  density: { label: 'Density', min: 0.3, max: 2, default: 1, step: 0.1 },
  speed: { label: 'Speed', min: 0.1, max: 3, default: 1, step: 0.1 },
  strength: { label: 'Strength', min: 0, max: 1, default: 0.7, step: 0.05 },
  randomness: { label: 'Randomness', min: 0, max: 1, default: 0.3, step: 0.05 },
  frequency: { label: 'Frequency', min: 0.1, max: 3, default: 1, step: 0.1 },
  amplitude: { label: 'Amplitude', min: 0, max: 2, default: 1, step: 0.05 },
  decay: { label: 'Decay', min: 0, max: 1, default: 0.1, step: 0.05 },
  drag: { label: 'Drag', min: 0, max: 1, default: 0.05, step: 0.05 },
  gravity: { label: 'Gravity', min: 0, max: 2, default: 0.5, step: 0.05 },
  noiseScale: { label: 'Noise Scale', min: 0.1, max: 3, default: 1, step: 0.1 },
  flowStrength: { label: 'Flow Strength', min: 0, max: 1, default: 0.8, step: 0.05 },
  trailAmount: { label: 'Trails', min: 0, max: 1, default: 0.4, step: 0.05 },
  glitchAmount: { label: 'Glitch', min: 0, max: 1, default: 0.1, step: 0.05 },
  symmetry: { label: 'Symmetry', min: 2, max: 12, default: 6, step: 1 },
  petals: { label: 'Petals', min: 3, max: 12, default: 5, step: 1 },
  spiralAmount: { label: 'Spiral', min: 0, max: 1, default: 0.5, step: 0.05 },
  cellularAmount: { label: 'Cellular', min: 0, max: 1, default: 0.5, step: 0.05 },
  scanlineAmount: { label: 'Scanline', min: 0, max: 1, default: 0.5, step: 0.05 },
  simStrength: { label: 'Sim Strength', min: 0, max: 1, default: 0.8, step: 0.05 },
  simSpeed: { label: 'Sim Speed', min: 0.1, max: 3, default: 1, step: 0.1 },
  simDensity: { label: 'Sim Density', min: 0, max: 1, default: 0.5, step: 0.05 },
  simSpawnRate: { label: 'Spawn Rate', min: 0, max: 1, default: 0.6, step: 0.05 },
  simDecay: { label: 'Sim Decay', min: 0, max: 1, default: 0.2, step: 0.05 },
  postFeedback: { label: 'Feedback', min: 0, max: 1, default: 0.7, step: 0.05 },
  postSmear: { label: 'Smear', min: 0, max: 1, default: 0.5, step: 0.05 },
  postDisplacement: { label: 'Displacement', min: 0, max: 1, default: 0.5, step: 0.05 },
  postThreshold: { label: 'Threshold', min: 0, max: 1, default: 0.5, step: 0.05 },
  postInvert: { label: 'Invert', min: 0, max: 1, default: 1, step: 0.05 },
  postEdge: { label: 'Edge', min: 0, max: 1, default: 0.5, step: 0.05 },
  postPosterize: { label: 'Posterize', min: 0, max: 1, default: 0.5, step: 0.05 },
  postScanline: { label: 'Post Scanline', min: 0, max: 1, default: 0.5, step: 0.05 },
  postDither: { label: 'Dither', min: 0, max: 1, default: 0.5, step: 0.05 },
  audioAttack: { label: 'Audio Attack', min: 0.01, max: 1, default: 0.08, step: 0.01 },
  audioRelease: { label: 'Audio Release', min: 0.01, max: 1, default: 0.25, step: 0.01 },
  audioSensitivity: { label: 'Sensitivity', min: 0.1, max: 3, default: 1, step: 0.05 },
  audioNoiseGate: { label: 'Noise Gate', min: 0, max: 0.2, default: 0.02, step: 0.005 },
  audioMinThreshold: { label: 'Audio Floor', min: 0, max: 1, default: 0, step: 0.01 },
  audioMaxClamp: { label: 'Audio Ceiling', min: 0, max: 1, default: 1, step: 0.01 },
};

/**
 * Control definitions for exactly the controls a preset's composition reads,
 * in catalog order. Defaults come from the preset's own flat field when it
 * sets one, else from the catalog. Presets that describe their composition
 * and let this derive `controls` cannot declare a slider nothing reads.
 */
export function liveControlDefs(
  preset: Omit<AsciiPreset, 'controls'> & { controls?: ControlDef[] },
): ControlDef[] {
  const live = new Set(listLiveControls({ ...preset, controls: [] }));
  const declared = new Map((preset.controls ?? []).map((c) => [c.name, c]));
  const defs: ControlDef[] = [];
  for (const [name, range] of Object.entries(CONTROL_CATALOG)) {
    if (!live.has(name)) continue;
    const own = declared.get(name);
    if (own) {
      defs.push(own);
      continue;
    }
    const flat = (preset as Record<string, unknown>)[name];
    defs.push({ name, ...range, default: typeof flat === 'number' ? flat : range.default });
  }
  return defs;
}

/**
 * Finish a preset by deriving `controls` from its composition. Declared
 * control definitions are kept for names the composition reads (an author's
 * range or default wins); names nothing reads are dropped.
 */
export function withLiveControls(
  preset: Omit<AsciiPreset, 'controls'> & { controls?: ControlDef[] },
): AsciiPreset {
  return { ...preset, controls: liveControlDefs(preset) };
}
