import type { AsciiEngine } from '../core/AsciiEngine';
import type {
  Source,
  SourceContext,
  SourceFitMode,
  SourceSample,
  SourceType,
} from './Source';
import { SourceSampler, mapBrightnessToGlyph } from './SourceSampler';

export abstract class PixelSourceBase implements Source {
  readonly id: string;
  readonly name: string;
  readonly type: SourceType;
  protected engine: AsciiEngine | null = null;
  protected fitMode: SourceFitMode = 'fit';
  protected error: string | null = null;
  protected ready = false;
  protected captureCanvas: HTMLCanvasElement | null = null;
  protected captureCtx: CanvasRenderingContext2D | null = null;
  protected cachedImageData: ImageData | null = null;
  protected sampler = new SourceSampler();

  constructor(id: string, name: string, type: SourceType) {
    this.id = id;
    this.name = name;
    this.type = type;
  }

  initialize(engine: AsciiEngine): void {
    this.engine = engine;
  }

  abstract load(input: unknown): Promise<void>;

  update(_deltaTime: number, _context: SourceContext): void {
    this.refreshCapture();
  }

  sample(x: number, y: number, context: SourceContext): SourceSample {
    const data = this.getImageData();
    if (!data) {
      return { brightness: 0, contrast: 0, edge: 0 };
    }
    const nx = x / Math.max(context.cols - 1, 1);
    const ny = y / Math.max(context.rows - 1, 1);
    const contrastAmount = context.getControl('sourceContrast', 1);
    const edgeAmount = context.getControl('sourceEdge', 0.3);
    return this.sampler.sampleFromImageData(
      data,
      nx,
      ny,
      this.fitMode,
      context.cols,
      context.rows,
      contrastAmount,
      edgeAmount,
    );
  }

  destroy(): void {
    this.cachedImageData = null;
    this.captureCanvas = null;
    this.captureCtx = null;
    this.ready = false;
    this.error = null;
    this.engine = null;
  }

  isReady(): boolean {
    return this.ready;
  }

  getError(): string | null {
    return this.error;
  }

  getFitMode(): SourceFitMode {
    return this.fitMode;
  }

  setFitMode(mode: SourceFitMode): void {
    this.fitMode = mode;
  }

  getImageData(): ImageData | null {
    this.refreshCapture();
    return this.cachedImageData;
  }

  protected ensureCaptureCanvas(width: number, height: number): CanvasRenderingContext2D {
    if (!this.captureCanvas) {
      this.captureCanvas = document.createElement('canvas');
    }
    if (this.captureCanvas.width !== width) this.captureCanvas.width = width;
    if (this.captureCanvas.height !== height) this.captureCanvas.height = height;
    if (!this.captureCtx) {
      this.captureCtx = this.captureCanvas.getContext('2d', { willReadFrequently: true });
    }
    if (!this.captureCtx) {
      throw new Error(`${this.name}: unable to create 2D context`);
    }
    return this.captureCtx;
  }

  protected abstract refreshCapture(): void;

  protected mapSampleToChar(sample: SourceSample, glyphSet: string[]): string {
    return mapBrightnessToGlyph(sample.brightness, glyphSet);
  }
}
