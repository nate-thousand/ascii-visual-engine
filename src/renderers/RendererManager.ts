import type { AsciiEngine } from '../core/AsciiEngine';
import type { GridDimensions, GridState } from '../core/types';
import type {
  RenderContext,
  RenderFrame,
  Renderer,
  RendererDebugState,
  RendererId,
  RendererSwitchResult,
} from './Renderer';
import { isOffscreenCanvasSupported } from './OffscreenCanvasRenderer';

export interface RendererManagerOptions {
  canvas: HTMLCanvasElement;
  element?: HTMLElement;
  width: number;
  height: number;
  density: number;
  glyphSet: string[];
  activeId?: RendererId;
}

export class RendererManager {
  private renderers = new Map<RendererId, Renderer>();
  private engine: AsciiEngine | null = null;
  private activeId: RendererId | null = null;
  private lastSwitchWarning: string | null = null;
  private lastRenderMetrics = {
    cellCount: 0,
    drawCalls: 0,
    renderTimeMs: 0,
    partialUpdate: false,
  };

  setEngine(engine: AsciiEngine): void {
    this.engine = engine;
  }

  registerRenderer(renderer: Renderer): void {
    if (this.renderers.has(renderer.id)) {
      throw new Error(`RendererManager: renderer "${renderer.id}" is already registered`);
    }
    this.renderers.set(renderer.id, renderer);
    if (this.engine) {
      renderer.initialize(this.engine);
    }
  }

  unregisterRenderer(id: RendererId): void {
    const renderer = this.renderers.get(id);
    if (!renderer) return;
    if (this.activeId === id) {
      this.activeId = null;
    }
    renderer.destroy();
    this.renderers.delete(id);
  }

  setActiveRenderer(id: RendererId): RendererSwitchResult {
    const renderer = this.renderers.get(id);
    if (!renderer) {
      throw new Error(`RendererManager: unknown renderer "${id}"`);
    }

    const warnings: string[] = [];

    if (!renderer.isAvailable()) {
      const warning = renderer.getSwitchWarning() ?? `Renderer "${id}" is not available.`;
      return { ok: false, warning, activeId: this.activeId };
    }

    const switchWarning = renderer.getSwitchWarning();
    if (switchWarning) {
      warnings.push(switchWarning);
    }

    if (id === 'webgl') {
      const warning =
        renderer.getSwitchWarning() ??
        'WebGL renderer is not yet implemented.';
      return { ok: false, warning, activeId: this.activeId };
    }

    const current = this.getActiveRenderer();
    if (current && current.id !== id) {
      const prevState = current.getGridState(0);
      this.activeId = id;
      renderer.importGridState(prevState);
      if (!renderer.supportsLiveSwitch()) {
        warnings.push(`Live switching to "${renderer.name}" may reset visual output.`);
      }
    } else {
      this.activeId = id;
    }

    this.lastSwitchWarning = warnings.length > 0 ? warnings.join(' ') : null;
    return { ok: true, warning: this.lastSwitchWarning, activeId: this.activeId };
  }

  getActiveRenderer(): Renderer | undefined {
    if (!this.activeId) return undefined;
    return this.renderers.get(this.activeId);
  }

  getRenderer(id: RendererId): Renderer | undefined {
    return this.renderers.get(id);
  }

  getAll(): Renderer[] {
    return Array.from(this.renderers.values());
  }

  getActiveId(): RendererId | null {
    return this.activeId;
  }

  getGridState(time: number): GridState {
    const renderer = this.getActiveRenderer();
    if (!renderer) {
      throw new Error('RendererManager: no active renderer');
    }
    return renderer.getGridState(time);
  }

  getDimensions(): GridDimensions {
    const renderer = this.getActiveRenderer();
    if (!renderer) {
      throw new Error('RendererManager: no active renderer');
    }
    return renderer.getDimensions();
  }

  setDensity(density: number): void {
    this.getActiveRenderer()?.setDensity(density);
  }

  setGlyphSet(glyphSet: string[]): void {
    this.getActiveRenderer()?.setGlyphSet(glyphSet);
  }

  setColor(color: string): void {
    for (const renderer of this.renderers.values()) {
      const withColor = renderer as Renderer & { setColor?: (value: string) => void };
      withColor.setColor?.(color);
    }
  }

  importGridState(state: GridState): void {
    this.getActiveRenderer()?.importGridState(state);
  }

  resize(width: number, height: number): void {
    for (const renderer of this.renderers.values()) {
      renderer.resize(width, height);
    }
  }

  render(frame: RenderFrame, context: RenderContext): void {
    const wrapped: RenderContext = {
      ...context,
      onRenderComplete: (metrics) => {
        this.lastRenderMetrics = {
          cellCount: metrics.cellCount,
          drawCalls: metrics.drawCalls,
          renderTimeMs: metrics.renderTimeMs,
          partialUpdate: metrics.partialUpdate,
        };
        context.onRenderComplete?.(metrics);
      },
    };
    this.getActiveRenderer()?.render(frame, wrapped);
  }

  getDebugState(): RendererDebugState {
    const active = this.getActiveRenderer();
    return {
      activeRendererId: this.activeId,
      activeRendererType: active?.type ?? null,
      activeRendererName: active?.name ?? null,
      available: active?.isAvailable() ?? false,
      supportsLiveSwitch: active?.supportsLiveSwitch() ?? false,
      switchWarning: this.lastSwitchWarning ?? active?.getSwitchWarning() ?? null,
      offscreenSupported: isOffscreenCanvasSupported(),
      cellCount: this.lastRenderMetrics.cellCount,
      drawCalls: this.lastRenderMetrics.drawCalls,
      renderTimeMs: this.lastRenderMetrics.renderTimeMs,
      partialUpdate: this.lastRenderMetrics.partialUpdate,
    };
  }

  destroy(): void {
    for (const renderer of this.renderers.values()) {
      renderer.destroy();
    }
    this.renderers.clear();
    this.activeId = null;
    this.engine = null;
  }
}
