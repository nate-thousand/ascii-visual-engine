import type { AsciiEngine } from '../core/AsciiEngine';
import type { GridDimensions, GridState } from '../core/types';
import { Trails } from '../effects/Trails';
import { GridBuffer } from './GridBuffer';
import type { RenderContext, RenderFrame, Renderer } from './Renderer';
import { clearCanvas, drawGridToCanvas } from './canvasDrawing';

export function isOffscreenCanvasSupported(): boolean {
  return typeof OffscreenCanvas !== 'undefined';
}

export interface OffscreenCanvasRendererOptions {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  density: number;
  glyphSet: string[];
  fontFamily?: string;
  color?: string;
  backgroundColor?: string;
}

export class OffscreenCanvasRenderer implements Renderer {
  readonly id = 'offscreen-canvas' as const;
  readonly name = 'Offscreen Canvas';
  readonly type = 'offscreen-canvas' as const;

  private displayCanvas: HTMLCanvasElement;
  private displayCtx: CanvasRenderingContext2D;
  private offscreen: OffscreenCanvas | null = null;
  private offscreenCtx: OffscreenCanvasRenderingContext2D | null = null;
  private fallbackCtx: CanvasRenderingContext2D | null = null;
  private usingOffscreen = false;
  private grid: GridBuffer;
  private fontFamily: string;
  private color: string;
  private backgroundColor: string;
  private trailsEffect = new Trails();

  constructor(options: OffscreenCanvasRendererOptions) {
    this.displayCanvas = options.canvas;
    const displayCtx = this.displayCanvas.getContext('2d');
    if (!displayCtx) {
      throw new Error('OffscreenCanvasRenderer: unable to acquire display 2D context');
    }
    this.displayCtx = displayCtx;

    this.fontFamily = options.fontFamily ?? 'monospace';
    this.color = options.color ?? '#00ff88';
    this.backgroundColor = options.backgroundColor ?? '#000000';

    this.grid = new GridBuffer({
      width: options.width,
      height: options.height,
      density: options.density,
      glyphSet: options.glyphSet,
    });

    this.initDrawingSurface();
    this.applyDisplayCanvasSize();
  }

  initialize(_engine: AsciiEngine): void {}

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

  resize(width: number, height: number): void {
    this.grid.resize(width, height);
    this.initDrawingSurface();
    this.applyDisplayCanvasSize();
  }

  render(frame: RenderFrame, _context: RenderContext): void {
    const drawCtx = this.getDrawContext();
    const { cellWidth, cellHeight } = this.grid.getDimensions();
    const width = this.grid.getWidth();
    const height = this.grid.getHeight();

    clearCanvas(
      drawCtx,
      width,
      height,
      frame.trailAmount,
      this.backgroundColor,
      this.trailsEffect,
    );

    drawGridToCanvas(drawCtx, this.grid.getGridState(frame.time).cells, cellWidth, cellHeight, {
      fontFamily: this.fontFamily,
      color: this.color,
    });

    if (this.usingOffscreen && this.offscreen) {
      this.displayCtx.clearRect(0, 0, width, height);
      this.displayCtx.drawImage(this.offscreen, 0, 0);
    }
  }

  destroy(): void {
    this.grid.clear();
    this.offscreen = null;
    this.offscreenCtx = null;
    this.fallbackCtx = null;
    this.displayCtx.clearRect(0, 0, this.grid.getWidth(), this.grid.getHeight());
  }

  isAvailable(): boolean {
    return Boolean(this.displayCtx);
  }

  isUsingOffscreen(): boolean {
    return this.usingOffscreen;
  }

  supportsLiveSwitch(): boolean {
    return true;
  }

  getSwitchWarning(): string | null {
    if (!isOffscreenCanvasSupported()) {
      return 'OffscreenCanvas is unavailable — falling back to standard Canvas 2D drawing.';
    }
    return null;
  }

  private initDrawingSurface(): void {
    const width = this.grid.getWidth();
    const height = this.grid.getHeight();

    if (isOffscreenCanvasSupported()) {
      this.offscreen = new OffscreenCanvas(width, height);
      this.offscreenCtx = this.offscreen.getContext('2d');
      if (this.offscreenCtx) {
        this.usingOffscreen = true;
        this.fallbackCtx = null;
        return;
      }
    }

    this.usingOffscreen = false;
    this.offscreen = null;
    this.offscreenCtx = null;
    this.fallbackCtx = this.displayCtx;
  }

  private getDrawContext(): CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D {
    if (this.usingOffscreen && this.offscreenCtx) {
      return this.offscreenCtx;
    }
    if (this.fallbackCtx) {
      return this.fallbackCtx;
    }
    return this.displayCtx;
  }

  private applyDisplayCanvasSize(): void {
    const width = this.grid.getWidth();
    const height = this.grid.getHeight();
    this.displayCanvas.width = width;
    this.displayCanvas.height = height;
    this.displayCanvas.style.width = `${width}px`;
    this.displayCanvas.style.height = `${height}px`;
  }
}
