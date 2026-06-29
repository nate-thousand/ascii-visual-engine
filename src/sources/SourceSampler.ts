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
    case 'fill': {
      const scale = Math.max(targetW / sourceW, targetH / sourceH);
      const drawW = sourceW * scale;
      const drawH = sourceH * scale;
      const offsetX = (targetW - drawW) / 2;
      const offsetY = (targetH - drawH) / 2;
      const px = nx * targetW;
      const py = ny * targetH;
      const sx = Math.floor((px - offsetX) / scale);
      const sy = Math.floor((py - offsetY) / scale);
      return {
        sx,
        sy,
        inBounds: sx >= 0 && sx < sourceW && sy >= 0 && sy < sourceH,
      };
    }
    case 'fit':
    default: {
      const scale = Math.min(targetW / sourceW, targetH / sourceH);
      const drawW = sourceW * scale;
      const drawH = sourceH * scale;
      const offsetX = (targetW - drawW) / 2;
      const offsetY = (targetH - drawH) / 2;
      const px = nx * targetW;
      const py = ny * targetH;
      const sx = Math.floor((px - offsetX) / scale);
      const sy = Math.floor((py - offsetY) / scale);
      return {
        sx,
        sy,
        inBounds: sx >= 0 && sx < sourceW && sy >= 0 && sy < sourceH,
      };
    }
  }
}

export function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** Luminance from RGBA pixel at index. */
export function pixelBrightness(data: Uint8ClampedArray, index: number): number {
  const r = data[index];
  const g = data[index + 1];
  const b = data[index + 2];
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
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

export class SourceSampler {
  sampleFromImageData(
    data: ImageData,
    nx: number,
    ny: number,
    fitMode: SourceFitMode,
    targetW: number,
    targetH: number,
    contrastAmount = 1,
    edgeAmount = 0,
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

    if (!inBounds) {
      return { brightness: 0, contrast: 0, edge: 0 };
    }

    const idx = (sy * data.width + sx) * 4;
    let brightness = pixelBrightness(data.data, idx);
    const contrast = pixelContrast(data.data, data.width, data.height, sx, sy);
    const edge = pixelEdge(data.data, data.width, data.height, sx, sy);

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
  ): void {
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
      );
      const char = mapBrightnessToGlyph(sample.brightness, glyphSet);
      cell.char = char;
      cell.brightness = clamp01(cell.brightness * (1 - blend) + sample.brightness * blend);
      cell.phase = sample.brightness;
    }
  }
}
