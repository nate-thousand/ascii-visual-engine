import type { NoteEvent } from './types';

export interface EngineDebugState {
  preset: string;
  effects: string[];
  patterns: string[];
  density: number;
  speed: number;
  glitchAmount: number;
  trailAmount: number;
  symmetry: number;
  petals: number;
  spiralAmount: number;
  cellularAmount: number;
  scanlineAmount: number;
  lastNoteOn: NoteEvent | null;
  fps: number;
  time: number;
}
