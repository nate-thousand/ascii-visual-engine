import type { AsciiEngine } from '../core/AsciiEngine';
import type { GridState } from '../core/types';
import type {
  Source,
  SourceContext,
  SourceDebugState,
  SourceMode,
  SourceType,
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

  applyToGrid(
    grid: GridState,
    glyphSet: string[],
    getControl: (name: string, fallback?: number) => number,
  ): boolean {
    const source = this.getActiveSource();
    if (!source || this.mode !== 'source' || !source.isReady()) return false;

    const imageData = this.getImageDataFromSource(source);
    if (!imageData) return false;

    this.sampler.applyToGrid(
      imageData,
      grid,
      grid.cols,
      grid.rows,
      glyphSet,
      source.getFitMode(),
      grid.cols,
      grid.rows,
      getControl('sourceContrast', 1),
      getControl('sourceEdge', 0.3),
      getControl('sourceBlend', 1),
    );
    return true;
  }

  getDebugState(): SourceDebugState {
    const source = this.getActiveSource();
    const imageData = source ? this.getImageDataFromSource(source) : null;
    return {
      mode: this.mode,
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
