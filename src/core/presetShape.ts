import type { AsciiPreset } from './types';

/**
 * Where each numeric control lives in the nested preset shape. `base` is the
 * preset's top level. Everything the engine reads through `getControl()` and
 * that a preset can default is here.
 */
export const CONTROL_GROUP = {
  density: 'base',
  speed: 'base',
  trailAmount: 'base',
  glitchAmount: 'base',
  symmetry: 'pattern',
  petals: 'pattern',
  spiralAmount: 'pattern',
  cellularAmount: 'pattern',
  scanlineAmount: 'pattern',
  strength: 'motion',
  randomness: 'motion',
  frequency: 'motion',
  amplitude: 'motion',
  decay: 'motion',
  drag: 'motion',
  gravity: 'motion',
  noiseScale: 'motion',
  flowStrength: 'motion',
  tempoSync: 'motion',
  simStrength: 'simulation',
  simSpeed: 'simulation',
  simDensity: 'simulation',
  simDecay: 'simulation',
  simSpawnRate: 'simulation',
  postFeedback: 'post',
  postSmear: 'post',
  postDisplacement: 'post',
  postThreshold: 'post',
  postInvert: 'post',
  postEdge: 'post',
  postPosterize: 'post',
  postScanline: 'post',
  postDither: 'post',
  audioAttack: 'audio',
  audioRelease: 'audio',
  audioSensitivity: 'audio',
  audioNoiseGate: 'audio',
  audioMinThreshold: 'audio',
  audioMaxClamp: 'audio',
} as const satisfies Record<string, 'base' | 'pattern' | 'motion' | 'simulation' | 'post' | 'audio'>;

export type PresetControlName = keyof typeof CONTROL_GROUP;
export type PresetGroupName = (typeof CONTROL_GROUP)[PresetControlName];

/** Engine defaults for the four base values when a preset leaves them out. */
export const BASE_DEFAULTS = { density: 1, speed: 1, trailAmount: 0.3, glitchAmount: 0.1 } as const;

/** Where each flat only key of the 0.1 and 0.2 shape lives in the nested shape. */
const FLAT_KEY_HOME: Record<string, string> = {
  motionField: 'motion.field',
  motions: 'motion.behaviors',
  simulations: 'simulation.behaviors',
  postProcessing: 'post.passes',
  effects: 'plugins',
  patterns: 'plugins',
  audioMapping: 'audio.mapping',
  inputMapping: 'input',
  glyphLanguage: 'glyphs.language',
  glyphCategories: 'glyphs.categories',
  glyphRules: 'glyphs.rules',
  glyphMorphing: 'glyphs.morphing',
  glyphAnimation: 'glyphs.animation',
};
for (const name of Object.keys(CONTROL_GROUP) as PresetControlName[]) {
  if (CONTROL_GROUP[name] !== 'base') FLAT_KEY_HOME[name] = `${CONTROL_GROUP[name]}.${name}`;
}

/** Flat keys that only exist in the 0.1 and 0.2 shape. Any of them marks a preset as flat. */
const FLAT_ONLY_KEYS = new Set([
  'motionField',
  'motions',
  'simulations',
  'postProcessing',
  'effects',
  'patterns',
  'audioMapping',
  'inputMapping',
  'glyphLanguage',
  'glyphCategories',
  'glyphRules',
  'glyphMorphing',
  'glyphAnimation',
  ...(Object.keys(CONTROL_GROUP) as PresetControlName[]).filter((k) => CONTROL_GROUP[k] !== 'base'),
]);

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** True when the input carries any flat only key of the 0.2 shape. Nested presets never do. */
export function isFlatPreset(input: unknown): boolean {
  if (!isObject(input)) return false;
  return Object.keys(input).some((k) => FLAT_ONLY_KEYS.has(k));
}

/** Each flat only key the input carries, with where it belongs, for the error a flat preset gets. */
export function flatKeyReport(input: unknown): string[] {
  if (!isObject(input)) return [];
  return Object.keys(input)
    .filter((k) => FLAT_ONLY_KEYS.has(k))
    .map((k) => `${k} -> ${FLAT_KEY_HOME[k]}`);
}

/** Read a preset's default for a control, wherever its group puts it. */
export function getPresetValue(preset: AsciiPreset, name: string): number | undefined {
  const group = (CONTROL_GROUP as Record<string, PresetGroupName | undefined>)[name];
  if (!group) return undefined;
  const holder = group === 'base' ? preset : (preset[group] as Record<string, unknown> | undefined);
  const v = holder?.[name as keyof typeof holder];
  return typeof v === 'number' ? v : undefined;
}

