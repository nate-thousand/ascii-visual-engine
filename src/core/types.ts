export interface AsciiEngineOptions {
  canvas: HTMLCanvasElement;
  preset?: AsciiPreset;
  width?: number;
  height?: number;
  autoStart?: boolean;
}

export interface NoteEvent {
  id?: string | number;
  x?: number;
  y?: number;
  intensity?: number;
  data?: Record<string, unknown>;
}

export interface EngineEventPayload {
  type: string;
  data?: unknown;
}

export interface ControlDef {
  name: string;
  label?: string;
  min: number;
  max: number;
  default: number;
  step?: number;
}

export type MotionFieldType = 'noise' | 'wave' | 'none';

export type EffectType = 'noise' | 'wave' | 'burst' | 'glitch' | 'trails';

export interface EffectConfig {
  type: EffectType;
  enabled?: boolean;
  params?: Record<string, number>;
}

export interface AsciiPreset {
  id: string;
  name: string;
  glyphSet: string[];
  motionField: MotionFieldType;
  effects: EffectConfig[];
  controls: ControlDef[];
  density: number;
  speed: number;
  trailAmount: number;
  glitchAmount: number;
}

export interface GridDimensions {
  cols: number;
  rows: number;
  cellWidth: number;
  cellHeight: number;
}

export interface GridCell {
  char: string;
  baseChar: string;
  x: number;
  y: number;
  phase: number;
  brightness: number;
  burst: number;
}

export interface GridState {
  cells: GridCell[];
  cols: number;
  rows: number;
  time: number;
  width: number;
  height: number;
}

export interface EffectContext {
  grid: GridState;
  glyphSet: string[];
  speed: number;
  glitchAmount: number;
  trailAmount: number;
  dt: number;
  time: number;
}

export interface Effect {
  readonly type: EffectType;
  update(ctx: EffectContext): void;
  onNoteOn?(event: NoteEvent): void;
  onNoteOff?(event: NoteEvent): void;
  reset?(): void;
}

export interface RendererOptions {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  density: number;
  glyphSet: string[];
  fontFamily?: string;
  color?: string;
  backgroundColor?: string;
}

export type EngineEventMap = {
  start: void;
  stop: void;
  preset: AsciiPreset;
  control: { name: string; value: number };
  noteOn: NoteEvent;
  noteOff: NoteEvent;
  resize: { width: number; height: number };
  frame: { time: number; fps: number };
  custom: EngineEventPayload;
};

export type EngineEventName = keyof EngineEventMap;
