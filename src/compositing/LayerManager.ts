import type { AsciiEngine } from '../core/AsciiEngine';
import type { GridCell, GridState } from '../core/types';
import type { SimulationContext } from '../simulation/Simulation';
import type { PluginContext } from '../plugins/Plugin';
import { isPatternPlugin } from '../plugins';
import { clamp01 } from './BlendModes';
import { compositeCell } from './BlendModes';
import { Layer, type LayerConfig } from './Layer';

export interface CompositingContext {
  engine: AsciiEngine;
  baseGrid: GridState;
  targetGrid: GridState;
  glyphSet: string[];
  time: number;
  dt: number;
  getControl: (name: string, fallback?: number) => number;
}

export interface LayerDebugInfo {
  id: string;
  name: string;
  enabled: boolean;
  opacity: number;
  blendMode: string;
  order: number;
}

export interface LayerManagerDebugState {
  layerCount: number;
  enabledCount: number;
  layers: LayerDebugInfo[];
  compositingActive: boolean;
  renderTimeMs: number;
}

export class LayerManager {
  private layers: Layer[] = [];
  private lastRenderTimeMs = 0;

  setEngine(_engine: AsciiEngine): void {
  }

  addLayer(config: LayerConfig): Layer {
    if (this.layers.some((l) => l.id === config.id)) {
      throw new Error(`LayerManager: layer "${config.id}" already exists`);
    }
    const layer = new Layer(config);
    this.layers.push(layer);
    return layer;
  }

  removeLayer(id: string): void {
    this.layers = this.layers.filter((l) => l.id !== id);
  }

  enableLayer(id: string): void {
    const layer = this.getLayer(id);
    if (layer) layer.enabled = true;
  }

  disableLayer(id: string): void {
    const layer = this.getLayer(id);
    if (layer) layer.enabled = false;
  }

  reorderLayer(id: string, newIndex: number): void {
    const idx = this.layers.findIndex((l) => l.id === id);
    if (idx < 0) return;
    const [layer] = this.layers.splice(idx, 1);
    const clamped = Math.max(0, Math.min(this.layers.length, newIndex));
    this.layers.splice(clamped, 0, layer);
  }

  getLayer(id: string): Layer | undefined {
    return this.layers.find((l) => l.id === id);
  }

  getAll(): Layer[] {
    return [...this.layers];
  }

  getEnabled(): Layer[] {
    return this.layers.filter((l) => l.enabled);
  }

  clear(): void {
    this.layers = [];
  }

  setFromPreset(configs: LayerConfig[]): void {
    this.clear();
    for (const config of configs) {
      this.addLayer(config);
    }
  }

  isCompositingActive(): boolean {
    return this.getEnabled().length > 0;
  }

  renderLayers(context: CompositingContext): void {
    const start = performance.now();
    const { baseGrid, targetGrid, glyphSet } = context;
    const enabled = this.getEnabled();
    if (enabled.length === 0) {
      this.lastRenderTimeMs = 0;
      return;
    }

    const composite: GridCell[] = baseGrid.cells.map((c) => ({ ...c }));

    for (const layer of enabled) {
      layer.ensureSize(baseGrid);
      this.renderLayerContent(layer, context);
      const layerGlyphSet = layer.glyphSet ?? glyphSet;

      for (let i = 0; i < composite.length; i++) {
        const cell = composite[i];
        const src = layer.getCells()[i];
        if (!src) continue;
        const mask = layer.mask.sample(cell.x, cell.y, baseGrid, src.brightness);
        compositeCell(layer.blendMode, cell, src, layer.opacity, mask, layerGlyphSet);
      }
    }

    for (let i = 0; i < targetGrid.cells.length; i++) {
      Object.assign(targetGrid.cells[i], composite[i]);
    }

    this.lastRenderTimeMs = performance.now() - start;
  }

  getDebugState(): LayerManagerDebugState {
    return {
      layerCount: this.layers.length,
      enabledCount: this.getEnabled().length,
      layers: this.layers.map((l, order) => ({
        id: l.id,
        name: l.name,
        enabled: l.enabled,
        opacity: l.opacity,
        blendMode: l.blendMode,
        order,
      })),
      compositingActive: this.isCompositingActive(),
      renderTimeMs: this.lastRenderTimeMs,
    };
  }

  destroy(): void {
    this.layers = [];
  }

  private renderLayerContent(layer: Layer, context: CompositingContext): void {
    const { engine, baseGrid, glyphSet, dt, time, getControl } = context;
    const layerGlyphSet = layer.glyphSet ?? glyphSet;
    layer.clear();

    if (layer.fill !== null) {
      layer.applyFill(layer.fill, layerGlyphSet);
      return;
    }

    if (layer.simulation && engine) {
      const sim = engine.getSimulationManager().getSimulation(layer.simulation);
      if (sim) {
        const wasEnabled = sim.enabled;
        sim.enabled = true;
        const simCtx: SimulationContext = {
          engine,
          grid: { ...baseGrid, cells: layer.getCells() },
          glyphSet: layerGlyphSet,
          time,
          dt,
          cols: baseGrid.cols,
          rows: baseGrid.rows,
          cellCount: layer.getCells().length,
          getControl,
        };
        sim.update(dt, simCtx);
        sim.enabled = wasEnabled;
        return;
      }
    }

    if (layer.pattern && engine) {
      layer.copyFrom(baseGrid);
      const plugin = engine.getPluginManager().get(layer.pattern);
      if (plugin && isPatternPlugin(plugin)) {
        const pluginCtx: PluginContext = {
          engine,
          grid: { ...baseGrid, cells: layer.getCells() },
          glyphSet: layerGlyphSet,
          time,
          dt,
          speed: getControl('speed', 1),
          glitchAmount: getControl('glitchAmount', 0.1),
          trailAmount: getControl('trailAmount', 0.3),
          getControl,
        };
        const { cols, rows } = baseGrid;
        for (const cell of layer.getCells()) {
          const nx = cell.x / Math.max(cols - 1, 1);
          const ny = cell.y / Math.max(rows - 1, 1);
          const value = plugin.sample(nx, ny, pluginCtx);
          cell.brightness = clamp01(value);
          const index = Math.floor(cell.brightness * (layerGlyphSet.length - 1));
          cell.char = layerGlyphSet[Math.max(0, Math.min(layerGlyphSet.length - 1, index))];
        }
        return;
      }
    }

    if (layer.source && engine) {
      engine.getSourceManager().applyToGrid(
        { ...baseGrid, cells: layer.getCells() },
        layerGlyphSet,
        getControl,
      );
      return;
    }

    const pulse = 0.5 + 0.5 * Math.sin(time * 2 + layer.id.length);
    layer.applyFill(pulse * (layer.opacity || 1), layerGlyphSet);
  }
}
