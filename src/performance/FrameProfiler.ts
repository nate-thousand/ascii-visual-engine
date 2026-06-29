import type { FramePhase, FrameSample, PhaseTiming } from './PerformanceTypes';

export class FrameProfiler {
  private frameStart = 0;
  private phaseStart = 0;
  private currentPhases: PhaseTiming[] = [];
  private fpsHistory: number[] = [];
  private historySize: number;
  private lastTotalMs = 0;
  private slowestPhase: FramePhase | null = null;
  private slowestPhaseMs = 0;

  constructor(historySize = 120) {
    this.historySize = historySize;
  }

  beginFrame(now: number): void {
    this.frameStart = now;
    this.phaseStart = now;
    this.currentPhases = [];
    this.slowestPhase = null;
    this.slowestPhaseMs = 0;
  }

  markPhase(phase: FramePhase): void {
    const now = performance.now();
    const durationMs = now - this.phaseStart;
    if (this.currentPhases.length > 0) {
      const prev = this.currentPhases[this.currentPhases.length - 1];
      prev.durationMs = durationMs;
      if (durationMs > this.slowestPhaseMs) {
        this.slowestPhaseMs = durationMs;
        this.slowestPhase = prev.phase;
      }
    }
    this.currentPhases.push({ phase, durationMs: 0 });
    this.phaseStart = now;
  }

  endFrame(fps: number): FrameSample {
    const now = performance.now();
    if (this.currentPhases.length > 0) {
      const last = this.currentPhases[this.currentPhases.length - 1];
      last.durationMs = now - this.phaseStart;
      if (last.durationMs > this.slowestPhaseMs) {
        this.slowestPhaseMs = last.durationMs;
        this.slowestPhase = last.phase;
      }
    }
    this.lastTotalMs = now - this.frameStart;
    this.fpsHistory.push(fps);
    if (this.fpsHistory.length > this.historySize) {
      this.fpsHistory.shift();
    }
    return {
      timestamp: now,
      totalMs: this.lastTotalMs,
      fps,
      phases: [...this.currentPhases],
    };
  }

  getLastTotalMs(): number {
    return this.lastTotalMs;
  }

  getPhaseTimings(): PhaseTiming[] {
    return [...this.currentPhases];
  }

  getFpsHistory(): number[] {
    return [...this.fpsHistory];
  }

  getSlowestPhase(): { phase: FramePhase | null; ms: number } {
    return { phase: this.slowestPhase, ms: this.slowestPhaseMs };
  }

  sumPhaseMs(...phases: FramePhase[]): number {
    return this.currentPhases
      .filter((p) => phases.includes(p.phase))
      .reduce((sum, p) => sum + p.durationMs, 0);
  }
}
