import { AsciiEngine } from './AsciiEngine';
import type { AsciiPreset, EngineEventMap, EngineEventName, EngineState } from './types';
import type { ScriptEngine } from '../scripting/ScriptEngine';
import type { PointerInputOptions, PointerState } from '../input/PointerInput';
import type { ExportPresetOptions } from '../presets/presetIO';
import type { ParamDef } from '../plugins/ParamStore';
import type { TempoState } from './tempo';
import type { MorphOptions, MorphState } from './PresetMorph';
import { getPreset, type PresetId } from '../presets';

export interface CreateEngineOptions {
  /** Initial look: a preset object or a built in preset id. Defaults to the engine's built in preset. */
  preset?: AsciiPreset | string;
  /** Canvas size in CSS pixels. Defaults to the window size. */
  width?: number;
  height?: number;
  /** Start the loop immediately. Default true. */
  autoStart?: boolean;
  /** Element for the DOM text renderer, when a host wants that instead of the canvas. */
  element?: HTMLElement;
  /** Renderer to start with. Default `canvas`. */
  renderer?: 'canvas' | 'dom' | 'offscreen-canvas';
  /** Canvas backing store scale. `auto` (default) follows devicePixelRatio, capped at 2. */
  pixelRatio?: number | 'auto';
  /** Seed for every random stream; same seed, preset, and fixed timestep replay a look exactly. */
  seed?: number | string;
  /** Constant frame step in frames per second instead of the measured frame time. */
  fixedTimestep?: number;
}

/**
 * The host facing surface: everything an app needs to mount a look, drive it,
 * and tear it down. `AsciiEngine` stays available as `engine` for anything
 * beyond this.
 */
export interface EngineHandle {
  /** Start the animation loop. Safe to call twice. */
  start(): void;
  /** Stop the loop, keep state. */
  stop(): void;
  /** Resize the grid to a new CSS pixel size. Re-reads devicePixelRatio when the ratio is `auto`. */
  resize(width: number, height: number): void;
  /** Pin the backing store scale (0.5 to 2) or return to `auto`. */
  setPixelRatio(ratio: number | 'auto'): void;
  getPixelRatio(): number;
  /** Reseed every random stream; simulations and effects restart from it. */
  setSeed(seed: number | string): void;
  getSeed(): number;
  /** Constant frame step in frames per second, or null to follow the clock. */
  setFixedTimestep(fps: number | null): void;
  /** Stop and release everything. The handle is dead afterwards; `start()` then throws. */
  destroy(): void;
  /** `idle` (constructed or stopped), `running`, or `destroyed`. */
  getState(): EngineState;

  /** Switch look by preset object or built in id. Unknown ids warn and keep the current look. */
  setPreset(preset: AsciiPreset | string): void;
  /** Alias for `setPreset(id)`. */
  setPresetById(id: string): void;
  /** The active preset. */
  getPreset(): AsciiPreset;
  /** Blend into another look over `duration` seconds; the structure switches at `switchAt`. Resolves `true` at the end, `false` if cancelled. */
  morphTo(preset: AsciiPreset | string, options?: MorphOptions): Promise<boolean>;
  /** Stop a morph where it is. */
  cancelMorph(): void;
  /** Progress of the current morph; `active: false` when none is running. */
  getMorphState(): MorphState;
  /** The current look as a preset, ready to save or hand back to `setPreset()`. */
  exportPreset(options?: ExportPresetOptions): AsciiPreset;
  /** Fetch, validate, and apply a preset JSON file. */
  loadPresetFromUrl(url: string, init?: RequestInit): Promise<AsciiPreset>;

  /** Set a numeric control (`density`, `speed`, anything in `preset.controls`). */
  setControl(name: string, value: number): void;
  /** Read a control; `fallback` when it has never been set. */
  getControl(name: string, fallback?: number): number;

  /** A plugin's tunables (`describePluginParams`) and their current values; `setPluginParams` clamps and ignores unknown names. */
  describePluginParams(id: string): ParamDef[];
  getPluginParams(id: string): Record<string, number>;
  setPluginParams(id: string, params: Record<string, number>): void;

  /** Override the glyph characters, bypassing the preset's glyph language. */
  setGlyphSet(glyphs: string[]): void;
  /** Foreground color for the canvas renderer. */
  setColor(color: string): void;
  /** Push a bass level (0 to 1) from the host's own audio analysis for per glyph scale pulses. */
  setBassGlyphScale(level: number): void;
  /** Current audio amplitude (0 to 1) from the engine's own audio input; 0 when no audio is connected. */
  getLevel(): number;

  /** Load a pixel source (`image`, `video`, `webcam`, `canvas`) and make it the active input. */
  loadSource(id: 'image' | 'video' | 'webcam' | 'canvas', input: unknown): Promise<void>;
  /** Back to procedural generation. */
  clearSource(): void;

