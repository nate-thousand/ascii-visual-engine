import type { GridCell, GridState } from '../core/types';
import type { BlendMode } from './BlendModes';
import type { MaskConfig } from './Mask';
import { Mask } from './Mask';

export interface LayerConfig {
  id: string;
  name?: string;
  enabled?: boolean;
  opacity?: number;
  blendMode?: BlendMode;
  mask?: MaskConfig;
  glyphSet?: string[];
  source?: string;
  pattern?: string;
  simulation?: string;
  effects?: string[];
  fill?: number;
}

export class Layer {
  readonly id: string;
  name: string;
  enabled: boolean;
  opacity: number;
  blendMode: BlendMode;
  mask: Mask;
  glyphSet: string[] | null;
  source: string | null;
  pattern: string | null;
  simulation: string | null;
  effects: string[];
  fill: number | null;
  private cells: GridCell[] = [];
  private cols = 0;
  private rows = 0;

  constructor(config: LayerConfig) {
    this.id = config.id;
    this.name = config.name ?? config.id;
    this.enabled = config.enabled !== false;
    this.opacity = config.opacity ?? 1;
    this.blendMode = config.blendMode ?? 'normal';
    this.mask = new Mask(config.mask ?? { type: 'radial', amount: 1 });
    this.glyphSet = config.glyphSet ?? null;
    this.source = config.source ?? null;
    this.pattern = config.pattern ?? null;
    this.simulation = config.simulation ?? null;
    this.effects = config.effects ?? [];
    this.fill = config.fill ?? null;
  }

  ensureSize(grid: GridState): void {
    if (grid.cols === this.cols && grid.rows === this.rows && this.cells.length > 0) return;
    this.cols = grid.cols;
    this.rows = grid.rows;
    this.cells = grid.cells.map((c) => ({ ...c }));
  }

  getCells(): GridCell[] {
    return this.cells;
  }

  clear(): void {
    for (const cell of this.cells) {
      cell.brightness = 0;
      cell.phase = 0;
      cell.char = ' ';
      cell.burst = 0;
    }
  }

  applyFill(brightness: number, glyphSet: string[]): void {
    const b = Math.max(0, Math.min(1, brightness));
    const char = glyphSet[Math.floor(b * (glyphSet.length - 1))] ?? ' ';
    for (const cell of this.cells) {
      cell.brightness = b;
      cell.phase = b;
      cell.char = char;
    }
  }

  copyFrom(grid: GridState): void {
    this.ensureSize(grid);
    for (let i = 0; i < grid.cells.length; i++) {
      Object.assign(this.cells[i], grid.cells[i]);
    }
  }
}
