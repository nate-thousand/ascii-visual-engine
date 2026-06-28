import type { Pattern, PatternSampleContext } from '../patterns/Pattern';
import type { AsciiEngine } from '../core/AsciiEngine';
import type { Plugin, PluginContext } from './Plugin';

export interface PatternPluginMeta {
  id?: string;
  name?: string;
  version: string;
}

export class PatternPlugin implements Plugin {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly type = 'pattern' as const;
  enabled = true;

  private pattern: Pattern;

  constructor(pattern: Pattern, meta: PatternPluginMeta) {
    this.pattern = pattern;
    this.id = meta.id ?? pattern.id;
    this.name = meta.name ?? pattern.name;
    this.version = meta.version;
  }

  initialize(engine: AsciiEngine): void {
    this.pattern.initialize(engine);
  }

  update(deltaTime: number, context: PluginContext): void {
    if (!this.enabled) return;
    this.pattern.update(deltaTime, toPatternContext(context));
  }

  sample(x: number, y: number, context: PluginContext): number {
    return this.pattern.sample(x, y, toPatternContext(context));
  }

  destroy(): void {
    this.pattern.destroy();
  }

  getPattern(): Pattern {
    return this.pattern;
  }

  getWeight(context: PluginContext): number {
    switch (this.id) {
      case 'spiral':
        return context.getControl('spiralAmount', 0.5);
      case 'cellular':
        return context.getControl('cellularAmount', 0.5);
      case 'scanline':
        return context.getControl('scanlineAmount', 0.5);
      case 'radialSymmetry': {
        const symmetry = context.getControl('symmetry', 6);
        const petals = context.getControl('petals', 5);
        return Math.max(0.15, (symmetry / 12) * (petals / 8));
      }
      case 'grid':
        return Math.max(0.2, context.getControl('density', 1) / 2);
      case 'wavePattern':
        return Math.max(0.3, context.getControl('speed', 1) / 3);
      default:
        return 1;
    }
  }
}

export function isPatternPlugin(plugin: Plugin): plugin is PatternPlugin {
  return plugin.type === 'pattern';
}

function toPatternContext(context: PluginContext): PatternSampleContext {
  return {
    grid: context.grid,
    glyphSet: context.glyphSet,
    time: context.time,
    dt: context.dt,
    speed: context.speed,
    getControl: context.getControl,
  };
}
