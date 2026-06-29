import type { GridCell, GridDimensions, GridState } from '../core/types';
import { gridCellPool, resetGridCell } from '../performance/ObjectPool';

export interface GridBufferOptions {
  width: number;
  height: number;
  density: number;
  glyphSet: string[];
}

export class GridBuffer {
  private cells: GridCell[] = [];
  private cols = 0;
  private rows = 0;
  private cellWidth = 10;
  private cellHeight = 16;
  private width: number;
  private height: number;
  private density: number;
  private glyphSet: string[];

  constructor(options: GridBufferOptions) {
    this.width = options.width;
    this.height = options.height;
    this.density = options.density;
    this.glyphSet = options.glyphSet;
    this.rebuildGrid();
  }

  getGridState(time: number): GridState {
    return {
      cells: this.cells,
      cols: this.cols,
      rows: this.rows,
      time,
      width: this.width,
      height: this.height,
    };
  }

  getDimensions(): GridDimensions {
    return {
      cols: this.cols,
      rows: this.rows,
      cellWidth: this.cellWidth,
      cellHeight: this.cellHeight,
    };
  }

  getWidth(): number {
    return this.width;
  }

  getHeight(): number {
    return this.height;
  }

  getDensity(): number {
    return this.density;
  }

  getGlyphSet(): string[] {
    return this.glyphSet;
  }

  setDensity(density: number): void {
    this.density = density;
    this.rebuildGrid();
  }

  setGlyphSet(glyphSet: string[]): void {
    this.glyphSet = glyphSet;
    for (const cell of this.cells) {
      cell.baseChar = this.pickGlyph(cell.phase);
      cell.char = cell.baseChar;
    }
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.rebuildGrid();
  }

  importGridState(state: GridState): void {
    if (state.cols === this.cols && state.rows === this.rows) {
      for (let i = 0; i < this.cells.length; i++) {
        Object.assign(this.cells[i], state.cells[i]);
      }
      return;
    }
    this.width = state.width;
    this.height = state.height;
    this.rebuildGrid();
    const limit = Math.min(this.cells.length, state.cells.length);
    for (let i = 0; i < limit; i++) {
      Object.assign(this.cells[i], state.cells[i]);
    }
  }

  clear(): void {
    gridCellPool.releaseAll(this.cells);
    this.cells = [];
    this.cols = 0;
    this.rows = 0;
  }

  private rebuildGrid(): void {
    const targetCols = Math.max(8, Math.floor(this.width / (12 / this.density)));
    this.cellWidth = this.width / targetCols;
    this.cellHeight = this.cellWidth * 1.6;
    this.cols = targetCols;
    this.rows = Math.max(4, Math.floor(this.height / this.cellHeight));

    gridCellPool.releaseAll(this.cells);
    this.cells = [];

    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const phase = (x * 17 + y * 31) % this.glyphSet.length;
        const baseChar = this.pickGlyph(phase);
        const cell = gridCellPool.acquire();
        resetGridCell(cell);
        cell.char = baseChar;
        cell.baseChar = baseChar;
        cell.x = x;
        cell.y = y;
        cell.phase = phase;
        this.cells.push(cell);
      }
    }
  }

  private pickGlyph(phase: number): string {
    return this.glyphSet[Math.abs(phase) % this.glyphSet.length];
  }
}
