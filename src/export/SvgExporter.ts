import type { GridState } from '../core/types';
import type { ExportResult, SvgExportOptions } from './ExportTypes';
import { downloadBlob } from './ScreenshotExporter';

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function gridToSvg(grid: GridState, options: SvgExportOptions = {}): string {
  const fontFamily = options.fontFamily ?? 'monospace';
  const fontSize = options.fontSize ?? 12;
  const color = options.color ?? '#00ff88';
  const cellW = options.cellWidth ?? fontSize * 0.6;
  const cellH = options.cellHeight ?? fontSize * 1.2;
  const width = grid.cols * cellW;
  const height = grid.rows * cellH;
  const bg =
    options.backgroundColor === 'transparent' || options.transparent
      ? 'none'
      : (options.backgroundColor ?? '#000000');

  const tspans: string[] = [];
  for (let y = 0; y < grid.rows; y++) {
    for (let x = 0; x < grid.cols; x++) {
      const cell = grid.cells[y * grid.cols + x];
      if (!cell?.char || cell.char === ' ') continue;
      const cx = x * cellW + cellW * 0.5;
      const cy = y * cellH + cellH * 0.8;
      tspans.push(
        `<tspan x="${cx.toFixed(2)}" y="${cy.toFixed(2)}">${escapeXml(cell.char)}</tspan>`,
      );
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  ${bg !== 'none' ? `<rect width="100%" height="100%" fill="${bg}"/>` : ''}
  <text font-family="${escapeXml(fontFamily)}" font-size="${fontSize}" fill="${color}" xml:space="preserve">
    ${tspans.join('\n    ')}
  </text>
</svg>`;
}

export function exportSvg(
  grid: GridState,
  options: SvgExportOptions & { filename?: string } = {},
): ExportResult {
  const svg = gridToSvg(grid, options);
  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const filename = options.filename ?? `ascii-scene-${Date.now()}.svg`;
  downloadBlob(filename, blob);
  return { ok: true, format: 'svg', blob, data: svg, filename };
}
