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
  let drawCalls = 0;

  const drawCell = (cell: GridCell, px: number, py: number): void => {
    const brightness = Math.min(1, cell.brightness + cell.burst);
    const alpha = 0.2 + brightness * 0.8;
    ctx.fillStyle = withAlpha(color, alpha);
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
    if (options.glyphCache) {
      options.glyphCache.measure(ctx, cell.char, font);
    }
  };

  if (dirtySet) {
    for (const idx of dirtySet) {
      const cell = cells[idx];
      if (!cell) continue;
      drawCell(cell, cell.x * cellWidth + cell.ox, cell.y * cellHeight + cell.oy);
    }
    return {
      drawCalls,
      glyphCount: dirtySet.size,
      dirtyCells: dirtySet.size,
      partialUpdate: true,
    };
  }

  for (const cell of cells) {
    drawCell(cell, cell.x * cellWidth + cell.ox, cell.y * cellHeight + cell.oy);
  }

  return {
    drawCalls,
    glyphCount: cells.length,
    dirtyCells: cells.length,
    partialUpdate: false,
  };
}
