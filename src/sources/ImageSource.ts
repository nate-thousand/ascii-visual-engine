import type { SourceFitMode } from './Source';
import { PixelSourceBase } from './PixelSourceBase';

export interface ImageSourceOptions {
  fitMode?: SourceFitMode;
  /** Image URL or data URL. */
  src?: string;
  /** Inline SVG markup, rasterized at `svgSize`. */
  svg?: string;
  /** Longest side in pixels for rasterized SVG. Default 1024. */
  svgSize?: number;
}

const DEFAULT_SVG_SIZE = 1024;

/** True for `<svg ...>` markup, with or without an XML prolog. */
export function isSvgMarkup(value: string): boolean {
  return /^\s*(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*<svg[\s>]/i.test(value);
}

/**
 * Give SVG markup explicit pixel dimensions so the browser rasterizes it at
 * a known size. An SVG with no `width`/`height` has `naturalWidth` 0 and
 * draws nothing; one sized in the file is scaled so its longest side is
 * `longest` pixels, which keeps thin strokes legible when the grid samples
 * it. Returns the markup unchanged when it cannot be parsed.
 */
export function sizeSvgMarkup(markup: string, longest = DEFAULT_SVG_SIZE): string {
  if (typeof DOMParser === 'undefined') return markup;
  const doc = new DOMParser().parseFromString(markup, 'image/svg+xml');
  const svg = doc.documentElement;
  if (!svg || svg.tagName.toLowerCase() !== 'svg' || doc.querySelector('parsererror')) return markup;

  let w = parseFloat(svg.getAttribute('width') ?? '');
  let h = parseFloat(svg.getAttribute('height') ?? '');
  const viewBox = (svg.getAttribute('viewBox') ?? '').trim().split(/[\s,]+/).map(Number);
  const hasViewBox = viewBox.length === 4 && viewBox.every((n) => Number.isFinite(n)) && viewBox[2] > 0 && viewBox[3] > 0;
  if (!(w > 0 && h > 0)) {
    if (hasViewBox) {
      w = viewBox[2];
      h = viewBox[3];
    } else {
      w = h = longest;
    }
  }
  if (!hasViewBox) svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  const scale = longest / Math.max(w, h);
  svg.setAttribute('width', String(Math.round(w * scale)));
  svg.setAttribute('height', String(Math.round(h * scale)));
  return new XMLSerializer().serializeToString(svg);
}

/**
 * Still images, including SVG logos. Accepts a URL, a data URL, a `File`,
 * an `HTMLImageElement`, `{ src }`, or `{ svg }` with inline markup. SVG
 * input (by extension, MIME type, or markup) is read as text and sized
 * before rasterizing, so files without dimensions still draw. Pixels are
 * read once per load, not per frame.
 */
export class ImageSource extends PixelSourceBase {
  private image: HTMLImageElement | null = null;
  private objectUrl: string | null = null;

  constructor(id = 'image', name = 'Image Source') {
    super(id, name, 'image');
  }

  async load(input: unknown): Promise<void> {
    this.error = null;
    this.ready = false;
    this.cachedImageData = null;
    this.releaseObjectUrl();

    if (typeof document === 'undefined') {
      this.error = 'ImageSource requires a browser environment';
      return;
    }

    let svgSize = DEFAULT_SVG_SIZE;
    let src: string | null = null;
    let svgMarkup: string | null = null;

    if (typeof input === 'string') {
      if (isSvgMarkup(input)) svgMarkup = input;
      else src = input;
    } else if (typeof File !== 'undefined' && input instanceof File) {
      if (input.type === 'image/svg+xml' || /\.svg$/i.test(input.name)) svgMarkup = await input.text();
      else src = this.objectUrl = URL.createObjectURL(input);
    } else if (typeof HTMLImageElement !== 'undefined' && input instanceof HTMLImageElement) {
      this.image = input;
      this.ready = true;
      return;
    } else if (input && typeof input === 'object') {
      const options = input as ImageSourceOptions;
      if (options.fitMode) this.fitMode = options.fitMode;
      if (options.svgSize && options.svgSize > 0) svgSize = options.svgSize;
      if (typeof options.svg === 'string') svgMarkup = options.svg;
      else if (typeof options.src === 'string') src = options.src;
    }

    if (src && !svgMarkup && /\.svg(\?.*)?$/i.test(src)) {
      // Read the text so the markup can be sized; a fetch failure falls
      // back to loading the URL as is.
      try {
        const response = await fetch(src);
        if (response.ok) svgMarkup = await response.text();
      } catch {
        // Load the URL directly below.
      }
    }

    if (svgMarkup) {
      const blob = new Blob([sizeSvgMarkup(svgMarkup, svgSize)], { type: 'image/svg+xml' });
      src = this.objectUrl = URL.createObjectURL(blob);
    }

    if (!src) {
      this.error = 'ImageSource: invalid input';
      return;
    }

    await new Promise<void>((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        if ((img.naturalWidth || img.width) <= 0 || (img.naturalHeight || img.height) <= 0) {
          this.error = 'ImageSource: image has no size (an SVG without width, height, or viewBox)';
          this.ready = false;
        } else {
          this.image = img;
          this.ready = true;
          this.error = null;
        }
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
    this.releaseObjectUrl();
    super.destroy();
  }

  protected refreshCapture(): void {
    if (!this.image || !this.ready || this.cachedImageData) return;
    const w = this.image.naturalWidth || this.image.width;
    const h = this.image.naturalHeight || this.image.height;
    if (w <= 0 || h <= 0) return;

    const ctx = this.ensureCaptureCanvas(w, h);
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(this.image, 0, 0, w, h);
    try {
      this.cachedImageData = ctx.getImageData(0, 0, w, h);
    } catch {
      this.error = 'ImageSource: the image is cross origin and cannot be read; serve it with CORS headers';
      this.ready = false;
    }
  }

  private releaseObjectUrl(): void {
    if (this.objectUrl && typeof URL !== 'undefined') {
      URL.revokeObjectURL(this.objectUrl);
    }
    this.objectUrl = null;
  }
}