  /** Computer keyboard notes (A to L) on the engine's own listener. Off by default. */
  enableKeyboardInput(): void;
  disableKeyboardInput(): void;
  /** Mouse, touch, and pen on the canvas: press is a `noteOn` at that spot. Off by default. */
  enablePointerInput(options?: PointerInputOptions): void;
  disablePointerInput(): void;
  /** Normalized pointer position and press state. */
  getPointerState(): PointerState;
  /** MIDI clock, else audio beat detection, else none: `{ source, bpm, phase, barPhase, beat, confidence }`. */
  getTempo(): TempoState;

  /** The sandboxed script runtime. */
  getScriptEngine(): ScriptEngine;

  /** Subscribe to an engine event. Returns the unsubscribe function. */
  on<K extends EngineEventName>(event: K, listener: (payload: EngineEventMap[K]) => void): () => void;
  off<K extends EngineEventName>(event: K, listener: (payload: EngineEventMap[K]) => void): void;

  /** The full engine, for anything the handle does not cover. */
  readonly engine: AsciiEngine;
}

function resolvePreset(preset: AsciiPreset | string | undefined): AsciiPreset | undefined {
  if (preset === undefined) return undefined;
  if (typeof preset !== 'string') return preset;
  const found = getPreset(preset as PresetId) as AsciiPreset | undefined;
  if (!found) console.warn(`[createEngine] Unknown preset id "${preset}", using the default`);
  return found;
}

/**
 * Mount the engine on a canvas and get back the host surface.
 *
 * ```ts
 * const engine = createEngine(canvas, { preset: 'glyphOrganicBloom' });
 * engine.setControl('speed', 0.8);
 * engine.on('noteOn', (note) => {});
 * ```
 */
export function createEngine(canvas: HTMLCanvasElement, options: CreateEngineOptions = {}): EngineHandle {
  const engine = new AsciiEngine({
    canvas,
    element: options.element,
    renderer: options.renderer,
    preset: resolvePreset(options.preset),
    width: options.width,
    height: options.height,
    autoStart: options.autoStart,
    pixelRatio: options.pixelRatio,
    seed: options.seed,
    fixedTimestep: options.fixedTimestep,
  });

  return {
    engine,
    start: () => engine.start(),
    stop: () => engine.stop(),
    resize: (width, height) => engine.resize(width, height),
    setPixelRatio: (ratio) => engine.setPixelRatio(ratio),
    getPixelRatio: () => engine.getPixelRatio(),
    setSeed: (seed) => engine.setSeed(seed),
    getSeed: () => engine.getSeed(),
    setFixedTimestep: (fps) => engine.setFixedTimestep(fps),
    destroy: () => engine.destroy(),
    getState: () => engine.getState(),

    setPreset: (preset) => {
      if (typeof preset === 'string') engine.setPresetById(preset);
      else engine.setPreset(preset);
    },
    setPresetById: (id) => engine.setPresetById(id),
    getPreset: () => engine.getPreset(),
    morphTo: (preset, options) => engine.morphTo(preset, options),
    cancelMorph: () => engine.cancelMorph(),
    getMorphState: () => engine.getMorphState(),
    exportPreset: (options) => engine.exportPreset(options),
    loadPresetFromUrl: (url, init) => engine.loadPresetFromUrl(url, init),

    setControl: (name, value) => engine.setControl(name, value),
    getControl: (name, fallback) => engine.getControl(name, fallback),

    describePluginParams: (id) => engine.describePluginParams(id),
    getPluginParams: (id) => engine.getPluginParams(id),
    setPluginParams: (id, params) => engine.setPluginParams(id, params),

    setGlyphSet: (glyphs) => engine.setGlyphSet(glyphs),
    setColor: (color) => engine.setColor(color),
    setBassGlyphScale: (level) => engine.setBassGlyphScale(level),
    getLevel: () => engine.getAudioFeatures()?.amplitude ?? 0,

    loadSource: async (id, input) => {
      engine.setActiveSource(id);
      await engine.loadSource(id, input);
    },
    clearSource: () => engine.setSourceMode('procedural'),

    enableKeyboardInput: () => engine.enableKeyboardInput(),
    disableKeyboardInput: () => engine.disableKeyboardInput(),
    enablePointerInput: (options) => engine.enablePointerInput(undefined, options),
    disablePointerInput: () => engine.disablePointerInput(),
    getPointerState: () => engine.getPointerState(),
    getTempo: () => engine.getTempo(),

    getScriptEngine: () => engine.getScriptEngine(),

    on: (event, listener) => engine.on(event, listener),
    off: (event, listener) => engine.off(event, listener),
  };
}