/** Every numeric default a preset sets, keyed by control name. */
export function presetControlValues(preset: AsciiPreset): Record<string, number> {
  const out: Record<string, number> = {};
  for (const name of Object.keys(CONTROL_GROUP) as PresetControlName[]) {
    const v = getPresetValue(preset, name);
    if (v !== undefined) out[name] = v;
  }
  return out;
}

function pickNumbers(source: Record<string, unknown>, names: string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const n of names) {
    if (source[n] !== undefined) out[n] = source[n] as number;
  }
  return out;
}

function controlsOf(group: PresetGroupName): string[] {
  return (Object.keys(CONTROL_GROUP) as PresetControlName[]).filter((k) => CONTROL_GROUP[k] === group);
}

function defined<T extends Record<string, unknown>>(obj: T): T | undefined {
  return Object.keys(obj).some((k) => obj[k] !== undefined) ? obj : undefined;
}

/**
 * One way conversion of a 0.2 flat preset to the nested shape, for hosts
 * with old preset files: run it once, save the result, and load that. The
 * engine itself no longer accepts the flat shape (since 0.5.0). Pure and
 * structural: it re-homes fields and copies everything else through, so a
 * malformed input stays malformed for `validatePreset()` to report. Already
 * nested input comes back as a shallow copy.
 */
export function migratePreset(input: unknown): AsciiPreset {
  if (!isFlatPreset(input)) return { ...(input as AsciiPreset) };
  const f = input as Record<string, unknown>;

  const rest: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(f)) {
    if (!FLAT_ONLY_KEYS.has(k)) rest[k] = v;
  }

  const hasBehaviors = Array.isArray(f.motions) && f.motions.length > 0;
  const motion = defined({
    // `none` is the default, and the field is ignored once behaviors are listed.
    field: f.motionField === 'none' || hasBehaviors ? undefined : f.motionField,
    behaviors: f.motions,
    ...pickNumbers(f, controlsOf('motion')),
  });
  const pattern = defined(pickNumbers(f, controlsOf('pattern')));
  const simulation = defined({ behaviors: f.simulations, ...pickNumbers(f, controlsOf('simulation')) });
  const post = defined({ passes: f.postProcessing, ...pickNumbers(f, controlsOf('post')) });
  const audio = defined({ mapping: f.audioMapping, ...pickNumbers(f, controlsOf('audio')) });
  const glyphs = defined({
    language: f.glyphLanguage,
    categories: f.glyphCategories,
    rules: f.glyphRules,
    morphing: f.glyphMorphing,
    animation: f.glyphAnimation,
  });

  const nested: Record<string, unknown> = { ...rest };
  // Legacy `effects` and `patterns` were only read when `plugins` was empty.
  if (!Array.isArray(f.plugins) || f.plugins.length === 0) {
    const legacy = legacyPluginsFrom(f);
    if (legacy) nested.plugins = legacy;
  }
  if (motion) nested.motion = motion;
  if (pattern) nested.pattern = pattern;
  if (simulation) nested.simulation = simulation;
  if (post) nested.post = post;
  if (audio) nested.audio = audio;
  if (f.inputMapping !== undefined) nested.input = f.inputMapping;
  if (glyphs) nested.glyphs = glyphs;
  return nested as unknown as AsciiPreset;
}

const LEGACY_PATTERN_IDS: Record<string, string> = { wave: 'wavePattern' };

function legacyPluginsFrom(f: Record<string, unknown>): { id: string; type: string; enabled?: boolean }[] | null {
  const ids: { id: string; type: string; enabled?: boolean }[] = [];
  if (f.motionField === 'noise') ids.push({ id: 'noise', type: 'effect' });
  if (f.motionField === 'wave') ids.push({ id: 'wave', type: 'effect' });
  if (Array.isArray(f.effects)) {
    for (const e of f.effects as { type?: unknown; enabled?: unknown }[]) {
      if (typeof e?.type === 'string' && e.enabled !== false && !ids.some((p) => p.id === e.type)) {
        ids.push({ id: e.type, type: 'effect' });
      }
    }
  }
  if (Array.isArray(f.patterns)) {
    for (const p of f.patterns as unknown[]) {
      if (typeof p !== 'string') continue;
      const id = LEGACY_PATTERN_IDS[p] ?? p;
      if (!ids.some((x) => x.id === id)) ids.push({ id, type: 'pattern' });
    }
  }
  return ids.length > 0 ? ids : null;
}
