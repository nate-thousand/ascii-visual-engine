import type { AsciiEngine } from '../core/AsciiEngine';
import type { Plugin, PluginContext } from './Plugin';

export abstract class InputPlugin implements Plugin {
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly version: string;
  readonly type = 'input' as const;
  enabled = true;

  abstract initialize(engine: AsciiEngine): void;
  abstract update(deltaTime: number, context: PluginContext): void;
  abstract destroy(): void;
}

export function isInputPlugin(plugin: Plugin): plugin is InputPlugin {
  return plugin.type === 'input';
}
