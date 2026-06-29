import type { SourceFitMode } from './Source';
import { PixelSourceBase } from './PixelSourceBase';

export interface CanvasSourceOptions {
  fitMode?: SourceFitMode;
}

export class CanvasSource extends PixelSourceBase {
  private sourceCanvas: HTMLCanvasElement | null = null;

  constructor(id = 'canvas', name = 'Canvas Source') {
    super(id, name, 'canvas');
  }

  async load(input: unknown): Promise<void> {
    this.error = null;
    this.ready = false;

    if (input instanceof HTMLCanvasElement) {
      this.sourceCanvas = input;
      this.ready = true;
      return;
    }

    if (input && typeof input === 'object' && 'canvas' in input) {
      const canvas = (input as { canvas: HTMLCanvasElement }).canvas;
      if (canvas instanceof HTMLCanvasElement) {
        this.sourceCanvas = canvas;
        if ('fitMode' in input) {
          this.fitMode = (input as CanvasSourceOptions).fitMode ?? this.fitMode;
        }
        this.ready = true;
        return;
      }
    }

    this.error = 'CanvasSource: expected HTMLCanvasElement';
  }

  setCanvas(canvas: HTMLCanvasElement): void {
    this.sourceCanvas = canvas;
    this.ready = true;
    this.error = null;
  }

  destroy(): void {
    this.sourceCanvas = null;
    super.destroy();
  }

  protected refreshCapture(): void {
    if (!this.sourceCanvas || !this.ready) return;
    const w = this.sourceCanvas.width;
    const h = this.sourceCanvas.height;
    if (w <= 0 || h <= 0) return;

    const ctx = this.ensureCaptureCanvas(w, h);
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(this.sourceCanvas, 0, 0, w, h);
    this.cachedImageData = ctx.getImageData(0, 0, w, h);
  }
}
