import type { GridCell } from '../core/types';
import { Trails } from '../effects/Trails';
import type { GlyphCache } from '../performance/GlyphCache';
import type { DirtyRegionTracker } from '../performance/DirtyRegionTracker';

export interface CanvasDrawOptions {
  fontFamily?: string;
  color?: string;
  backgroundColor?: string;
  glyphCache?: GlyphCache;
  dirtyTracker?: DirtyRegionTracker;
  dirtyRendering?: boolean;
}

export interface DrawGridResult {
  drawCalls: number;
  glyphCount: number;
  dirtyCells: number;
  partialUpdate: boolean;
}

export function withAlpha(color: string, alpha: number): string {
  if (color.startsWith('#') && color.length === 7) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return color;
}

export function clearCanvas(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  width: number,
  height: number,
  trailAmount: number,
  backgroundColor: string,
  trailsEffect: Trails,
  dirtyTracker?: DirtyRegionTracker,
  cellWidth?: number,
  cellHeight?: number,
): void {
  if (trailAmount > 0) {
    trailsEffect.applyFade(ctx as CanvasRenderingContext2D, trailAmount);
    dirtyTracker?.markAllDirty();
    return;
  }

  if (
    dirtyTracker?.isEnabled() &&
    cellWidth != null &&
    cellHeight != null &&
    dirtyTracker.getDirtyCount() > 0
  ) {
    const cols = Math.ceil(width / cellWidth);
    const region = dirtyTracker.getBoundingRegion(cols, Math.ceil(height / cellHeight), cellWidth, cellHeight);
    if (region) {
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(region.minX, region.minY, region.maxX - region.minX, region.maxY - region.minY);
      return;
    }
  }

  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, width, height);
}

/** Alpha is quantized to this many levels so a frame sets fillStyle a few dozen times, not once per cell. */
const ALPHA_LEVELS = 32;
const alphaStyleCache = new Map<string, string[]>();
/** Per level cell index lists, reused across frames. */
const buckets: number[][] = Array.from({ length: ALPHA_LEVELS }, () => []);

function alphaStyles(color: string): string[] {
  let styles = alphaStyleCache.get(color);
  if (!styles) {
    styles = Array.from({ length: ALPHA_LEVELS }, (_, i) => withAlpha(color, 0.2 + (i / (ALPHA_LEVELS - 1)) * 0.8));
    alphaStyleCache.set(color, styles);
  }
  return styles;
}

/**
 * Draw every cell (or only the dirty ones). Cells are grouped by quantized
 * brightness so `fillStyle` changes at most ALPHA_LEVELS times per frame;
 * setting a new color string is the expensive part of a Canvas 2D text draw
 * loop, `fillText` itself is the rest.
 */
export function drawGridToCanvas(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  cells: GridCell[],
  cellWidth: number,
  cellHeight: number,
  options: CanvasDrawOptions,
): DrawGridResult {
  const fontFamily = options.fontFamily ?? 'monospace';
  const color = options.color ?? '#00ff88';
  const font = `${cellHeight}px ${fontFamily}`;

  ctx.textBaseline = 'top';
  ctx.font = font;
  options.glyphCache?.setFont(font);

  const useDirty =
    options.dirtyRendering &&
    options.dirtyTracker?.isEnabled() &&
    options.dirtyTracker.getDirtyCount() > 0 &&
    options.dirtyTracker.getDirtyCount() < cells.length;

  const dirtySet = useDirty ? options.dirtyTracker!.getDirtyIndices() : null;
  const styles = alphaStyles(color);
  for (const b of buckets) b.length = 0;

  const bucketOf = (cell: GridCell): number => {
    const brightness = Math.min(1, cell.brightness + cell.burst);
    // Comparisons with NaN are false, so a NaN cell lands in the dark bucket instead of at buckets[NaN].
    if (!(brightness > 0)) return 0;
    if (brightness >= 1) return ALPHA_LEVELS - 1;
    return Math.round(brightness * (ALPHA_LEVELS - 1));
  };

  let drawn = 0;
  if (dirtySet) {
    for (const idx of dirtySet) {
      const cell = cells[idx];
      if (!cell) continue;
      buckets[bucketOf(cell)].push(idx);
      drawn++;
    }
  } else {
    for (let i = 0; i < cells.length; i++) {
      buckets[bucketOf(cells[i])].push(i);
    }
    drawn = cells.length;
  }

  let drawCalls = 0;
  for (let level = 0; level < ALPHA_LEVELS; level++) {
    const bucket = buckets[level];
    if (bucket.length === 0) continue;
    ctx.fillStyle = styles[level];
    for (let j = 0; j < bucket.length; j++) {
      const cell = cells[bucket[j]];
      const px = cell.x * cellWidth + cell.ox;
      const py = cell.y * cellHeight + cell.oy;
      drawCalls++;
      if (cell.rotation !== 0 || cell.scale !== 1) {
        ctx.save();
        ctx.translate(px, py);
        if (cell.rotation !== 0) ctx.rotate(cell.rotation);
        if (cell.scale !== 1) ctx.scale(cell.scale, cell.scale);
        ctx.fillText(cell.char, 0, 0);
        ctx.restore();
      } else {
        ctx.fillText(cell.char, px, py);
      }
    }
  }

  return {
    drawCalls,
    glyphCount: drawn,
    dirtyCells: drawn,
    partialUpdate: dirtySet !== null,
  };
}
