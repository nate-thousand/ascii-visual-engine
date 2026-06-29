import type { ScriptModule } from './ScriptTypes';
import { ScriptRegistry } from './ScriptRegistry';

export class ScriptLoader {
  private cache = new Map<string, ScriptModule>();

  constructor(private registry: ScriptRegistry = new ScriptRegistry()) {}

  getRegistry(): ScriptRegistry {
    return this.registry;
  }

  /** Register a script module directly (static import). */
  load(module: ScriptModule): ScriptModule {
    this.registry.register(module);
    this.cache.set(module.id, module);
    return module;
  }

  /** Load many modules at once. */
  loadAll(modules: ScriptModule[]): void {
    for (const mod of modules) this.load(mod);
  }

  /** Hot reload: replace module and return updated reference. */
  reload(module: ScriptModule): ScriptModule {
    this.registry.register(module);
    this.cache.set(module.id, module);
    return module;
  }

  getCached(id: string): ScriptModule | undefined {
    return this.cache.get(id) ?? this.registry.get(id);
  }

  clearCache(): void {
    this.cache.clear();
  }
}
