/** Where the engine's tempo comes from. MIDI clock wins over audio analysis when both are present. */
export type TempoSource = 'midi' | 'audio' | 'none';

export interface TempoState {
  source: TempoSource;
  /** Beats per minute; 0 when there is no tempo. */
  bpm: number;
  /** 0 to 1 within the current beat. */
  phase: number;
  /** 0 to 1 within the current bar of four beats. */
  barPhase: number;
  /** Beats counted since the source started or was reset. */
  beat: number;
  /** MIDI: transport running. Audio: 1 while onsets keep arriving. */
  confidence: number;
}

export const NO_TEMPO: TempoState = Object.freeze({
  source: 'none',
  bpm: 0,
  phase: 0,
  barPhase: 0,
  beat: 0,
  confidence: 0,
});

/** A tempo phase as an angle for sine based motion: one full turn per `beatsPerCycle` beats. */
export function tempoAngle(tempo: TempoState, beatsPerCycle: number): number {
  return ((tempo.beat + tempo.phase) / beatsPerCycle) * Math.PI * 2;
}
