import type { AsciiEngine } from '../core/AsciiEngine';
import type { GridDimensions, GridState } from '../core/types';
import { Trails } from '../effects/Trails';
import { GridBuffer } from './GridBuffer';
import type { RenderContext, RenderFrame, Renderer } from './Renderer';
import { clearCanvas, drawGridToCanvas } from './canvasDrawing';
import { resolvePixelRatio, type PixelRatioOption } from './pixelRatio';

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
  pixelRatio?: PixelRatioOption;
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
  private pixelRatio: number;

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
    this.pixelRatio = resolvePixelRatio(options.pixelRatio);

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

  setPixelRatio(ratio: number): void {
    const next = resolvePixelRatio(ratio);
    if (next === this.pixelRatio) return;
    this.pixelRatio = next;
    this.initDrawingSurface();
    this.applyDisplayCanvasSize();
  }

  getPixelRatio(): number {
    return this.pixelRatio;
  }

  render(frame: RenderFrame, _context: RenderContext): void {
    const drawCtx = this.getDrawContext();
    // The display context is shared with the canvas renderer; own its transform for this frame.
    const r = this.usingOffscreen ? 1 : this.pixelRatio;
    this.displayCtx.setTransform(r, 0, 0, r, 0, 0);
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
      // Both surfaces are in device pixels; the display context is at identity.
      this.displayCtx.clearRect(0, 0, this.displayCanvas.width, this.displayCanvas.height);
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

    const r = this.pixelRatio;
    if (isOffscreenCanvasSupported()) {
      this.offscreen = new OffscreenCanvas(Math.round(width * r), Math.round(height * r));
      this.offscreenCtx = this.offscreen.getContext('2d');
      if (this.offscreenCtx) {
        this.offscreenCtx.setTransform(r, 0, 0, r, 0, 0);
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
    const r = this.pixelRatio;
    this.displayCanvas.width = Math.round(width * r);
    this.displayCanvas.height = Math.round(height * r);
    this.displayCanvas.style.width = `${width}px`;
    this.displayCanvas.style.height = `${height}px`;
    // Drawing straight to the display (no OffscreenCanvas) happens in CSS pixels.
    this.displayCtx.setTransform(this.usingOffscreen ? 1 : r, 0, 0, this.usingOffscreen ? 1 : r, 0, 0);
  }
}
