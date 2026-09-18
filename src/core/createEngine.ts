import { AsciiEngine } from './AsciiEngine';
import type { AsciiPreset, EngineEventMap, EngineEventName } from './types';
import type { ScriptEngine } from '../scripting/ScriptEngine';
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
  /** Resize the grid to a new CSS pixel size. */
  resize(width: number, height: number): void;
  /** Stop and release everything. The handle is dead afterwards. */
  destroy(): void;

  /** Switch look by preset object or built in id. Unknown ids warn and keep the current look. */
  setPreset(preset: AsciiPreset | string): void;
  /** Alias for `setPreset(id)`. */
  setPresetById(id: string): void;
  /** The active preset. */
  getPreset(): AsciiPreset;

  /** Set a numeric control (`density`, `speed`, anything in `preset.controls`). */
  setControl(name: string, value: number): void;
  /** Read a control; `fallback` when it has never been set. */
  getControl(name: string, fallback?: number): number;

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
  });

  return {
    engine,
    start: () => engine.start(),
    stop: () => engine.stop(),
    resize: (width, height) => engine.resize(width, height),
    destroy: () => engine.destroy(),

    setPreset: (preset) => {
      if (typeof preset === 'string') engine.setPresetById(preset);
      else engine.setPreset(preset);
    },
    setPresetById: (id) => engine.setPresetById(id),
    getPreset: () => engine.getPreset(),

    setControl: (name, value) => engine.setControl(name, value),
    getControl: (name, fallback) => engine.getControl(name, fallback),

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

    getScriptEngine: () => engine.getScriptEngine(),

    on: (event, listener) => engine.on(event, listener),
    off: (event, listener) => engine.off(event, listener),
  };
}
