export interface SpatialEntity {
  id: number;
  x: number;
  y: number;
}

export class SpatialGrid {
  private cells = new Map<number, number[]>();
  private entityPositions = new Map<number, { x: number; y: number; cellKey: number }>();
  private cols: number;
  private rows: number;
  private cellSize: number;

  constructor(cols = 32, rows = 32, cellSize = 1 / 32) {
    this.cols = cols;
    this.rows = rows;
    this.cellSize = cellSize;
  }

  clear(): void {
    this.cells.clear();
    this.entityPositions.clear();
  }

  resize(cols: number, rows: number, cellSize?: number): void {
    this.cols = cols;
    this.rows = rows;
    if (cellSize != null) this.cellSize = cellSize;
    this.clear();
  }

  private cellKey(x: number, y: number): number {
    const cx = Math.max(0, Math.min(this.cols - 1, Math.floor(x / this.cellSize)));
    const cy = Math.max(0, Math.min(this.rows - 1, Math.floor(y / this.cellSize)));
    return cy * this.cols + cx;
  }

  insert(id: number, x: number, y: number): void {
    this.remove(id);
    const key = this.cellKey(x, y);
    let bucket = this.cells.get(key);
    if (!bucket) {
      bucket = [];
      this.cells.set(key, bucket);
    }
    bucket.push(id);
    this.entityPositions.set(id, { x, y, cellKey: key });
  }

  remove(id: number): void {
    const pos = this.entityPositions.get(id);
    if (!pos) return;
    const bucket = this.cells.get(pos.cellKey);
    if (bucket) {
      const idx = bucket.indexOf(id);
      if (idx >= 0) bucket.splice(idx, 1);
      if (bucket.length === 0) this.cells.delete(pos.cellKey);
    }
    this.entityPositions.delete(id);
  }

  update(id: number, x: number, y: number): void {
    const pos = this.entityPositions.get(id);
    const newKey = this.cellKey(x, y);
    if (pos && pos.cellKey === newKey) {
      pos.x = x;
      pos.y = y;
      return;
    }
    this.insert(id, x, y);
  }

  queryRadius(x: number, y: number, radius: number, out: number[] = []): number[] {
    out.length = 0;
    const rCells = Math.ceil(radius / this.cellSize);
    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(y / this.cellSize);

    for (let dy = -rCells; dy <= rCells; dy++) {
      for (let dx = -rCells; dx <= rCells; dx++) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= this.cols || ny >= this.rows) continue;
        const bucket = this.cells.get(ny * this.cols + nx);
        if (!bucket) continue;
        for (const id of bucket) {
          const pos = this.entityPositions.get(id);
          if (!pos) continue;
          const ddx = pos.x - x;
          const ddy = pos.y - y;
          if (ddx * ddx + ddy * ddy <= radius * radius) {
            out.push(id);
          }
        }
      }
    }
    return out;
  }

  queryNeighbors(id: number, radius: number, out: number[] = []): number[] {
    const pos = this.entityPositions.get(id);
    if (!pos) return out;
    const results = this.queryRadius(pos.x, pos.y, radius, out);
    const idx = results.indexOf(id);
    if (idx >= 0) results.splice(idx, 1);
    return results;
  }

  getEntityCount(): number {
    return this.entityPositions.size;
  }

  getCellCount(): number {
    return this.cells.size;
  }
}
