import type { MemorySnapshot } from './PerformanceTypes';
import type { ObjectPool } from './ObjectPool';

export interface MemoryProfilerInput {
  gridCellCount: number;
  particleCount: number;
  glyphAtlasEntries: number;
  simulationMemoryBytes: number;
  pools: ObjectPool<unknown>[];
}

export class MemoryProfiler {
  private lastSnapshot: MemorySnapshot = {
    estimatedBytes: 0,
    gridCells: 0,
    particles: 0,
    glyphAtlasEntries: 0,
    poolAvailable: 0,
    poolInUse: 0,
  };

  sample(input: MemoryProfilerInput): MemorySnapshot {
    let poolAvailable = 0;
    let poolInUse = 0;
    for (const pool of input.pools) {
      const stats = pool.getStats();
      poolAvailable += stats.available;
      poolInUse += stats.inUse;
    }

    const gridBytes = input.gridCellCount * 128;
    const particleBytes = input.particleCount * 64;
    const atlasBytes = input.glyphAtlasEntries * 48;

    this.lastSnapshot = {
      estimatedBytes: gridBytes + particleBytes + atlasBytes + input.simulationMemoryBytes,
      gridCells: input.gridCellCount,
      particles: input.particleCount,
      glyphAtlasEntries: input.glyphAtlasEntries,
      poolAvailable,
      poolInUse,
    };

    return this.lastSnapshot;
  }

  getLastSnapshot(): MemorySnapshot {
    return { ...this.lastSnapshot };
  }

  /** Browser heap when available (Chrome performance.memory). */
  getHeapUsedBytes(): number | null {
    const perf = performance as Performance & {
      memory?: { usedJSHeapSize: number };
    };
    return perf.memory?.usedJSHeapSize ?? null;
  }
}
