import type { ScriptModule } from './ScriptTypes';

export class ScriptRegistry {
  private scripts = new Map<string, ScriptModule>();

  register(module: ScriptModule): void {
    if (!module.id) throw new Error('Script module requires an id');
    this.scripts.set(module.id, module);
  }

  registerAll(modules: ScriptModule[]): void {
    for (const mod of modules) this.register(mod);
  }

  get(id: string): ScriptModule | undefined {
    return this.scripts.get(id);
  }

  has(id: string): boolean {
    return this.scripts.has(id);
  }

  list(): ScriptModule[] {
    return [...this.scripts.values()];
  }

  listIds(): string[] {
    return [...this.scripts.keys()];
  }

  unregister(id: string): boolean {
    return this.scripts.delete(id);
  }

  clear(): void {
    this.scripts.clear();
  }
}

export const globalScriptRegistry = new ScriptRegistry();
