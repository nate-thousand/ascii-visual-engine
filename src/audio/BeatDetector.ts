export interface BeatState {
  /** 1 on an onset, decaying to 0 over about a quarter second. */
  pulse: number;
  /** Estimated tempo in beats per minute, 0 until enough onsets agree. */
  bpm: number;
  /** 0 to 1 progress from the last onset toward the next predicted one; 0 without a tempo. */
  phase: number;
  /** 0 to 1: share of recent onset intervals that agree with the estimate, faded when onsets stop. */
  confidence: number;
  /** Onsets counted since the last reset or drop. */
  beat: number;
}

export interface BeatDetectorOptions {
  /** Energy history used for the adaptive threshold, in ms. Default 1000. */
  historyMs?: number;
  /** Shortest accepted gap between onsets, in ms. Default 150 (400 BPM). */
  minIntervalMs?: number;
  /** How far above the recent average the energy must rise. Default 1.3. */
  sensitivity?: number;
  /** Energy below this never counts as an onset. Default 0.15. */
  floor?: number;
  /** Tempo range the estimate is folded into. Default 60 to 200. */
  minBpm?: number;
  maxBpm?: number;
  /** Onsets kept for the estimate. Default 16. */
  intervalCount?: number;
  /** Ms without an onset before the estimate is dropped. Default 4000. */
  holdMs?: number;
}

const PULSE_TAU_MS = 90;

/**
 * Onset detection with an adaptive energy threshold, plus a tempo estimate
 * from the intervals between onsets. Feed it one energy value per frame
 * (bass works well) with the frame's timestamp.
 *
 * Onset: energy rises above `sensitivity` times the recent average, is above
 * `floor`, and at least `minIntervalMs` has passed. Tempo: every interval
 * between recent onsets is folded into the BPM range by doubling or halving,
 * the median is taken, and intervals within 10% of it are averaged. Confidence
 * is the share that agreed, faded toward 0 once onsets stop and dropped after
 * `holdMs`.
 */
export class BeatDetector {
  private readonly historyMs: number;
  private readonly minIntervalMs: number;
  private readonly sensitivity: number;
  private readonly floor: number;
  private readonly minBpm: number;
  private readonly maxBpm: number;
  private readonly intervalCount: number;
  private readonly holdMs: number;

  private history: { t: number; e: number }[] = [];
  private onsets: number[] = [];
  private lastOnset = -Infinity;
  private lastUpdate = 0;
  private pulse = 0;
  private bpm = 0;
  private intervalMs = 0;
  private confidence = 0;
  private beatCount = 0;

  constructor(options: BeatDetectorOptions = {}) {
    this.historyMs = options.historyMs ?? 1000;
    this.minIntervalMs = options.minIntervalMs ?? 150;
    this.sensitivity = options.sensitivity ?? 1.3;
    this.floor = options.floor ?? 0.15;
    this.minBpm = options.minBpm ?? 60;
    this.maxBpm = options.maxBpm ?? 200;
    this.intervalCount = options.intervalCount ?? 16;
    this.holdMs = options.holdMs ?? 4000;
  }

  reset(): void {
    this.history = [];
    this.onsets = [];
    this.lastOnset = -Infinity;
    this.lastUpdate = 0;
    this.pulse = 0;
    this.bpm = 0;
    this.intervalMs = 0;
    this.confidence = 0;
    this.beatCount = 0;
  }

  update(energy: number, nowMs: number): BeatState {
    const dt = this.lastUpdate ? Math.max(0, nowMs - this.lastUpdate) : 0;
    this.lastUpdate = nowMs;

    // Adaptive threshold over the recent window, excluding the current frame.
    let sum = 0;
    for (const h of this.history) sum += h.e;
    const average = this.history.length > 0 ? sum / this.history.length : 0;
    this.history.push({ t: nowMs, e: energy });
    while (this.history.length > 0 && nowMs - this.history[0].t > this.historyMs) this.history.shift();

    const isOnset =
      energy > this.floor &&
      energy > average * this.sensitivity &&
      nowMs - this.lastOnset >= this.minIntervalMs;

    if (isOnset) {
      this.lastOnset = nowMs;
      this.onsets.push(nowMs);
      if (this.onsets.length > this.intervalCount + 1) this.onsets.shift();
      this.pulse = 1;
      this.beatCount++;
      this.estimateTempo();
    } else {
      this.pulse *= Math.exp(-dt / PULSE_TAU_MS);
      if (this.pulse < 0.01) this.pulse = 0;
    }

    const sinceOnset = nowMs - this.lastOnset;
    if (sinceOnset > this.holdMs) {
      this.bpm = 0;
      this.intervalMs = 0;
      this.confidence = 0;
      this.onsets = [];
      this.beatCount = 0;
    } else if (this.intervalMs > 0 && sinceOnset > this.intervalMs * 2) {
      // Onsets have stopped: keep the tempo, let the confidence fade.
      this.confidence *= Math.exp(-dt / 1000);
    }

    return this.getState(nowMs);
  }

  getState(nowMs = this.lastUpdate): BeatState {
    const phase =
      this.intervalMs > 0 && Number.isFinite(this.lastOnset) ? ((nowMs - this.lastOnset) / this.intervalMs) % 1 : 0;
    return { pulse: this.pulse, bpm: this.bpm, phase, confidence: this.confidence, beat: this.beatCount };
  }

  private estimateTempo(): void {
    if (this.onsets.length < 4) return;
    const lo = 60000 / this.maxBpm;
    const hi = 60000 / this.minBpm;
    const folded: number[] = [];
    for (let i = 1; i < this.onsets.length; i++) {
      let interval = this.onsets[i] - this.onsets[i - 1];
      if (interval <= 0) continue;
      while (interval < lo) interval *= 2;
      while (interval > hi) interval /= 2;
      if (interval >= lo && interval <= hi) folded.push(interval);
    }
    if (folded.length < 3) return;

    const sorted = [...folded].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const agreeing = folded.filter((v) => Math.abs(v - median) <= median * 0.1);
    if (agreeing.length < 3) return;
    const mean = agreeing.reduce((a, b) => a + b, 0) / agreeing.length;

    this.intervalMs = mean;
    this.bpm = Math.round((60000 / mean) * 10) / 10;
    this.confidence = agreeing.length / folded.length;
  }
}
