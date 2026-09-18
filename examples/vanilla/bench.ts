import type { AsciiEngine, FramePhase } from 'ascii-visual-engine';

export interface BenchRow {
  preset: string;
  pixelRatio: number;
  viewport: string;
  cells: number;
  /** Wall clock frames per second from requestAnimationFrame over the window. */
  fps: number;
  /** CPU time per frame, mean and 95th percentile, from the engine profiler. */
  frameMs: number;
  frameP95: number;
  /** Slowest phase on average and its time. */
  slowest: string;
  slowestMs: number;
  phases: Record<string, number>;
}

export interface BenchOptions {
  /** Presets to measure. Default: the six hero looks. */
  presets?: string[];
  /** Seconds per preset after a settle period. Default 3. */
  seconds?: number;
  /** Settle time after switching, seconds. Default 0.5. */
  settle?: number;
  /** Pixel ratios to measure. Default: the current one. */
  pixelRatios?: (number | 'auto')[];
}

const HERO = [
  'glyphOrganicBloom',
  'glyphDigitalForest',
  'glyphCrtTerminal',
  'glyphCorruptedBroadcast',
  'glyphFlowField',
  'glyphMinimalZen',
];

function wait(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
}

/**
 * Measure the engine at its current viewport. Samples the profiler once per
 * animation frame so the numbers are per frame, not per second. Adaptive
 * quality is disabled for the run and restored after, so density stays at
 * the preset default.
 */
export async function runFrameBudget(engine: AsciiEngine, options: BenchOptions = {}): Promise<BenchRow[]> {
  const presets = options.presets ?? HERO;
  const seconds = options.seconds ?? 3;
  const settle = options.settle ?? 0.5;
  const ratios = options.pixelRatios ?? [engine.getPixelRatio()];
  const perf = engine.getPerformanceManager();
  const adaptiveWas = engine.getDebugState().performance.adaptiveQuality;
  perf.setAdaptiveQuality(false);
  const startPreset = engine.getPreset().id;
  const rows: BenchRow[] = [];

  try {
    for (const ratio of ratios) {
      engine.setPixelRatio(ratio);
      for (const id of presets) {
        engine.setPresetById(id);
        await wait(settle * 1000);

        const frameTimes: number[] = [];
        const phaseSums = new Map<FramePhase, number>();
        let frames = 0;
        const t0 = performance.now();
        await new Promise<void>((resolve) => {
          const tick = () => {
            const p = engine.getDebugState().performance;
            frameTimes.push(p.frameTimeMs);
            for (const ph of p.phaseTimings) {
              phaseSums.set(ph.phase, (phaseSums.get(ph.phase) ?? 0) + ph.durationMs);
            }
            frames++;
            if (performance.now() - t0 < seconds * 1000) requestAnimationFrame(tick);
            else resolve();
          };
          requestAnimationFrame(tick);
        });
        const elapsed = (performance.now() - t0) / 1000;
        const phases: Record<string, number> = {};
        let slowest = '';
        let slowestMs = 0;
        for (const [phase, sum] of phaseSums) {
          const mean = sum / frames;
          phases[phase] = +mean.toFixed(2);
          if (mean > slowestMs) {
            slowestMs = mean;
            slowest = phase;
          }
        }
        const grid = engine.getGridState();
        rows.push({
          preset: id,
          pixelRatio: engine.getPixelRatio(),
          viewport: `${window.innerWidth}x${window.innerHeight}`,
          cells: grid.cols * grid.rows,
          fps: +(frames / elapsed).toFixed(1),
          frameMs: +(frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length).toFixed(2),
          frameP95: +percentile(frameTimes, 0.95).toFixed(2),
          slowest,
          slowestMs: +slowestMs.toFixed(2),
          phases,
        });
      }
    }
  } finally {
    perf.setAdaptiveQuality(adaptiveWas);
    engine.setPixelRatio('auto');
    engine.setPresetById(startPreset);
  }
  return rows;
}

/** Rows as a Markdown table, ready for BENCHMARKS.md. */
export function benchTable(rows: BenchRow[]): string {
  const header = '| Preset | Ratio | Cells | rAF fps | Frame ms (mean / p95) | Slowest phase |\n| --- | --- | --- | --- | --- | --- |';
  const lines = rows.map(
    (r) => `| ${r.preset} | ${r.pixelRatio} | ${r.cells} | ${r.fps} | ${r.frameMs} / ${r.frameP95} | ${r.slowest} ${r.slowestMs} |`,
  );
  return [header, ...lines].join('\n');
}
