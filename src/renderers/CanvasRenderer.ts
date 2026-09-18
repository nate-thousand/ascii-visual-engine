import type { AsciiEngine } from '../core/AsciiEngine';
import type { GridDimensions, GridState } from '../core/types';
import { Trails } from '../effects/Trails';
import { GridBuffer } from './GridBuffer';
import type { RenderContext, RenderFrame, Renderer } from './Renderer';
import { clearCanvas, drawGridToCanvas } from './canvasDrawing';
import { resolvePixelRatio, type PixelRatioOption } from './pixelRatio';

export interface CanvasRendererOptions {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  density: number;
  glyphSet: string[];
  fontFamily?: string;
  color?: string;
  backgroundColor?: string;
  /** Backing store scale. `auto` follows devicePixelRatio, capped at 2. */
  pixelRatio?: PixelRatioOption;
}

export class CanvasRenderer implements Renderer {
  readonly id = 'canvas' as const;
  readonly name = 'Canvas 2D';
  readonly type = 'canvas' as const;

  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private grid: GridBuffer;
  private fontFamily: string;
  private color: string;
  private backgroundColor: string;
  private trailsEffect = new Trails();
  private pixelRatio: number;

  constructor(options: CanvasRendererOptions) {
    this.canvas = options.canvas;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) {
      throw new Error('CanvasRenderer: unable to acquire 2D context');
    }
    this.ctx = ctx;
    this.fontFamily = options.fontFamily ?? 'monospace';
    this.color = options.color ?? '#00ff88';
    this.backgroundColor = options.backgroundColor ?? '#000000';
    this.pixelRatio = resolvePixelRatio(options.pixelRatio);

    this.grid = new GridBuffer({
      width: options.width,
      height: options.height,
      density: options.density,
      glyphSet: options.glyphSet,
    });

    this.applyCanvasSize();
  }

  initialize(_engine: AsciiEngine): void {}

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  getGridState(time: number): GridState {
    return this.grid.getGridState(time);
  }

  getDimensions(): GridDimensions {
    return this.grid.getDimensions();
  }

  setDensity(density: number): void {
    this.grid.setDensity(density);
  }

  setGlyphSet(glyphSet: string[]): void {
    this.grid.setGlyphSet(glyphSet);
  }

  importGridState(state: GridState): void {
    this.grid.importGridState(state);
  }

  setColor(color: string): void {
    this.color = color;
  }

  setBackgroundColor(backgroundColor: string): void {
    this.backgroundColor = backgroundColor;
  }

  resize(width: number, height: number): void {
    this.grid.resize(width, height);
    this.applyCanvasSize();
  }

  setPixelRatio(ratio: number): void {
    const next = resolvePixelRatio(ratio);
    if (next === this.pixelRatio) return;
    this.pixelRatio = next;
    this.applyCanvasSize();
  }

  getPixelRatio(): number {
    return this.pixelRatio;
  }

  render(frame: RenderFrame, context: RenderContext): void {
    const start = performance.now();
    // The canvas and its context are shared with the offscreen renderer, which
    // may have left the transform at identity; own it for this frame.
    this.ctx.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
    const { cols, rows, cellWidth, cellHeight } = this.grid.getDimensions();
    const gridState = this.grid.getGridState(frame.time);
    const cells = gridState.cells;

    context.dirtyTracker?.trackChanges(cells);

    clearCanvas(
      this.ctx,
      this.grid.getWidth(),
      this.grid.getHeight(),
      frame.trailAmount,
      this.backgroundColor,
      this.trailsEffect,
      context.dirtyTracker,
      cellWidth,
      cellHeight,
    );

    const font = `${cellHeight}px ${this.fontFamily}`;
    if (context.glyphCache && cells.length > 0) {
      const unique = new Set<string>();
      for (let i = 0; i < Math.min(cells.length, 256); i++) unique.add(cells[i].char);
      context.glyphCache.prewarm(this.ctx, [...unique], font);
    }

    const result = drawGridToCanvas(this.ctx, cells, cellWidth, cellHeight, {
      fontFamily: this.fontFamily,
      color: this.color,
      glyphCache: context.glyphCache,
      dirtyTracker: context.dirtyTracker,
      dirtyRendering: context.dirtyRendering && frame.trailAmount === 0,
    });

    const renderTimeMs = performance.now() - start;
    context.onRenderComplete?.({
      cellCount: cols * rows,
      glyphCount: result.glyphCount,
      drawCalls: result.drawCalls,
      dirtyCells: result.dirtyCells,
      renderTimeMs,
      partialUpdate: result.partialUpdate,
    });
  }

  destroy(): void {
    this.grid.clear();
    this.ctx.clearRect(0, 0, this.grid.getWidth(), this.grid.getHeight());
  }

  isAvailable(): boolean {
    return Boolean(this.ctx);
  }

  supportsLiveSwitch(): boolean {
    return true;
  }

  getSwitchWarning(): string | null {
    return null;
  }

  /**
   * The grid and every draw call live in CSS pixels; the backing store is
   * scaled by the pixel ratio so glyphs are crisp on HiDPI screens.
   */
  private applyCanvasSize(): void {
    const width = this.grid.getWidth();
    const height = this.grid.getHeight();
    const r = this.pixelRatio;
    this.canvas.width = Math.round(width * r);
    this.canvas.height = Math.round(height * r);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    // Setting width or height reset the transform.
    this.ctx.setTransform(r, 0, 0, r, 0, 0);
  }
}

/** @deprecated Use CanvasRenderer */
export class CanvasAsciiRenderer extends CanvasRenderer {}
