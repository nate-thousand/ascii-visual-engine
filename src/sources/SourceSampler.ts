import type { SourceFitMode } from './Source';

export interface MapCoordsResult {
  sx: number;
  sy: number;
  inBounds: boolean;
}

/** Map normalized grid coords [0,1] to source pixel coordinates. */
export function mapNormalizedToSource(
  nx: number,
  ny: number,
  fitMode: SourceFitMode,
  sourceW: number,
  sourceH: number,
  targetW: number,
  targetH: number,
): MapCoordsResult {
  if (sourceW <= 0 || sourceH <= 0) {
    return { sx: 0, sy: 0, inBounds: false };
  }

  switch (fitMode) {
    case 'stretch': {
      const sx = Math.floor(nx * (sourceW - 1));
      const sy = Math.floor(ny * (sourceH - 1));
      return { sx, sy, inBounds: true };
    }
    case 'center': {
      const sx = Math.floor(sourceW / 2 + (nx - 0.5) * targetW);
      const sy = Math.floor(sourceH / 2 + (ny - 0.5) * targetH);
      return {
        sx,
        sy,
        inBounds: sx >= 0 && sx < sourceW && sy >= 0 && sy < sourceH,
      };
    }
    case 'fill':
    case 'fit':
    default: {
      const scale =
        fitMode === 'fill' ? Math.max(targetW / sourceW, targetH / sourceH) : Math.min(targetW / sourceW, targetH / sourceH);
      const drawW = sourceW * scale;
      const drawH = sourceH * scale;
      const offsetX = (targetW - drawW) / 2;
      const offsetY = (targetH - drawH) / 2;
      const px = nx * targetW;
      const py = ny * targetH;
      let sx = Math.floor((px - offsetX) / scale);
      let sy = Math.floor((py - offsetY) / scale);
      // The last grid column and row sample at exactly 1, which lands one
      // pixel past the image; that edge belongs to the last pixel.
      if (sx === sourceW && px <= offsetX + drawW) sx = sourceW - 1;
      if (sy === sourceH && py <= offsetY + drawH) sy = sourceH - 1;
      return {
        sx,
        sy,
        inBounds: sx >= 0 && sx < sourceW && sy >= 0 && sy < sourceH,
      };
    }
  }
}

/**
 * Continuous form of `mapNormalizedToSource`: source coordinates as floats
 * with no rounding and no bounds test, for the corners of a cell's footprint.
 */
export function mapNormalizedToSourceF(
  nx: number,
  ny: number,
  fitMode: SourceFitMode,
  sourceW: number,
  sourceH: number,
  targetW: number,
  targetH: number,
): { sx: number; sy: number } {
  switch (fitMode) {
    case 'stretch':
      return { sx: nx * sourceW, sy: ny * sourceH };
    case 'center':
      return { sx: sourceW / 2 + (nx - 0.5) * targetW, sy: sourceH / 2 + (ny - 0.5) * targetH };
    case 'fill':
    case 'fit':
    default: {
      const scale =
        fitMode === 'fill' ? Math.max(targetW / sourceW, targetH / sourceH) : Math.min(targetW / sourceW, targetH / sourceH);
      const offsetX = (targetW - sourceW * scale) / 2;
      const offsetY = (targetH - sourceH * scale) / 2;
      return { sx: (nx * targetW - offsetX) / scale, sy: (ny * targetH - offsetY) / scale };
    }
  }
}

export function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/**
 * Brightness of an RGBA pixel: luminance scaled by alpha, so a transparent
 * pixel is background (0) whatever its color. `invert` flips the luminance
 * before the alpha scale, so a black logo on a transparent background comes
 * out as a light shape rather than vanishing.
 */
export function pixelBrightness(data: Uint8ClampedArray, index: number, invert = false): number {
  const r = data[index];
  const g = data[index + 1];
  const b = data[index + 2];
  const a = data[index + 3] / 255;
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return (invert ? 1 - lum : lum) * a;
}

/** Alpha of an RGBA pixel, 0 to 1. */
export function pixelCoverage(data: Uint8ClampedArray, index: number): number {
  return data[index + 3] / 255;
}

/** Simple edge strength from neighboring pixels. */
export function pixelEdge(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
): number {
  if (x <= 0 || y <= 0 || x >= width - 1 || y >= height - 1) return 0;

  const idx = (y * width + x) * 4;
  const lx = pixelBrightness(data, idx - 4);
  const rx = pixelBrightness(data, idx + 4);
  const uy = pixelBrightness(data, idx - width * 4);
  const dy = pixelBrightness(data, idx + width * 4);
  const gx = Math.abs(rx - lx);
  const gy = Math.abs(dy - uy);
  return clamp01(Math.sqrt(gx * gx + gy * gy) * 2);
}

