import type { GridState } from '../core/types';
import type { PostPass, PostPassContext } from '../postprocessing/PostPass';
import {
  DitherPass,
  DisplacementPass,
  EdgePass,
  FeedbackPass,
  InvertPass,
  PosterizePass,
  ScanlinePass,
  SmearPass,
  ThresholdPass,
} from '../postprocessing';

export interface PostProcessingConfig {
  id: string;
  enabled?: boolean;
  amount?: number;
}

export interface PostProcessorDebugState {
  enabledPasses: string[];
  passCount: number;
  processTimeMs: number;
  feedbackActive: boolean;
}

export class PostProcessor {
  private passes = new Map<string, PostPass>();
  private previousBrightness: Float32Array | null = null;
  private lastProcessTimeMs = 0;

  constructor() {
    this.registerDefaults();
  }

  registerPass(pass: PostPass): void {
    this.passes.set(pass.id, pass);
  }

  getPass(id: string): PostPass | undefined {
    return this.passes.get(id);
  }

  getAll(): PostPass[] {
    return Array.from(this.passes.values());
  }

  enablePass(id: string): void {
    const pass = this.passes.get(id);
    if (pass) pass.enabled = true;
  }

  disablePass(id: string): void {
    const pass = this.passes.get(id);
    if (pass) pass.enabled = false;
  }

  setPassAmount(id: string, amount: number): void {
    const pass = this.passes.get(id);
    if (pass) pass.amount = amount;
  }

  setFromPreset(configs: PostProcessingConfig[]): void {
    for (const pass of this.passes.values()) {
      pass.enabled = false;
    }
    for (const config of configs) {
      const pass = this.passes.get(config.id);
      if (!pass) continue;
      pass.enabled = config.enabled !== false;
      if (config.amount !== undefined) pass.amount = config.amount;
    }
  }

  isActive(): boolean {
    return this.getEnabled().length > 0;
  }

  getEnabled(): PostPass[] {
    return this.getAll().filter((p) => p.enabled);
  }

  process(
    grid: GridState,
    glyphSet: string[],
    time: number,
    dt: number,
    getControl: (name: string, fallback?: number) => number,
  ): void {
    const enabled = this.getEnabled();
    if (enabled.length === 0) {
      this.lastProcessTimeMs = 0;
      return;
    }

    const start = performance.now();
    this.ensurePreviousBuffer(grid.cells.length);

    const ctx: PostPassContext = {
      grid,
      glyphSet,
      time,
      dt,
      getControl,
      previousBrightness: this.previousBrightness,
    };

    for (const pass of enabled) {
      pass.apply(ctx);
    }

    if (this.previousBrightness) {
      for (let i = 0; i < grid.cells.length; i++) {
        this.previousBrightness[i] = grid.cells[i].brightness;
      }
    }

    this.lastProcessTimeMs = performance.now() - start;
  }

  reset(): void {
    this.previousBrightness = null;
    for (const pass of this.passes.values()) {
      pass.reset();
    }
  }

  getDebugState(): PostProcessorDebugState {
    const enabled = this.getEnabled();
    return {
      enabledPasses: enabled.map((p) => p.id),
      passCount: enabled.length,
      processTimeMs: this.lastProcessTimeMs,
      feedbackActive: enabled.some((p) => p.id === 'feedback'),
    };
  }

  destroy(): void {
    this.previousBrightness = null;
    this.passes.clear();
  }

  private registerDefaults(): void {
    const defaults = [
      new FeedbackPass(),
      new SmearPass(),
      new DisplacementPass(),
      new ThresholdPass(),
      new InvertPass(),
      new EdgePass(),
      new PosterizePass(),
      new ScanlinePass(),
      new DitherPass(),
    ];
    for (const pass of defaults) {
      this.passes.set(pass.id, pass);
    }
  }

  private ensurePreviousBuffer(size: number): void {
    if (!this.previousBrightness || this.previousBrightness.length !== size) {
      this.previousBrightness = new Float32Array(size);
    }
  }
}

export function createDefaultPasses(): PostPass[] {
  return [
    new FeedbackPass(),
    new SmearPass(),
    new DisplacementPass(),
    new ThresholdPass(),
    new InvertPass(),
    new EdgePass(),
    new PosterizePass(),
    new ScanlinePass(),
    new DitherPass(),
  ];
}

export function listPostPassIds(): string[] {
  return createDefaultPasses().map((p) => p.id);
}
