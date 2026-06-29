import type { GridCell } from '../core/types';

export interface DirtyRegion {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export class DirtyRegionTracker {
  private dirtyIndices = new Set<number>();
  private prevSnapshot: Array<{ char: string; brightness: number; burst: number }> = [];
  private enabled = true;
  private fullRedraw = true;

  setEnabled(value: boolean): void {
    this.enabled = value;
    if (!value) this.dirtyIndices.clear();
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  markAllDirty(): void {
    this.fullRedraw = true;
  }

  markIndex(index: number): void {
    if (!this.enabled) return;
    this.dirtyIndices.add(index);
  }

  markRegion(cols: number, minX: number, minY: number, maxX: number, maxY: number): void {
    if (!this.enabled) return;
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        if (x >= 0 && y >= 0) this.dirtyIndices.add(y * cols + x);
      }
    }
  }

  /** Compare current cells to previous frame; populate dirty set. */
  trackChanges(cells: GridCell[]): void {
    if (!this.enabled) {
      this.dirtyIndices.clear();
      return;
    }

    if (this.fullRedraw || this.prevSnapshot.length !== cells.length) {
      this.fullRedraw = false;
      this.dirtyIndices.clear();
      for (let i = 0; i < cells.length; i++) this.dirtyIndices.add(i);
      this.updateSnapshot(cells);
      return;
    }

    this.dirtyIndices.clear();
    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      const prev = this.prevSnapshot[i];
      if (
        cell.char !== prev.char ||
        Math.abs(cell.brightness - prev.brightness) > 0.01 ||
        Math.abs(cell.burst - prev.burst) > 0.01 ||
        cell.ox !== 0 ||
        cell.oy !== 0 ||
        cell.rotation !== 0 ||
        cell.scale !== 1
      ) {
        this.dirtyIndices.add(i);
      }
    }
    this.updateSnapshot(cells);
  }

  getDirtyIndices(): ReadonlySet<number> {
    return this.dirtyIndices;
  }

  getDirtyCount(): number {
    return this.dirtyIndices.size;
  }

  shouldFullRedraw(trailAmount: number): boolean {
    return !this.enabled || trailAmount > 0 || this.fullRedraw;
  }

  getBoundingRegion(cols: number, rows: number, cellWidth: number, cellHeight: number): DirtyRegion | null {
    if (this.dirtyIndices.size === 0) return null;
    let minX = cols;
    let minY = rows;
    let maxX = 0;
    let maxY = 0;
    for (const idx of this.dirtyIndices) {
      const x = idx % cols;
      const y = Math.floor(idx / cols);
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
    return {
      minX: minX * cellWidth,
      minY: minY * cellHeight,
      maxX: (maxX + 1) * cellWidth,
      maxY: (maxY + 1) * cellHeight,
    };
  }

  invalidateLayer(_layerId: string): void {
    this.fullRedraw = true;
  }

  private updateSnapshot(cells: GridCell[]): void {
    if (this.prevSnapshot.length !== cells.length) {
      this.prevSnapshot = new Array(cells.length);
      for (let i = 0; i < cells.length; i++) {
        this.prevSnapshot[i] = { char: '', brightness: 0, burst: 0 };
      }
    }
    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      const snap = this.prevSnapshot[i];
      snap.char = cell.char;
      snap.brightness = cell.brightness;
      snap.burst = cell.burst;
    }
  }
}
