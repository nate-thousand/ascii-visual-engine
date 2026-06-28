import type { Effect, EffectContext, NoteEvent } from '../core/types';
import type { AsciiEngine } from '../core/AsciiEngine';
import type { Plugin, PluginContext } from './Plugin';

export type EffectPhase = 'motion' | 'post';

export interface EffectPluginMeta {
  id: string;
  name: string;
  version: string;
  phase: EffectPhase;
}

export class EffectPlugin implements Plugin {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly type = 'effect' as const;
  readonly phase: EffectPhase;
  enabled = true;

  private effect: Effect;

  constructor(effect: Effect, meta: EffectPluginMeta) {
    this.effect = effect;
    this.id = meta.id;
    this.name = meta.name;
    this.version = meta.version;
    this.phase = meta.phase;
  }

  initialize(_engine: AsciiEngine): void {}

  update(_deltaTime: number, context: PluginContext): void {
    if (!this.enabled) return;
    this.effect.update(toEffectContext(context));
  }

  onNoteOn(event: NoteEvent): void {
    if (!this.enabled) return;
    this.effect.onNoteOn?.(event);
  }

  onNoteOff(event: NoteEvent): void {
    if (!this.enabled) return;
    this.effect.onNoteOff?.(event);
  }

  reset(): void {
    this.effect.reset?.();
  }

  destroy(): void {
    this.reset();
  }

  getEffect(): Effect {
    return this.effect;
  }
}

export function isEffectPlugin(plugin: Plugin): plugin is EffectPlugin {
  return plugin.type === 'effect';
}

function toEffectContext(context: PluginContext): EffectContext {
  return {
    grid: context.grid,
    glyphSet: context.glyphSet,
    speed: context.speed,
    glitchAmount: context.glitchAmount,
    trailAmount: context.trailAmount,
    dt: context.dt,
    time: context.time,
  };
}
