import type { ControlDef } from '../core/types';

/** A plugin's tunable numbers: declared once with ranges and defaults, set per preset or at runtime. */
export type ParamDef = ControlDef;

/** Anything with params: the built in patterns and effects, and third party plugins that opt in. */
export interface Parameterized {
  describeParams(): ParamDef[];
  getParams(): Record<string, number>;
  setParams(params: Record<string, number>): void;
  resetParams(): void;
}

export function isParameterized(value: unknown): value is Parameterized {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Parameterized).describeParams === 'function' &&
    typeof (value as Parameterized).setParams === 'function'
  );
}

/**
 * Typed storage behind `Parameterized`. Values are clamped to the declared
 * range; unknown names are ignored so a preset written for a newer plugin
 * does not throw on an older one.
 */
export class ParamStore<N extends string = string> implements Parameterized {
  private readonly defs: ParamDef[];
  private readonly values: Record<string, number>;

  constructor(defs: ParamDef[]) {
    this.defs = defs;
    this.values = {};
    this.resetParams();
  }

  get(name: N): number {
    return this.values[name];
  }

  describeParams(): ParamDef[] {
    return this.defs.map((d) => ({ ...d }));
  }

  getParams(): Record<string, number> {
    return { ...this.values };
  }

  setParams(params: Record<string, number>): void {
    for (const def of this.defs) {
      const v = params[def.name];
      if (typeof v !== 'number' || !Number.isFinite(v)) continue;
      this.values[def.name] = Math.max(def.min, Math.min(def.max, v));
    }
  }

  resetParams(): void {
    for (const def of this.defs) this.values[def.name] = def.default;
  }

  /** Only the values that differ from their defaults, for export. */
  changedParams(): Record<string, number> {
    const out: Record<string, number> = {};
    for (const def of this.defs) {
      if (this.values[def.name] !== def.default) out[def.name] = this.values[def.name];
    }
    return out;
  }
}
