import type { NoteEvent } from '../core/types';
import type { AsciiEngine } from '../core/AsciiEngine';
import { clamp01, type Plugin, type PluginContext, type PluginType } from './Plugin';
import { isEffectPlugin } from './EffectPlugin';
import { isPatternPlugin, PatternPlugin } from './PatternPlugin';

/** Ensures post effects run in compositing order regardless of registration order. */
const POST_EFFECT_ORDER = ['burst', 'glitch', 'trails'] as const;

/** When multiple motion effects are enabled, later entries win (wave over noise). */
const MOTION_EFFECT_ORDER = ['noise', 'wave'] as const;

export class PluginManager {
  private plugins = new Map<string, Plugin>();
  private engine: AsciiEngine | null = null;

  setEngine(engine: AsciiEngine): void {
    this.engine = engine;
  }

  register(plugin: Plugin): void {
    if (this.plugins.has(plugin.id)) {
      throw new Error(`PluginManager: plugin "${plugin.id}" is already registered`);
    }
    this.plugins.set(plugin.id, plugin);
    if (this.engine) {
      plugin.initialize(this.engine);
    }
  }

  unregister(id: string): void {
    const plugin = this.plugins.get(id);
    if (!plugin) return;
    plugin.destroy();
    this.plugins.delete(id);
  }

  enable(id: string): void {
    const plugin = this.plugins.get(id);
    if (!plugin) {
      throw new Error(`PluginManager: unknown plugin "${id}"`);
    }
    plugin.enabled = true;
  }

  disable(id: string): void {
    const plugin = this.plugins.get(id);
    if (!plugin) return;
    plugin.enabled = false;
    if (isEffectPlugin(plugin)) {
      plugin.reset();
    }
  }

  get(id: string): Plugin | undefined {
    return this.plugins.get(id);
  }

  getAll(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  getByType(type: PluginType): Plugin[] {
    return this.getAll().filter((plugin) => plugin.type === type);
  }

  getEnabled(): Plugin[] {
    return this.getAll().filter((plugin) => plugin.enabled);
  }

  getEnabledByType(type: PluginType): Plugin[] {
    return this.getByType(type).filter((plugin) => plugin.enabled);
  }

  setEnabledIds(ids: string[]): void {
    for (const plugin of this.plugins.values()) {
      plugin.enabled = false;
    }
    for (const id of ids) {
      const plugin = this.plugins.get(id);
      if (plugin) plugin.enabled = true;
    }
  }

  update(deltaTime: number, context: PluginContext): void {
    for (const plugin of this.getEnabled()) {
      plugin.update(deltaTime, context);
    }
  }

  runMotionEffects(context: PluginContext): void {
    for (const id of MOTION_EFFECT_ORDER) {
      const plugin = this.plugins.get(id);
      if (
        plugin?.enabled &&
        isEffectPlugin(plugin) &&
        plugin.phase === 'motion'
      ) {
        plugin.update(context.dt, context);
      }
    }
  }

  runPostEffects(context: PluginContext): void {
    for (const id of POST_EFFECT_ORDER) {
      const plugin = this.plugins.get(id);
      if (
        plugin?.enabled &&
        isEffectPlugin(plugin) &&
        plugin.phase === 'post'
      ) {
        plugin.update(context.dt, context);
      }
    }
  }

  updatePatterns(deltaTime: number, context: PluginContext): void {
    for (const plugin of this.getEnabledByType('pattern')) {
      if (isPatternPlugin(plugin)) {
        plugin.update(deltaTime, context);
      }
    }
  }

  applyPatterns(context: PluginContext): void {
    const patterns = this.getEnabledByType('pattern').filter(isPatternPlugin);
    if (patterns.length === 0) return;

    const { grid, glyphSet } = context;

    for (const cell of grid.cells) {
      const nx = cell.x / Math.max(grid.cols - 1, 1);
      const ny = cell.y / Math.max(grid.rows - 1, 1);

      let sum = 0;
      let weight = 0;

      for (const plugin of patterns) {
        const w = plugin.getWeight(context);
        if (w <= 0) continue;
        sum += plugin.sample(nx, ny, context) * w;
        weight += w;
      }

      if (weight <= 0) continue;

      const value = sum / weight;
      cell.brightness = clamp01(cell.brightness * 0.1 + value * 0.9);

      if (!context.glyphLanguageActive) {
        const index = Math.floor(cell.brightness * (glyphSet.length - 1));
        cell.char = glyphSet[Math.max(0, Math.min(glyphSet.length - 1, index))];
      }
    }
  }

  dispatchNoteOn(event: NoteEvent): void {
    for (const plugin of this.getEnabledByType('effect')) {
      if (isEffectPlugin(plugin)) {
        plugin.onNoteOn(event);
      }
    }
  }

  dispatchNoteOff(event: NoteEvent): void {
    for (const plugin of this.getEnabledByType('effect')) {
      if (isEffectPlugin(plugin)) {
        plugin.onNoteOff(event);
      }
    }
  }

  resetEffects(): void {
    for (const plugin of this.getByType('effect')) {
      if (isEffectPlugin(plugin)) {
        plugin.reset();
      }
    }
  }

  destroy(): void {
    for (const plugin of this.plugins.values()) {
      plugin.destroy();
    }
    this.plugins.clear();
    this.engine = null;
  }
}

export { PatternPlugin };
