import type { NoteEvent } from './types';
import type { MotionManagerDebugState } from '../motion/Motion';

export interface EngineDebugState {
  preset: string;
  effects: string[];
  patterns: string[];
  motions: string[];
  density: number;
  speed: number;
  glitchAmount: number;
  trailAmount: number;
  symmetry: number;
  petals: number;
  spiralAmount: number;
  cellularAmount: number;
  scanlineAmount: number;
  strength: number;
  randomness: number;
  frequency: number;
  amplitude: number;
  lastNoteOn: NoteEvent | null;
  fps: number;
  time: number;
  motion: MotionManagerDebugState;
}
