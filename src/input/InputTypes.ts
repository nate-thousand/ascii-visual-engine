import type { NoteEvent } from '../core/types';

export type InputSource = 'midi' | 'keyboard';

export type InputEventType =
  | 'noteOn'
  | 'noteOff'
  | 'controlChange'
  | 'pitchBend'
  | 'aftertouch';

export interface InputEvent {
  type: InputEventType;
  source: InputSource;
  channel: number;
  note?: number;
  velocity?: number;
  controller?: number;
  value?: number;
  pitchBend?: number;
  pressure?: number;
  timestamp: number;
}

export interface MidiDeviceInfo {
  id: string;
  name: string;
  manufacturer: string;
  state: string;
  connection: string;
}

export type PerformanceTargetType =
  | 'control'
  | 'noteOn'
  | 'noteOff'
  | 'layerOpacity'
  | 'postPass'
  | 'togglePlugin'
  | 'setPreset';

export interface PerformanceControlTarget {
  type: 'control';
  control: string;
  min?: number;
  max?: number;
  amount?: number;
}

export interface PerformanceNoteTarget {
  type: 'noteOn' | 'noteOff';
  mapPitchToX?: boolean;
  mapPitchToY?: boolean;
  mapVelocityToIntensity?: boolean;
  minIntensity?: number;
  maxIntensity?: number;
}

export interface PerformanceLayerTarget {
  type: 'layerOpacity';
  layerId: string;
  min?: number;
  max?: number;
}

export interface PerformancePostPassTarget {
  type: 'postPass';
  passId: string;
  min?: number;
  max?: number;
}

export interface PerformanceTogglePluginTarget {
  type: 'togglePlugin';
  pluginId: string;
}

export interface PerformanceSetPresetTarget {
  type: 'setPreset';
  presetId: string;
}

export type PerformanceTarget =
  | PerformanceControlTarget
  | PerformanceNoteTarget
  | PerformanceLayerTarget
  | PerformancePostPassTarget
  | PerformanceTogglePluginTarget
  | PerformanceSetPresetTarget;

export interface CcMapping {
  controller: number;
  channel?: number;
  target: PerformanceTarget;
}

export interface NoteMapping {
  note?: number;
  channel?: number;
  minNote?: number;
  maxNote?: number;
  target: PerformanceTarget;
}

export interface PitchBendMapping {
  target: PerformanceControlTarget;
}

export interface AftertouchMapping {
  target: PerformanceControlTarget;
}

export interface LearnedMapping {
  id: string;
  controller: number;
  channel?: number;
  target: PerformanceTarget;
}

export interface InputMappingConfig {
  enabled?: boolean;
  channelFilter?: number[];
  ccMappings?: CcMapping[];
  noteMappings?: NoteMapping[];
  pitchBend?: PitchBendMapping;
  modWheel?: PerformanceControlTarget;
  aftertouch?: AftertouchMapping;
  learnedMappings?: LearnedMapping[];
  defaultNoteOn?: boolean;
  defaultNoteOff?: boolean;
}

export interface InputMappingPresetConfig extends InputMappingConfig {
  devicePreset?: DevicePresetId;
}

export type DevicePresetId =
  | 'akaiMpkMini'
  | 'novationLaunchkey'
  | 'genericKeyboard'
  | 'qwertyKeyboard';

export interface InputDebugState {
  midiConnected: boolean;
  keyboardEnabled: boolean;
  deviceId: string | null;
  deviceName: string | null;
  error: string | null;
  learnMode: boolean;
  learnTarget: string | null;
  activeNotes: number[];
  lastEvent: InputEvent | null;
  mappingCount: number;
  learnedCount: number;
}

export interface NoteMonitorEntry {
  note: number;
  velocity: number;
  channel: number;
  source: InputSource;
  type: 'on' | 'off';
  timestamp: number;
}

export const INPUT_STORAGE_KEY = 'ascii-visual-engine:input-mapping';

export const MOD_WHEEL_CC = 1;
export const PITCH_BEND_RANGE = 8192;

export function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

export function midiNoteToNormalized(note: number): number {
  return clamp01(note / 127);
}

export function midiVelocityToNormalized(velocity: number): number {
  return clamp01(velocity / 127);
}

export function mapMidiToNoteEvent(
  note: number,
  velocity: number,
  channel: number,
  source: InputSource,
): NoteEvent {
  return {
    id: note,
    x: midiNoteToNormalized(note),
    y: clamp01(channel / 15),
    intensity: 0.4 + midiVelocityToNormalized(velocity) * 1.6,
    data: { source, channel, note, velocity },
  };
}
