import type {
  GridCell,
  GridDimensions,
  GridState,
  RendererOptions,
} from '../core/types';
import { Trails } from '../effects/Trails';

export class CanvasAsciiRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private density: number;
  private glyphSet: string[];
  private fontFamily: string;
  private color: string;
  private backgroundColor: string;
  private cells: GridCell[] = [];
  private cols = 0;
  private rows = 0;
  private cellWidth = 10;
  private cellHeight = 16;
  private trailsEffect = new Trails();

  constructor(options: RendererOptions) {
    this.canvas = options.canvas;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) {
      throw new Error('CanvasAsciiRenderer: unable to acquire 2D context');
    }
    this.ctx = ctx;
    this.width = options.width;
    this.height = options.height;
    this.density = options.density;
    this.glyphSet = options.glyphSet;
    this.fontFamily = options.fontFamily ?? 'monospace';
    this.color = options.color ?? '#00ff88';
    this.backgroundColor = options.backgroundColor ?? '#000000';

    this.applyCanvasSize();
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

  setColor(color: string): void {
    this.color = color;
  }

  setBackgroundColor(backgroundColor: string): void {
    this.backgroundColor = backgroundColor;
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.applyCanvasSize();
    this.rebuildGrid();
  }

  clear(trailAmount = 0): void {
    if (trailAmount > 0) {
      this.trailsEffect.applyFade(this.ctx, trailAmount);
    } else {
      this.ctx.fillStyle = this.backgroundColor;
      this.ctx.fillRect(0, 0, this.width, this.height);
    }
  }

  render(trailAmount = 0): void {
    this.clear(trailAmount);

    this.ctx.textBaseline = 'top';
    this.ctx.font = `${this.cellHeight}px ${this.fontFamily}`;

    for (const cell of this.cells) {
      const brightness = Math.min(1, cell.brightness + cell.burst);
      const alpha = 0.2 + brightness * 0.8;
      this.ctx.fillStyle = this.withAlpha(this.color, alpha);

      const px = cell.x * this.cellWidth;
      const py = cell.y * this.cellHeight;
      this.ctx.fillText(cell.char, px, py);
    }
  }

  destroy(): void {
    this.cells = [];
    this.ctx.clearRect(0, 0, this.width, this.height);
  }

  private applyCanvasSize(): void {
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
  }

  private rebuildGrid(): void {
    const targetCols = Math.max(8, Math.floor(this.width / (12 / this.density)));
    this.cellWidth = this.width / targetCols;
    this.cellHeight = this.cellWidth * 1.6;
    this.cols = targetCols;
    this.rows = Math.max(4, Math.floor(this.height / this.cellHeight));

    this.cells = [];
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const phase = (x * 17 + y * 31) % this.glyphSet.length;
        const baseChar = this.pickGlyph(phase);
        this.cells.push({
          char: baseChar,
          baseChar,
          x,
          y,
          phase,
          brightness: 0.5,
          burst: 0,
        });
      }
    }
  }

  private pickGlyph(phase: number): string {
    return this.glyphSet[Math.abs(phase) % this.glyphSet.length];
  }

  private withAlpha(color: string, alpha: number): string {
    if (color.startsWith('#') && color.length === 7) {
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    return color;
  }
}
