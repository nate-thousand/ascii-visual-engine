import type { SourceContext, SourceFitMode } from './Source';
import { PixelSourceBase } from './PixelSourceBase';

export interface TextSourceOptions {
  /** The type to set. Newlines break lines. */
  text: string;
  /** CSS font family. Default `sans-serif`. */
  font?: string;
  /** CSS font weight. Default 700. */
  weight?: number | string;
  /** Pixel size, or `fit` (default) for the largest size that fits the target inside `padding`. */
  size?: number | 'fit';
  align?: 'left' | 'center' | 'right';
  /** Line height as a multiple of the size. Default 1.1. */
  lineHeight?: number;
  /** Extra space between glyphs as a fraction of the size. Default 0. */
  letterSpacing?: number;
  /** Margin on every side as a fraction of the shorter target side. Default 0.08. */
  padding?: number;
  fitMode?: SourceFitMode;
}

export interface TextLayoutLine {
  text: string;
  x: number;
  /** Baseline y. */
  y: number;
  width: number;
}

export interface TextLayout {
  size: number;
  font: string;
  lines: TextLayoutLine[];
  width: number;
  height: number;
}

const DEFAULTS: Required<Omit<TextSourceOptions, 'text' | 'fitMode' | 'size'>> & { size: number | 'fit' } = {
  font: 'sans-serif',
  weight: 700,
  size: 'fit',
  align: 'center',
  lineHeight: 1.1,
  letterSpacing: 0,
  padding: 0.08,
};

function fontString(size: number, options: { font: string; weight: number | string }): string {
  return `${options.weight} ${size}px ${options.font}`;
}

/**
 * Place lines of text inside a box. `measure(text, font)` returns the
 * advance width for that font; the canvas supplies it in the browser, tests
 * supply their own. Pure, so it is testable without a canvas.
 */
export function layoutText(
  options: TextSourceOptions,
  width: number,
  height: number,
  measure: (text: string, font: string) => number,
): TextLayout {
  const o = { ...DEFAULTS, ...options };
  const lines = o.text.split(/\r?\n/);
  const pad = Math.min(width, height) * o.padding;
  const availW = Math.max(1, width - pad * 2);
  const availH = Math.max(1, height - pad * 2);
  const spacingOf = (size: number, text: string) => Math.max(0, text.length - 1) * size * o.letterSpacing;

  let size: number;
  if (o.size === 'fit') {
    // Measure at a reference size; widths scale linearly with the size.
    const ref = 100;
    const refFont = fontString(ref, o);
    let widest = 1;
    for (const line of lines) {
      const w = measure(line, refFont) + spacingOf(ref, line);
      if (w > widest) widest = w;
    }
    const byWidth = (ref * availW) / widest;
    const byHeight = availH / (lines.length * o.lineHeight);
    size = Math.max(1, Math.floor(Math.min(byWidth, byHeight) + 1e-6));
  } else {
    size = Math.max(1, o.size);
  }

  const font = fontString(size, o);
  const lineHeight = size * o.lineHeight;
  const blockHeight = lines.length * lineHeight;
  const top = pad + (availH - blockHeight) / 2;
  const laid: TextLayoutLine[] = lines.map((text, i) => {
    const w = measure(text, font) + spacingOf(size, text);
    const x = o.align === 'left' ? pad : o.align === 'right' ? width - pad - w : (width - w) / 2;
    // Baseline sits at about 80% of the line box for typical Latin faces.
    const y = top + i * lineHeight + lineHeight * 0.8;
    return { text, x, y, width: w };
  });
  return { size, font, lines: laid, width, height };
}

/**
 * Type as a source: rasterizes a string with the canvas text API at the
 * grid's own aspect ratio and feeds the pixels through the same sampler as
 * images. White on transparent, so the brightness ramp reads it as light
 * type on a dark ground, `sourceInvert` flips it, and `sourceMask` makes the
 * letters a window onto the procedural look. `setText()` and `setOptions()`
 * change it live.
 */
export class TextSource extends PixelSourceBase {
  private options: TextSourceOptions | null = null;
  private targetW = 800;
  private targetH = 450;
  private dirty = true;
  private lastLayout: TextLayout | null = null;

  constructor(id = 'text', name = 'Text Source') {
    super(id, name, 'text');
  }

  async load(input: unknown): Promise<void> {
    this.error = null;
    this.ready = false;
    this.cachedImageData = null;
    const options: TextSourceOptions | null =
      typeof input === 'string'
        ? { text: input }
        : input && typeof input === 'object' && typeof (input as TextSourceOptions).text === 'string'
          ? { ...(input as TextSourceOptions) }
          : null;
    if (!options) {
      this.error = 'TextSource: pass a string or { text, font?, weight?, size?, align?, ... }';
      return;
    }
    if (typeof document === 'undefined') {
      this.error = 'TextSource requires a browser environment';
      return;
    }
    if (options.fitMode) this.fitMode = options.fitMode;
    this.options = options;
    this.dirty = true;
    this.ready = true;
  }

  setText(text: string): void {
    if (!this.options) {
      void this.load({ text });
      return;
    }
    this.options = { ...this.options, text };
    this.dirty = true;
  }

  setOptions(options: Partial<TextSourceOptions>): void {
    if (!this.options) {
      if (typeof options.text === 'string') void this.load(options as TextSourceOptions);
      return;
    }
    this.options = { ...this.options, ...options };
    if (options.fitMode) this.fitMode = options.fitMode;
    this.dirty = true;
  }

  getOptions(): TextSourceOptions | null {
    return this.options ? { ...this.options } : null;
  }

  /** The layout of the last raster, for hosts that want to overlay or debug. */
  getLayout(): TextLayout | null {
    return this.lastLayout;
  }

  update(_deltaTime: number, context: SourceContext): void {
    // Raster at the grid's aspect so every fit mode lands the same way.
    const w = Math.max(1, Math.round(context.grid.width || this.targetW));
    const h = Math.max(1, Math.round(context.grid.height || this.targetH));
    if (w !== this.targetW || h !== this.targetH) {
      this.targetW = w;
      this.targetH = h;
      this.dirty = true;
    }
    this.refreshCapture();
  }

  destroy(): void {
    this.options = null;
    this.lastLayout = null;
    super.destroy();
  }

  protected refreshCapture(): void {
    if (!this.options || !this.ready || !this.dirty) return;
    const ctx = this.ensureCaptureCanvas(this.targetW, this.targetH);
    const measure = (text: string, font: string) => {
      ctx.font = font;
      return ctx.measureText(text).width;
    };
    const layout = layoutText(this.options, this.targetW, this.targetH, measure);
    const o = { ...DEFAULTS, ...this.options };

    ctx.clearRect(0, 0, this.targetW, this.targetH);
    ctx.font = layout.font;
    ctx.fillStyle = '#ffffff';
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    const spacing = layout.size * o.letterSpacing;
    for (const line of layout.lines) {
      if (spacing > 0) {
        let x = line.x;
        for (const ch of line.text) {
          ctx.fillText(ch, x, line.y);
          x += ctx.measureText(ch).width + spacing;
        }
      } else {
        ctx.fillText(line.text, line.x, line.y);
      }
    }
    this.cachedImageData = ctx.getImageData(0, 0, this.targetW, this.targetH);
    this.lastLayout = layout;
    this.dirty = false;
  }
}
