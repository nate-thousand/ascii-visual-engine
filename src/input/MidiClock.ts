import type { TempoState } from '../core/tempo';

export const MIDI_CLOCK = 0xf8;
export const MIDI_START = 0xfa;
export const MIDI_CONTINUE = 0xfb;
export const MIDI_STOP = 0xfc;
export const MIDI_SONG_POSITION = 0xf2;

const TICKS_PER_BEAT = 24;
const BEATS_PER_BAR = 4;
/** Ticks average over this many recent intervals for the BPM readout. */
const AVERAGE_TICKS = 48;
/** No tick for this long and the clock is treated as gone. */
const TIMEOUT_MS = 2000;

export interface MidiClockState {
  /** Ticks have arrived within the last two seconds. */
  active: boolean;
  /** Transport state from Start, Continue, and Stop. Ticks alone count as running. */
  running: boolean;
  bpm: number;
  /** Beats since Start (or since the first tick), including the fractional part from the tick count. */
  beat: number;
  /** 0 to 1 within the beat, interpolated between ticks. */
  phase: number;
  ticks: number;
}

/**
 * MIDI beat clock: 24 ticks per quarter note, plus Start, Continue, Stop, and
 * Song Position Pointer. Feed it status bytes with timestamps; read the
 * tempo with `getState(now)`, which interpolates the phase between ticks.
 */
export class MidiClock {
  private ticks = 0;
  private running = false;
  private lastTickMs = -Infinity;
  private intervals: number[] = [];
  private intervalSum = 0;

  reset(): void {
    this.ticks = 0;
    this.running = false;
    this.lastTickMs = -Infinity;
    this.intervals = [];
    this.intervalSum = 0;
  }

  /** Handle one system realtime or common message. Returns true if it was a clock message. */
  handleMessage(status: number, data: Uint8Array | number[], nowMs: number): boolean {
    switch (status) {
      case MIDI_CLOCK:
        this.tick(nowMs);
        return true;
      case MIDI_START:
        this.ticks = 0;
        this.running = true;
        this.intervals = [];
        this.intervalSum = 0;
        this.lastTickMs = nowMs;
        return true;
      case MIDI_CONTINUE:
        this.running = true;
        this.lastTickMs = nowMs;
        return true;
      case MIDI_STOP:
        this.running = false;
        return true;
      case MIDI_SONG_POSITION: {
        // 14 bit position in MIDI beats (sixteenth notes), six ticks each.
        const lsb = data[1] ?? 0;
        const msb = data[2] ?? 0;
        this.ticks = ((msb << 7) | lsb) * 6;
        return true;
      }
      default:
        return false;
    }
  }

  private tick(nowMs: number): void {
    if (Number.isFinite(this.lastTickMs) && this.running) {
      const interval = nowMs - this.lastTickMs;
      if (interval > 0 && interval < 1000) {
        this.intervals.push(interval);
        this.intervalSum += interval;
        if (this.intervals.length > AVERAGE_TICKS) this.intervalSum -= this.intervals.shift()!;
      }
    }
    // A device that only sends clock and never Start is still running.
    this.running = true;
    this.lastTickMs = nowMs;
    this.ticks++;
  }

  private averageIntervalMs(): number {
    return this.intervals.length > 0 ? this.intervalSum / this.intervals.length : 0;
  }

  getState(nowMs: number): MidiClockState {
    const active = Number.isFinite(this.lastTickMs) && nowMs - this.lastTickMs <= TIMEOUT_MS;
    const interval = this.averageIntervalMs();
    const bpm = active && interval > 0 ? Math.round((60000 / (interval * TICKS_PER_BEAT)) * 10) / 10 : 0;
    // Position from the tick count, plus the part of the next tick already elapsed.
    let fractionalTicks = this.ticks;
    if (active && this.running && interval > 0) {
      fractionalTicks += Math.max(0, Math.min(1, (nowMs - this.lastTickMs) / interval));
    }
    const beat = fractionalTicks / TICKS_PER_BEAT;
    return {
      active,
      running: active && this.running,
      bpm,
      beat,
      phase: beat - Math.floor(beat),
      ticks: this.ticks,
    };
  }

  /** The clock as an engine tempo, or null when no ticks have arrived recently. */
  getTempo(nowMs: number): TempoState | null {
    const s = this.getState(nowMs);
    if (!s.active || s.bpm <= 0) return null;
    const bar = s.beat / BEATS_PER_BAR;
    return {
      source: 'midi',
      bpm: s.bpm,
      phase: s.phase,
      barPhase: bar - Math.floor(bar),
      beat: Math.floor(s.beat),
      confidence: s.running ? 1 : 0.5,
    };
  }
}
