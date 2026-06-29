export interface PoolStats {
  available: number;
  inUse: number;
  totalCreated: number;
}

export class ObjectPool<T> {
  private pool: T[] = [];
  private inUse = 0;
  private totalCreated = 0;

  constructor(
    private factory: () => T,
    private reset?: (item: T) => void,
    initialSize = 32,
  ) {
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(factory());
      this.totalCreated++;
    }
  }

  acquire(): T {
    this.inUse++;
    if (this.pool.length > 0) {
      return this.pool.pop()!;
    }
    this.totalCreated++;
    return this.factory();
  }

  release(item: T): void {
    if (this.reset) this.reset(item);
    this.pool.push(item);
    this.inUse = Math.max(0, this.inUse - 1);
  }

  releaseAll(items: T[]): void {
    for (const item of items) this.release(item);
  }

  getStats(): PoolStats {
    return {
      available: this.pool.length,
      inUse: this.inUse,
      totalCreated: this.totalCreated,
    };
  }

  clear(): void {
    this.pool.length = 0;
    this.inUse = 0;
  }
}

import type { GridCell } from '../core/types';

export function createDefaultGridCell(): GridCell {
  return {
    char: '.',
    baseChar: '.',
    x: 0,
    y: 0,
    phase: 0,
    brightness: 0.5,
    burst: 0,
    ox: 0,
    oy: 0,
    vx: 0,
    vy: 0,
    scale: 1,
    rotation: 0,
    deformation: 0,
  };
}

export function resetGridCell(cell: GridCell): void {
  cell.brightness = 0.5;
  cell.burst = 0;
  cell.ox = 0;
  cell.oy = 0;
  cell.vx = 0;
  cell.vy = 0;
  cell.scale = 1;
  cell.rotation = 0;
  cell.deformation = 0;
}

export const gridCellPool = new ObjectPool(createDefaultGridCell, resetGridCell, 256);

export interface PooledEventPayload {
  type: string;
  data?: unknown;
}

export const eventPayloadPool = new ObjectPool<PooledEventPayload>(
  () => ({ type: '' }),
  (p) => {
    p.type = '';
    p.data = undefined;
  },
  16,
);

export function createPool<T>(factory: () => T, initialSize = 32): {
  acquire: () => T;
  release: (item: T) => void;
  count: () => number;
} {
  const pool = new ObjectPool(factory, undefined, initialSize);
  return {
    acquire: () => pool.acquire(),
    release: (item) => pool.release(item),
    count: () => pool.getStats().available,
  };
}
