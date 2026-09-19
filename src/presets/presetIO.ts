import type { AsciiPreset, LayerPresetConfig, PluginConfig } from '../core/types';
import type { AsciiEngine } from '../core/AsciiEngine';
import { validatePreset } from '../core/validate';
import { CONTROL_GROUP, type PresetControlName, type PresetGroupName } from '../core/presetShape';
import { listLiveControls } from '../core/liveControls';
import { withLiveControls } from './controlCatalog';

export interface ExportPresetOptions {
  /** Id for the exported preset. Default: the current preset's id with `-edit`. */
  id?: string;
  /** Display name. Default: the current preset's name with ` (edited)`. */
  name?: string;
}

/**
 * Capture what the engine is doing right now as a nested preset: enabled
 * plugins, motions with their weights, simulations, post passes, layers, the
 * glyph configuration, and the current value of every control the resulting
 * composition reads. Applying the result reproduces the look.
 */
export function exportPreset(engine: AsciiEngine, options: ExportPresetOptions = {}): AsciiPreset {
  const base = engine.getPreset();
  const registry = engine.getGlyphRegistry();
  const languageActive = registry.isEnabled();

  const plugins: PluginConfig[] = engine
    .getEnabledPlugins()
    .filter((p) => p.type === 'effect' || p.type === 'pattern')
    .map((p) => ({ id: p.id, type: p.type }));

  const behaviors = engine.getEnabledMotions().map((m) => ({ id: m.id, weight: m.weight, priority: m.priority }));
  const simulations = engine.getEnabledSimulations().map((s) => ({ id: s.id }));
  const passes = engine.getPostProcessor().getEnabled().map((p) => ({ id: p.id, enabled: true, amount: p.amount }));
  const layers: LayerPresetConfig[] = engine.getLayerManager().getAll().map((layer) => ({
    id: layer.id,
    name: layer.name,
    enabled: layer.enabled,
    opacity: layer.opacity,
    blendMode: layer.blendMode,
    mask: layer.mask.getConfig(),
    ...(layer.glyphSet ? { glyphSet: [...layer.glyphSet] } : {}),
    ...(layer.source ? { source: layer.source } : {}),
    ...(layer.pattern ? { pattern: layer.pattern } : {}),
    ...(layer.simulation ? { simulation: layer.simulation } : {}),
    ...(layer.effects.length ? { effects: [...layer.effects] } : {}),
    ...(layer.fill !== null ? { fill: layer.fill } : {}),
  }));

  const draft: AsciiPreset = {
    id: options.id ?? `${base.id}-edit`,
    name: options.name ?? `${base.name} (edited)`,
    // With a glyph language active the language resolves the characters; a
    // host override (setGlyphSet) disables the language and wins here.
    glyphSet: languageActive ? [...base.glyphSet] : [...registry.getResolvedGlyphSet()],
    plugins,
    density: engine.getControl('density'),
    speed: engine.getControl('speed'),
    trailAmount: engine.getControl('trailAmount'),
    glitchAmount: engine.getControl('glitchAmount'),
  };
  if (behaviors.length) draft.motion = { behaviors };
  if (simulations.length) draft.simulation = { behaviors: simulations };
  if (passes.length) draft.post = { passes };
  if (layers.length) draft.layers = layers;
  if (base.audio?.mapping) draft.audio = { mapping: base.audio.mapping };
  if (base.input) draft.input = base.input;
  if (base.source) draft.source = base.source;
  if (languageActive && base.glyphs) draft.glyphs = base.glyphs;

  // Every control the composition reads, at its current value, in its group.
  for (const name of listLiveControls(draft)) {
    const group = (CONTROL_GROUP as Record<string, PresetGroupName | undefined>)[name as PresetControlName];
    if (!group || group === 'base') continue;
    const holder = ((draft[group] as Record<string, unknown> | undefined) ?? {}) as Record<string, unknown>;
    holder[name] = engine.getControl(name);
    (draft as unknown as Record<string, unknown>)[group] = holder;
  }

  return withLiveControls(draft);
}

/** A preset as pretty printed JSON. */
export function presetToJson(preset: AsciiPreset): string {
  return JSON.stringify(preset, null, 2);
}

/**
 * Fetch a preset (nested or flat) and validate it. Resolves to the
 * normalized nested preset; rejects with every structural error listed.
 * Nothing is applied; pass the result to `setPreset()`.
 */
export async function loadPresetFromUrl(url: string, init?: RequestInit): Promise<AsciiPreset> {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`[loadPresetFromUrl] ${url}: HTTP ${response.status}`);
  }
  let json: unknown;
  try {
    json = await response.json();
  } catch (error) {
    throw new Error(`[loadPresetFromUrl] ${url}: not JSON (${error instanceof Error ? error.message : String(error)})`);
  }
  return parsePreset(json, url);
}

/** Validate parsed JSON as a preset; throws with every error listed. */
export function parsePreset(json: unknown, label = 'preset'): AsciiPreset {
  const result = validatePreset(json);
  if (!result.ok || !result.preset) {
    throw new Error(`[parsePreset] ${label} is not a valid preset:\n  - ${result.errors.join('\n  - ')}`);
  }
  return result.preset;
}
