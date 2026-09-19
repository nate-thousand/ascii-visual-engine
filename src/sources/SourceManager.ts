import type { AsciiEngine } from '../core/AsciiEngine';
import type { GridState } from '../core/types';
import type {
  Source,
  SourceContext,
  SourceDebugState,
  SourceMode,
  SourceType,
  SourceApplyMode,
} from './Source';
import { SourceSampler } from './SourceSampler';

export class SourceManager {
  private sources = new Map<string, Source>();
  private engine: AsciiEngine | null = null;
  private activeSourceId: string | null = null;
  private mode: SourceMode = 'procedural';
  private sampler = new SourceSampler();

  setEngine(engine: AsciiEngine): void {
    this.engine = engine;
  }

  registerSource(source: Source): void {
    if (this.sources.has(source.id)) {
      throw new Error(`SourceManager: source "${source.id}" is already registered`);
    }
    this.sources.set(source.id, source);
    if (this.engine) {
      source.initialize(this.engine);
    }
  }

  unregisterSource(id: string): void {
    const source = this.sources.get(id);
    if (!source) return;
    if (this.activeSourceId === id) {
      this.activeSourceId = null;
    }
    source.destroy();
    this.sources.delete(id);
  }

  setActiveSource(id: string | null): void {
    if (id === null) {
      this.activeSourceId = null;
      this.mode = 'procedural';
      return;
    }
    const source = this.sources.get(id);
    if (!source) {
      throw new Error(`SourceManager: unknown source "${id}"`);
    }
    this.activeSourceId = id;
    this.mode = 'source';
  }

  getActiveSource(): Source | undefined {
    if (!this.activeSourceId) return undefined;
    return this.sources.get(this.activeSourceId);
  }

  getSource(id: string): Source | undefined {
    return this.sources.get(id);
  }

  getAll(): Source[] {
    return Array.from(this.sources.values());
  }

  getSourceByType(type: SourceType): Source | undefined {
    return this.getAll().find((s) => s.type === type);
  }

  setMode(mode: SourceMode): void {
    this.mode = mode;
    if (mode === 'procedural') {
      this.activeSourceId = null;
    }
  }

  getMode(): SourceMode {
    return this.mode;
  }

  isSourceActive(): boolean {
    return this.mode === 'source' && this.activeSourceId !== null;
  }

  async loadSource(id: string, input: unknown): Promise<void> {
    const source = this.sources.get(id);
    if (!source) {
      throw new Error(`SourceManager: unknown source "${id}"`);
    }
    await source.load(input);
  }

  update(deltaTime: number, context: SourceContext): void {
    const source = this.getActiveSource();
    if (!source || this.mode !== 'source') return;
    source.update(deltaTime, context);
  }

  /** `mask` when a ready source is active and `sourceMask` is on; otherwise `brightness`. */
  getApplyMode(getControl: (name: string, fallback?: number) => number): SourceApplyMode {
    return getControl('sourceMask', 0) >= 0.5 ? 'mask' : 'brightness';
  }

  /** A ready source is active and will drive the grid this frame. */
  hasReadySource(): boolean {
    const source = this.getActiveSource();
    return !!source && this.mode === 'source' && source.isReady();
  }

  /** Brightness ramp: replace glyphs and brightness from the source. False when nothing is ready. */
  applyToGrid(
    grid: GridState,
    glyphSet: string[],
    getControl: (name: string, fallback?: number) => number,
  ): boolean {
    const source = this.getActiveSource();
    if (!source || this.mode !== 'source' || !source.isReady()) return false;

    const imageData = this.getImageDataFromSource(source);
    if (!imageData) return false;

    // Fit modes compare aspect ratios, so the target is the grid's pixel
    // size, not its cell count: cells are 1.6 times taller than wide.
    const [targetW, targetH] = targetSizeOf(grid);
    this.sampler.applyToGrid(
      imageData,
      grid,
      grid.cols,
      grid.rows,
      glyphSet,
      source.getFitMode(),
      targetW,
      targetH,
      getControl('sourceContrast', 1),
      getControl('sourceEdge', 0.3),
      1,
      getControl,
      getControl('sourceInvert', 0) >= 0.5,
    );
    return true;
  }

  /** Shape mask over a finished frame: outside the source's shape, cells are dimmed by `sourceBlend` and blanked at 1. */
  applyMask(grid: GridState, getControl: (name: string, fallback?: number) => number): boolean {
    const source = this.getActiveSource();
    if (!source || this.mode !== 'source' || !source.isReady()) return false;
    const imageData = this.getImageDataFromSource(source);
    if (!imageData) return false;
    const [targetW, targetH] = targetSizeOf(grid);
    this.sampler.applyMask(imageData, grid, grid.cols, grid.rows, source.getFitMode(), targetW, targetH, {
      threshold: getControl('sourceThreshold', 0.5),
      blend: getControl('sourceBlend', 1),
      contrast: getControl('sourceContrast', 1),
      invert: getControl('sourceInvert', 0) >= 0.5,
    });
    return true;
  }

  getDebugState(getControl?: (name: string, fallback?: number) => number): SourceDebugState {
    const source = this.getActiveSource();
    const imageData = source ? this.getImageDataFromSource(source) : null;
    return {
      mode: this.mode,
      applyMode: getControl ? this.getApplyMode(getControl) : 'brightness',
      activeSourceId: this.activeSourceId,
      activeSourceType: source?.type ?? null,
      ready: source?.isReady() ?? false,
      error: source?.getError() ?? null,
      width: imageData?.width ?? 0,
      height: imageData?.height ?? 0,
      fitMode: source?.getFitMode() ?? 'fit',
    };
  }

  destroy(): void {
    for (const source of this.sources.values()) {
      source.destroy();
    }
    this.sources.clear();
    this.activeSourceId = null;
    this.engine = null;
  }

  private getImageDataFromSource(source: Source): ImageData | null {
    if ('getImageData' in source && typeof (source as { getImageData: () => ImageData | null }).getImageData === 'function') {
      return (source as { getImageData: () => ImageData | null }).getImageData();
    }
    return null;
  }
}

/** The grid's pixel size for fit calculations, falling back to cell counts when a grid carries none. */
export function targetSizeOf(grid: { cols: number; rows: number; width?: number; height?: number }): [number, number] {
  if (grid.width && grid.height && grid.width > 0 && grid.height > 0) return [grid.width, grid.height];
  return [grid.cols, grid.rows];
}
