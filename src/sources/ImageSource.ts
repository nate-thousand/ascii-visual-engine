import type { SourceFitMode } from './Source';
import { PixelSourceBase } from './PixelSourceBase';

export interface ImageSourceOptions {
  fitMode?: SourceFitMode;
}

export class ImageSource extends PixelSourceBase {
  private image: HTMLImageElement | null = null;

  constructor(id = 'image', name = 'Image Source') {
    super(id, name, 'image');
  }

  async load(input: unknown): Promise<void> {
    this.error = null;
    this.ready = false;
    this.cachedImageData = null;

    if (typeof document === 'undefined') {
      this.error = 'ImageSource requires a browser environment';
      return;
    }

    let src: string | null = null;
    if (typeof input === 'string') {
      src = input;
    } else if (input instanceof File) {
      src = URL.createObjectURL(input);
    } else if (input instanceof HTMLImageElement) {
      this.image = input;
      this.ready = true;
      return;
    } else if (input && typeof input === 'object' && 'src' in input) {
      src = String((input as { src: string }).src);
      if ('fitMode' in input) {
        this.fitMode = (input as ImageSourceOptions).fitMode ?? this.fitMode;
      }
    }

    if (!src) {
      this.error = 'ImageSource: invalid input';
      return;
    }

    await new Promise<void>((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        this.image = img;
        this.ready = true;
        this.error = null;
        resolve();
      };
      img.onerror = () => {
        this.error = 'ImageSource: failed to load image';
        this.ready = false;
        resolve();
      };
      img.src = src!;
    });
  }

  destroy(): void {
    this.image = null;
    super.destroy();
  }

  protected refreshCapture(): void {
    if (!this.image || !this.ready) return;
    const w = this.image.naturalWidth || this.image.width;
    const h = this.image.naturalHeight || this.image.height;
    if (w <= 0 || h <= 0) return;

    const ctx = this.ensureCaptureCanvas(w, h);
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(this.image, 0, 0, w, h);
    this.cachedImageData = ctx.getImageData(0, 0, w, h);
  }
}
