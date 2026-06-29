import type { AsciiPreset, EngineEventName, NoteEvent } from '../core/types';
import type { LayerConfig } from '../compositing/Layer';
import type { ScriptAPI } from './ScriptAPI';

export type ScriptState = 'idle' | 'running' | 'paused' | 'error';

export type ScriptEventName =
  | EngineEventName
  | 'tick'
  | 'presetChanged'
  | 'controlChange'
  | 'simulationUpdate'
  | 'pointer';

export interface ScriptModule {
  id: string;
  name?: string;
  description?: string;
  version?: string;
  init?(api: ScriptAPI, ctx: ScriptContext): void | Promise<void>;
  update?(api: ScriptAPI, ctx: ScriptContext, dt: number): void;
  destroy?(api: ScriptAPI, ctx: ScriptContext): void;
  onEvent?(api: ScriptAPI, ctx: ScriptContext, event: string, data: unknown): void;
}

export interface ScriptContext {
  time: number;
  dt: number;
  frame: number;
  vars: Record<string, unknown>;
}

export interface ScriptLogEntry {
  level: 'log' | 'warn' | 'error';
  message: string;
  timestamp: number;
}

export interface ScriptDebugState {
  activeScriptId: string | null;
  enabledScripts: string[];
  state: ScriptState;
  error: string | null;
  logs: ScriptLogEntry[];
  frameCount: number;
}

export interface CreatePresetOptions {
  id: string;
  name: string;
  basePresetId?: string;
  glyphLanguage?: string | string[];
  glyphSet?: string[];
  motions?: string[];
  simulations?: string[];
  plugins?: AsciiPreset['plugins'];
  patterns?: AsciiPreset['patterns'];
  controls?: AsciiPreset['controls'];
  density?: number;
  speed?: number;
  trailAmount?: number;
  glitchAmount?: number;
  layers?: AsciiPreset['layers'];
  [key: string]: unknown;
}

export interface SpawnParticlesOptions {
  x?: number;
  y?: number;
  intensity?: number;
  count?: number;
}

export interface ScheduledControl {
  at: number;
  control: string;
  value: number;
}

export interface ScheduledNote {
  at: number;
  event: NoteEvent;
}

export interface ScriptEngineBridge {
  setPreset(preset: AsciiPreset): void;
  setPresetById(id: string): void;
  getPreset(): AsciiPreset;
  setControl(name: string, value: number): void;
  getControl(name: string, fallback?: number): number;
  enablePlugin(id: string): void;
  disablePlugin(id: string): void;
  enableMotion(id: string): void;
  disableMotion(id: string): void;
  setMotionWeight(id: string, weight: number): void;
  enableSimulation(id: string): void;
  disableSimulation(id: string): void;
  resetSimulations(): void;
  noteOn(event?: NoteEvent): void;
  noteOff(event?: NoteEvent): void;
  addLayer(config: LayerConfig): void;
  removeLayer(id: string): void;
  enableLayer(id: string): void;
  disableLayer(id: string): void;
  resetComposition(): void;
  registerGlyphLanguage(config: import('../glyphs/Glyph').GlyphLanguageConfig): void;
  applyGlyphLanguage(languageId: string): void;
  getTime(): number;
  getFps(): number;
  getGridState(): import('../core/types').GridState;
  emitCustom(type: string, data?: unknown): void;
  onEngineEvent(event: EngineEventName, handler: (data: unknown) => void): () => void;
  listPresetIds(): string[];
  getBasePreset(id: string): AsciiPreset | null;
}

export function createScriptContext(time: number, dt: number, frame: number): ScriptContext {
  return { time, dt, frame, vars: {} };
}
