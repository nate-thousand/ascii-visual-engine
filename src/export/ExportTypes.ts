import type { GridState } from '../core/types';
import type { AsciiSceneDocument } from './SceneFormat';

export type ExportFormat =
  | 'png'
  | 'svg'
  | 'gif'
  | 'ascii'
  | 'json'
  | 'sequence'
  | 'mp4'
  | 'webm'
  | 'pdf';

export interface ExportResult {
  ok: boolean;
  format: ExportFormat;
  blob?: Blob;
  data?: string;
  filename?: string;
  error?: string;
}

export interface ScreenshotOptions {
  transparent?: boolean;
  width?: number;
  height?: number;
  pixelRatio?: number;
  mimeType?: 'image/png' | 'image/jpeg';
  filename?: string;
  copyToClipboard?: boolean;
}

export interface SequenceExportOptions {
  frameRate?: number;
  maxFrames?: number;
  prefix?: string;
  transparent?: boolean;
  width?: number;
  height?: number;
  pixelRatio?: number;
}

export interface AsciiExportOptions {
  format?: 'plain' | 'ansi' | 'unicode';
  includeMetadata?: boolean;
  lineEnding?: '\n' | '\r\n';
}

export interface SvgExportOptions {
  fontFamily?: string;
  fontSize?: number;
  color?: string;
  backgroundColor?: string | 'transparent';
  cellWidth?: number;
  cellHeight?: number;
  transparent?: boolean;
}

export interface GifExportOptions {
  frameRate?: number;
  maxFrames?: number;
  loop?: boolean;
  transparent?: boolean;
  width?: number;
  height?: number;
  filename?: string;
}

export interface RecordedFrame {
  index: number;
  time: number;
  grid: GridState;
  png?: Blob;
}

export type RecordingState = 'idle' | 'recording' | 'paused' | 'stopped';

export interface RecordingStatus {
  state: RecordingState;
  frameCount: number;
  duration: number;
  frameRate: number;
}

export interface PlaybackStatus {
  playing: boolean;
  paused: boolean;
  frameIndex: number;
  frameCount: number;
  speed: number;
  loop: boolean;
  time: number;
}

export interface ExportDebugState {
  recording: RecordingStatus;
  playback: PlaybackStatus;
  lastExport: ExportFormat | null;
  lastExportTime: number | null;
}

export interface ExportEngineBridge {
  getCanvas(): HTMLCanvasElement | null;
  getGridState(): GridState;
  getPreset(): import('../core/types').AsciiPreset;
  getControl(name: string, fallback?: number): number;
  getControls(): Record<string, number>;
  getActiveRendererId(): string | null;
  getInputMapping(): import('../input/InputTypes').InputMappingConfig;
  getAudioMapping(): import('../audio/AudioTypes').AudioMappingConfig;
  getResolvedGlyphSet(): string[];
  getDebugState(): import('../core/debug').EngineDebugState;
  applySceneDocument(doc: AsciiSceneDocument): void;
  isRunning(): boolean;
}

export const FUTURE_EXPORT_FORMATS: ExportFormat[] = ['mp4', 'webm', 'pdf'];