/** Local contrast in 3×3 neighborhood. */
export function pixelContrast(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
): number {
  let min = 1;
  let max = 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const sx = x + dx;
      const sy = y + dy;
      if (sx < 0 || sy < 0 || sx >= width || sy >= height) continue;
      const b = pixelBrightness(data, (sy * width + sx) * 4);
      if (b < min) min = b;
      if (b > max) max = b;
    }
  }
  return max - min;
}

export function mapBrightnessToGlyph(brightness: number, glyphSet: string[]): string {
  if (glyphSet.length === 0) return ' ';
  if (glyphSet.length === 1) return glyphSet[0];
  const index = Math.floor(clamp01(brightness) * (glyphSet.length - 1));
  return glyphSet[Math.max(0, Math.min(glyphSet.length - 1, index))];
}

/** Summed area tables of luminance times alpha and of alpha, for O(1) box averages. */
interface IntegralImage {
  source: ImageData;
  width: number;
  height: number;
  lum: Float32Array;
  cov: Float32Array;
}

function buildIntegral(data: ImageData): IntegralImage {
  const { width, height } = data;
  const stride = width + 1;
  const lum = new Float32Array(stride * (height + 1));
  const cov = new Float32Array(stride * (height + 1));
  const px = data.data;
  for (let y = 1; y <= height; y++) {
    let rowLum = 0;
    let rowCov = 0;
    for (let x = 1; x <= width; x++) {
      const i = ((y - 1) * width + (x - 1)) * 4;
      const a = px[i + 3] / 255;
      const l = ((0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]) / 255) * a;
      rowLum += l;
      rowCov += a;
      lum[y * stride + x] = lum[(y - 1) * stride + x] + rowLum;
      cov[y * stride + x] = cov[(y - 1) * stride + x] + rowCov;
    }
  }
  return { source: data, width, height, lum, cov };
}

function boxSum(table: Float32Array, stride: number, x0: number, y0: number, x1: number, y1: number): number {
  return table[y1 * stride + x1] - table[y0 * stride + x1] - table[y1 * stride + x0] + table[y0 * stride + x0];
}

export class SourceSampler {
  private integral: IntegralImage | null = null;

  /** The integral image for `data`, rebuilt when a different `ImageData` arrives (every frame for video). */
  private integralFor(data: ImageData): IntegralImage {
    if (!this.integral || this.integral.source !== data) this.integral = buildIntegral(data);
    return this.integral;
  }

  /**
   * Average brightness over a box in source pixels, with everything outside
   * the image counting as background. The box is the part of the source one
   * grid cell covers, so a stroke thinner than a cell still contributes its
   * share instead of hitting or missing a single pixel.
   */
  areaBrightness(data: ImageData, x0: number, y0: number, x1: number, y1: number, invert = false): number {
    const fullArea = (x1 - x0) * (y1 - y0);
    if (!(fullArea > 0)) return 0;
    const cx0 = Math.max(0, Math.floor(x0));
    const cy0 = Math.max(0, Math.floor(y0));
    const cx1 = Math.min(data.width, Math.ceil(x1));
    const cy1 = Math.min(data.height, Math.ceil(y1));
    if (cx1 <= cx0 || cy1 <= cy0) return 0;
    const table = this.integralFor(data);
    const stride = table.width + 1;
    const lum = boxSum(table.lum, stride, cx0, cy0, cx1, cy1);
    const cov = boxSum(table.cov, stride, cx0, cy0, cx1, cy1);
    // Divide by the cell's whole footprint, not the clipped part: pixels
    // beyond the image edge are background and count as 0.
    const fullW = Math.max(1, Math.ceil(x1) - Math.floor(x0));
    const fullH = Math.max(1, Math.ceil(y1) - Math.floor(y0));
    const value = invert ? cov - lum : lum;
    return clamp01(value / (fullW * fullH));
  }

