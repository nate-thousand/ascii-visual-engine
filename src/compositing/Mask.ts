import type { GridState } from '../core/types';
import { clamp01 } from './BlendModes';

export type MaskType = 'radial' | 'linear' | 'noise' | 'brightness';

export interface MaskConfig {
  type: MaskType;
  amount?: number;
  angle?: number;
  centerX?: number;
  centerY?: number;
  invert?: boolean;
}

export class Mask {
  private config: MaskConfig;

  constructor(config: MaskConfig) {
    this.config = config;
  }

  getConfig(): MaskConfig {
    return this.config;
  }

  setConfig(config: MaskConfig): void {
    this.config = config;
  }

  sample(x: number, y: number, grid: GridState, sourceBrightness?: number): number {
    const cols = grid.cols;
    const rows = grid.rows;
    const nx = x / Math.max(cols - 1, 1);
    const ny = y / Math.max(rows - 1, 1);
    const amount = this.config.amount ?? 1;
    let value = 1;

    switch (this.config.type) {
      case 'radial': {
        const cx = this.config.centerX ?? 0.5;
        const cy = this.config.centerY ?? 0.5;
        const dx = nx - cx;
        const dy = ny - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        value = clamp01(1 - dist * 2 * amount);
        break;
      }
      case 'linear': {
        const angle = ((this.config.angle ?? 0) * Math.PI) / 180;
        const cx = this.config.centerX ?? 0.5;
        const cy = this.config.centerY ?? 0.5;
        const dx = nx - cx;
        const dy = ny - cy;
        const projected = dx * Math.cos(angle) + dy * Math.sin(angle);
        value = clamp01(0.5 + projected * amount);
        break;
      }
      case 'noise': {
        value = clamp01(
          0.5 +
            0.5 *
              Math.sin(nx * 12.9898 + ny * 78.233 + amount * 43.758) *
              Math.cos(nx * 4.1414 - ny * 2.71 + amount * 17.3),
        );
        break;
      }
      case 'brightness': {
        const idx = y * cols + x;
        const cell = grid.cells[idx];
        const b = sourceBrightness ?? cell?.brightness ?? 0;
        value = clamp01(b * amount);
        break;
      }
    }

    if (this.config.invert) value = 1 - value;
    return value;
  }
}

export function createDefaultMask(type: MaskType = 'radial'): Mask {
  return new Mask({ type, amount: 1, centerX: 0.5, centerY: 0.5 });
}
