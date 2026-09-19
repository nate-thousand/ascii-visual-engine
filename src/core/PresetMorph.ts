/** Named curves, or a function from linear progress to eased progress, both 0 to 1. */
export type MorphEasing = 'linear' | 'easeIn' | 'easeOut' | 'easeInOut' | ((t: number) => number);

export interface MorphOptions {
  /** Seconds from the current look to the target. Default 1. */
  duration?: number;
  /** Curve applied to the control interpolation. Default `easeInOut`. */
  easing?: MorphEasing;
  /**
   * Progress (0 to 1) at which the target's structure replaces the current
   * one: plugins, motions, simulations, passes, layers, glyph set, source,
   * mappings. Only numbers can be blended; everything else switches in one
   * step here. Default 0.5. 0 switches at the start, 1 at the end.
   */
  switchAt?: number;
  /** Controls the morph leaves alone: not blended, and their current values survive the switch. */
  exclude?: string[];
}

export interface MorphState {
  /** A morph is in progress. */
  active: boolean;
  /** Preset ids. Both empty when idle. */
  from: string;
  to: string;
  /** Elapsed share of the duration, 0 to 1, before easing. */
  progress: number;
  /** After easing; the blend applied to the controls. */
  eased: number;
  /** The structure has switched to the target. */
  switched: boolean;
  duration: number;
}

export const NO_MORPH: MorphState = Object.freeze({
  active: false,
  from: '',
  to: '',
  progress: 0,
  eased: 0,
  switched: false,
  duration: 0,
});

const EASINGS: Record<Exclude<MorphEasing, (t: number) => number>, (t: number) => number> = {
  linear: (t) => t,
  easeIn: (t) => t * t,
  easeOut: (t) => 1 - (1 - t) * (1 - t),
  easeInOut: (t) => (t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t)),
};

export function resolveEasing(easing: MorphEasing | undefined): (t: number) => number {
  if (typeof easing === 'function') return easing;
  return EASINGS[easing ?? 'easeInOut'] ?? EASINGS.easeInOut;
}

export interface MorphStep {
  /** Control values for this frame. */
  values: Record<string, number>;
  /** The structural switch falls on this frame. */
  switchNow: boolean;
  /** The morph reached the end on this frame. */
  done: boolean;
}

/**
 * The numeric half of a preset transition: every control in `to` runs from
 * its current value to the target over the duration. Pure and clock free;
 * the engine feeds it `dt` and applies the values, and performs the
 * structural switch when `advance()` says so.
 */
export class PresetMorph {
  readonly fromId: string;
  readonly toId: string;
  readonly duration: number;
  readonly switchAt: number;
  private readonly ease: (t: number) => number;
  private readonly from: Record<string, number>;
  private readonly to: Record<string, number>;
  private readonly names: Set<string>;
  private readonly held = new Set<string>();
  private elapsed = 0;
  private switched = false;
  private finished = false;

  constructor(
    fromId: string,
    toId: string,
    from: Record<string, number>,
    to: Record<string, number>,
    options: MorphOptions = {},
  ) {
    this.fromId = fromId;
    this.toId = toId;
    this.duration = Math.max(0, options.duration ?? 1);
    this.switchAt = Math.max(0, Math.min(1, options.switchAt ?? 0.5));
    this.ease = resolveEasing(options.easing);
    this.to = { ...to };
    this.from = {};
    const exclude = new Set(options.exclude ?? []);
    this.names = new Set();
    for (const name of Object.keys(this.to)) {
      if (exclude.has(name)) {
        this.held.add(name);
        continue;
      }
      this.names.add(name);
      // A control the current look never set starts at its target.
      this.from[name] = from[name] ?? this.to[name];
    }
  }

  /** Drop a control from the blend, for example after the host set it by hand. Its value then survives the structural switch. */
  release(name: string): void {
    if (this.names.delete(name)) this.held.add(name);
  }

  /** Every control still blending. */
  controls(): string[] {
    return [...this.names];
  }

  /** Excluded or released controls, whose current values the engine keeps across the switch. */
  releasedControls(): string[] {
    return [...this.held];
  }

  advance(dt: number): MorphStep {
    if (this.finished) return { values: {}, switchNow: false, done: true };
    this.elapsed += Math.max(0, dt);
    const progress = this.progressValue();
    const eased = this.ease(progress);
    const values: Record<string, number> = {};
    for (const name of this.names) {
      const a = this.from[name];
      const b = this.to[name];
      values[name] = progress >= 1 ? b : a + (b - a) * eased;
    }
    const switchNow = !this.switched && progress >= this.switchAt;
    if (switchNow) this.switched = true;
    const done = progress >= 1;
    if (done) this.finished = true;
    return { values, switchNow, done };
  }

  getState(): MorphState {
    const progress = this.progressValue();
    return {
      active: !this.finished,
      from: this.fromId,
      to: this.toId,
      progress,
      eased: this.ease(progress),
      switched: this.switched,
      duration: this.duration,
    };
  }

  private progressValue(): number {
    // Summed frame steps land a hair short of the duration; treat that as the end.
    if (this.duration <= 0 || this.elapsed >= this.duration - 1e-9) return 1;
    return this.elapsed / this.duration;
  }
}
