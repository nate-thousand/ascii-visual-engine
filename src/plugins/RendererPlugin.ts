import type { AsciiEngine } from '../core/AsciiEngine';
import type { Plugin, PluginContext } from './Plugin';

export abstract class RendererPlugin implements Plugin {
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly version: string;
  readonly type = 'renderer' as const;
  enabled = true;

  abstract initialize(engine: AsciiEngine): void;
  abstract update(deltaTime: number, context: PluginContext): void;
  abstract destroy(): void;
}

export function isRendererPlugin(plugin: Plugin): plugin is RendererPlugin {
  return plugin.type === 'renderer';
}