  sampleFromImageData(
    data: ImageData,
    nx: number,
    ny: number,
    fitMode: SourceFitMode,
    targetW: number,
    targetH: number,
    contrastAmount = 1,
    edgeAmount = 0,
    invert = false,
    footprint?: { cols: number; rows: number },
  ): { brightness: number; contrast: number; edge: number } {
    const { sx, sy, inBounds } = mapNormalizedToSource(
      nx,
      ny,
      fitMode,
      data.width,
      data.height,
      targetW,
      targetH,
    );

    let brightness: number;
    let contrast = 0;
    let edge = 0;
    if (footprint) {
      // Area sample over the cell's true footprint: cell x of `cols` covers
      // [x / cols, (x + 1) / cols] of the target, recovered from the sample
      // point (nx = x / (cols - 1)) so both paths agree on which cell this is.
      const cx = Math.round(nx * Math.max(footprint.cols - 1, 0));
      const cy = Math.round(ny * Math.max(footprint.rows - 1, 0));
      const a = mapNormalizedToSourceF(cx / footprint.cols, cy / footprint.rows, fitMode, data.width, data.height, targetW, targetH);
      const b = mapNormalizedToSourceF((cx + 1) / footprint.cols, (cy + 1) / footprint.rows, fitMode, data.width, data.height, targetW, targetH);
      const x0 = Math.min(a.sx, b.sx);
      const x1 = Math.max(a.sx, b.sx);
      const y0 = Math.min(a.sy, b.sy);
      const y1 = Math.max(a.sy, b.sy);
      if (x1 - x0 >= 1 || y1 - y0 >= 1) {
        brightness = this.areaBrightness(data, x0, y0, x1, y1, invert);
      } else if (inBounds) {
        brightness = pixelBrightness(data.data, (sy * data.width + sx) * 4, invert);
      } else {
        brightness = 0;
      }
      if (inBounds && (edgeAmount > 0 || contrastAmount !== 1)) {
        contrast = pixelContrast(data.data, data.width, data.height, sx, sy);
        edge = pixelEdge(data.data, data.width, data.height, sx, sy);
      }
    } else {
      if (!inBounds) return { brightness: 0, contrast: 0, edge: 0 };
      const idx = (sy * data.width + sx) * 4;
      brightness = pixelBrightness(data.data, idx, invert);
      contrast = pixelContrast(data.data, data.width, data.height, sx, sy);
      edge = pixelEdge(data.data, data.width, data.height, sx, sy);
    }

    brightness = clamp01((brightness - 0.5) * contrastAmount + 0.5);
    const combined = clamp01(brightness * (1 - edgeAmount) + edge * edgeAmount);

    return { brightness: combined, contrast, edge };
  }

  applyToGrid(
    data: ImageData,
    grid: { cells: { x: number; y: number; char: string; brightness: number; phase: number }[] },
    cols: number,
    rows: number,
    glyphSet: string[],
    fitMode: SourceFitMode,
    targetW: number,
    targetH: number,
    contrastAmount = 1,
    edgeAmount = 0,
    blend = 1,
    getControl?: (name: string, fallback?: number) => number,
    invert = false,
    smooth = true,
  ): void {
    const strength = getControl?.('strength', 1) ?? 1;
    const footprint = smooth ? { cols, rows } : undefined;
    for (const cell of grid.cells) {
      const nx = cell.x / Math.max(cols - 1, 1);
      const ny = cell.y / Math.max(rows - 1, 1);
      const sample = this.sampleFromImageData(
        data,
        nx,
        ny,
        fitMode,
        targetW,
        targetH,
        contrastAmount,
        edgeAmount,
        invert,
        footprint,
      );
      const char = mapBrightnessToGlyph(sample.brightness, glyphSet);
      cell.char = char;
      const blended = clamp01(cell.brightness * (1 - blend) + sample.brightness * blend);
      cell.brightness = clamp01(blended * strength);
      cell.phase = sample.brightness;
    }
  }

  /**
   * Treat the source as a shape: cells whose sampled brightness reaches
   * `threshold` keep whatever the patterns and motions drew; the rest are
   * dimmed by `blend` and blanked at 1. With area sampling a cell the
   * outline only partly covers lands between: its brightness fades over
   * `softness` below the threshold, which is the anti aliasing of the
   * silhouette. Edge detection does not apply. Used for logos and type,
   * where a grey ramp would dissolve the outline.
   */
  applyMask(
    data: ImageData,
    grid: { cells: { x: number; y: number; char: string; brightness: number }[] },
    cols: number,
    rows: number,
    fitMode: SourceFitMode,
    targetW: number,
    targetH: number,
    options: { threshold?: number; blend?: number; contrast?: number; invert?: boolean; smooth?: boolean; softness?: number } = {},
  ): void {
    const threshold = options.threshold ?? 0.5;
    const blend = clamp01(options.blend ?? 1);
    const contrast = options.contrast ?? 1;
    const invert = options.invert ?? false;
    const smooth = options.smooth ?? true;
    const softness = smooth ? Math.max(0, options.softness ?? 0.25) : 0;
    const footprint = smooth ? { cols, rows } : undefined;
    for (const cell of grid.cells) {
      const nx = cell.x / Math.max(cols - 1, 1);
      const ny = cell.y / Math.max(rows - 1, 1);
      const sample = this.sampleFromImageData(data, nx, ny, fitMode, targetW, targetH, contrast, 0, invert, footprint);
      if (sample.brightness >= threshold) continue;
      // 1 at the threshold, 0 at `softness` below it (never above 0), smooth between.
      const lo = Math.max(0, threshold - softness);
      const t = threshold > lo && sample.brightness > lo ? clamp01((sample.brightness - lo) / (threshold - lo)) : 0;
      const inside = t * t * (3 - 2 * t);
      const keep = inside + (1 - inside) * (1 - blend);
      if (keep <= 0) {
        cell.char = ' ';
        cell.brightness = 0;
      } else {
        cell.brightness = clamp01(cell.brightness * keep);
      }
    }
  }
}
