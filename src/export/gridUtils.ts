import type { GridCell, GridState } from '../core/types';

export function gridToAscii(grid: GridState): string {
  const { cols, rows, cells } = grid;
  const lines: string[] = [];
  for (let y = 0; y < rows; y++) {
    let line = '';
    for (let x = 0; x < cols; x++) {
      const cell = cells[y * cols + x];
      line += cell?.char ?? ' ';
    }
    lines.push(line);
  }
  return lines.join('\n');
}

export function cloneGridState(grid: GridState): GridState {
  return {
    cols: grid.cols,
    rows: grid.rows,
    time: grid.time,
    width: grid.width,
    height: grid.height,
    cells: grid.cells.map(cloneCell),
  };
}

function cloneCell(cell: GridCell): GridCell {
  return { ...cell };
}

export function padFrameIndex(index: number, digits = 4): string {
  return String(index).padStart(digits, '0');
}
