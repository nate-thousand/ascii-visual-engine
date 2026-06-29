import type { AsciiEngine } from '../core/AsciiEngine';
import { DirtyRegionTracker } from './DirtyRegionTracker';
import { FrameProfiler } from './FrameProfiler';
import { GlyphCache } from './GlyphCache';
import { MemoryProfiler } from './MemoryProfiler';
import { gridCellPool, eventPayloadPool, type ObjectPool } from './ObjectPool';
import { QUALITY_PRESETS, resolveQualityPreset } from './QualityPresets';
import { SpatialGrid } from './SpatialGrid';
import { WorkerManager } from './WorkerManager';
import type {
  FramePhase,
  PerformanceDebugState,
  PerformanceManagerOptions,
  QualityPresetId,
  RenderMetrics,
} from './PerformanceTypes';

export class PerformanceManager {
  private engine: AsciiEngine | null = null;
  private profiler = new FrameProfiler();
  private memoryProfiler = new MemoryProfiler();
  private glyphCache = new GlyphCache();
  private dirtyTracker = new DirtyRegionTracker();
  private spatialGrid = new SpatialGrid(32, 32, 1 / 32);
  private workerManager = new WorkerManager();

  private quality: QualityPresetId = 'medium';
  private adaptiveQuality = true;
  private fpsTarget = 60;
  private instantFps = 0;
  private lastRenderMetrics: RenderMetrics = {
    cellCount: 0,
    glyphCount: 0,
    drawCalls: 0,
    dirtyCells: 0,
    renderTimeMs: 0,
    partialUpdate: false,
  };
  private baseDensity = 1;
  private audioLatencyMs = 0;
  private adaptiveCooldown = 0;

  constructor(options: PerformanceManagerOptions = {}) {
    if (options.quality) this.quality = options.quality;
    if (options.adaptiveQuality != null) this.adaptiveQuality = options.adaptiveQuality;
    if (options.fpsTarget != null) this.fpsTarget = options.fpsTarget;
    if (options.historySize != null) {
      this.profiler = new FrameProfiler(options.historySize);
    }
  }

  setEngine(engine: AsciiEngine): void {
    this.engine = engine;
    this.baseDensity = engine.getControl('density', 1);
    this.applyQualityPreset(this.quality, false);
  }

  destroy(): void {
    this.workerManager.destroy();
    this.glyphCache.clear();
    this.dirtyTracker.setEnabled(false);
    this.engine = null;
  }

  // --- Frame lifecycle ---

  beginFrame(_now: number, _dt: number): void {
    this.profiler.beginFrame(performance.now());
  }

  markPhase(phase: FramePhase): void {
    this.profiler.markPhase(phase);
  }

  endFrame(fps: number): void {
    this.instantFps = fps;
    this.profiler.endFrame(fps);
    this.runAdaptiveQuality(fps);
    this.adaptiveCooldown = Math.max(0, this.adaptiveCooldown - 1);
  }

  setFps(fps: number): void {
    this.instantFps = fps;
  }

  // --- Quality ---

  applyQualityPreset(id: QualityPresetId, adjustControls = true): void {
    this.quality = id;
    const settings = resolveQualityPreset(id);
    this.fpsTarget = settings.fpsTarget;
    this.adaptiveQuality = settings.adaptive;
    this.dirtyTracker.setEnabled(settings.dirtyRendering);
    this.spatialGrid.clear();

    if (settings.workerOffload) {
      this.workerManager.setEnabled(true);
      this.workerManager.init(2);
    } else {
      this.workerManager.setEnabled(false);
    }

    if (adjustControls && this.engine) {
      const density = this.baseDensity * settings.densityScale;
      this.engine.setControl('density', density);
      const trail = this.engine.getControl('trailAmount', 0.3) * settings.trailScale;
      this.engine.setControl('trailAmount', Math.min(1, trail));
      const spawn = this.engine.getControl('simSpawnRate', 0.5) * settings.particleScale;
      this.engine.setControl('simSpawnRate', Math.min(1, spawn));
    }
  }

  getQualityPreset(): QualityPresetId {
    return this.quality;
  }

  getQualitySettings() {
    return resolveQualityPreset(this.quality);
  }

  setAdaptiveQuality(enabled: boolean): void {
    this.adaptiveQuality = enabled;
  }

  setFpsTarget(target: number): void {
    this.fpsTarget = target;
  }

  setBaseDensity(density: number): void {
    this.baseDensity = density;
  }

  // --- Accessors for subsystems ---

  getGlyphCache(): GlyphCache {
    return this.glyphCache;
  }

  getDirtyTracker(): DirtyRegionTracker {
    return this.dirtyTracker;
  }

  getSpatialGrid(): SpatialGrid {
    return this.spatialGrid;
  }

  getWorkerManager(): WorkerManager {
    return this.workerManager;
  }

  isSpatialGridEnabled(): boolean {
    return resolveQualityPreset(this.quality).spatialGrid;
  }

  isDirtyRenderingEnabled(): boolean {
    return this.dirtyTracker.isEnabled();
  }

  getParticleCapacityScale(): number {
    return resolveQualityPreset(this.quality).particleScale;
  }

  getMaxParticleCapacity(): number {
    return resolveQualityPreset(this.quality).maxParticleCapacity;
  }

  getSimQualityScale(): number {
    return resolveQualityPreset(this.quality).simQuality;
  }

  setRenderMetrics(metrics: Partial<RenderMetrics>): void {
    Object.assign(this.lastRenderMetrics, metrics);
  }

  setAudioLatencyMs(ms: number): void {
    this.audioLatencyMs = ms;
  }

  trackGridChanges(cells: import('../core/types').GridCell[]): void {
    this.dirtyTracker.trackChanges(cells);
  }

  getProfilerLastTotalMs(): number {
    return this.profiler.getLastTotalMs();
  }

  // --- Debug ---

  getDebugState(): PerformanceDebugState {
    const engine = this.engine;
    const phases = this.profiler.getPhaseTimings();
    const slowest = this.profiler.getSlowestPhase();
    const simMs = this.profiler.sumPhaseMs('simulation');
    const pluginMs = this.profiler.sumPhaseMs('plugins', 'motion');
    const updateMs = this.profiler.sumPhaseMs(
      'script',
      'audio',
      'input',
      'source',
      'simulation',
      'motion',
      'plugins',
      'compositing',
      'post',
      'glyphs',
    );

    let gridCells = 0;
    let particles = 0;
    let layers = 0;
    let glyphAtlas = 0;
    let simMemory = 0;
    let rendererId: string | null = null;
    let sourceMode: string | null = null;

    if (engine) {
      try {
        gridCells = engine.getGridState().cells.length;
      } catch {
        gridCells = 0;
      }
      particles = engine.getSimulationManager().getDebugState().totalParticles;
      layers = engine.getLayerManager().getDebugState().layerCount;
      const glyphDebug = engine.getGlyphRegistry().getDebugState();
      glyphAtlas = glyphDebug.atlasHits + glyphDebug.glyphCount;
      simMemory = engine.getSimulationManager().getDebugState().totalMemoryBytes;
      rendererId = engine.getRendererManager().getDebugState().activeRendererId;
      sourceMode = engine.getSourceManager().getDebugState().mode;
    }

    const pools = [gridCellPool, eventPayloadPool] as ObjectPool<unknown>[];
    const memory = this.memoryProfiler.sample({
      gridCellCount: gridCells,
      particleCount: particles,
      glyphAtlasEntries: glyphAtlas,
      simulationMemoryBytes: simMemory,
      pools,
    });

    const glyphCacheStats = this.glyphCache.getStats();

    return {
      fps: this.instantFps,
      fpsTarget: this.fpsTarget,
      frameTimeMs: this.profiler.getLastTotalMs(),
      cpuFrameTimeMs: this.profiler.getLastTotalMs(),
      updateTimeMs: updateMs,
      renderTimeMs: this.lastRenderMetrics.renderTimeMs,
      simulationTimeMs: simMs,
      pluginTimeMs: pluginMs,
      glyphCount: this.lastRenderMetrics.glyphCount || gridCells,
      particleCount: particles,
      layerCount: layers,
      drawCalls: this.lastRenderMetrics.drawCalls,
      memory,
      quality: this.quality,
      adaptiveQuality: this.adaptiveQuality,
      slowestPhase: slowest.phase,
      slowestPhaseMs: slowest.ms,
      fpsHistory: this.profiler.getFpsHistory(),
      phaseTimings: phases,
      render: { ...this.lastRenderMetrics },
      workers: this.workerManager.getStatus(),
      spatialGridEnabled: this.isSpatialGridEnabled(),
      dirtyRenderingEnabled: this.isDirtyRenderingEnabled(),
      audioLatencyMs: this.audioLatencyMs,
      rendererId,
      sourceMode,
      glyphAtlasHits: glyphCacheStats.hits,
      glyphAtlasMisses: glyphCacheStats.misses,
    };
  }

  listQualityPresets(): QualityPresetId[] {
    return Object.keys(QUALITY_PRESETS) as QualityPresetId[];
  }

  private runAdaptiveQuality(fps: number): void {
    if (!this.adaptiveQuality || !this.engine || this.adaptiveCooldown > 0) return;
    const settings = resolveQualityPreset(this.quality);
    if (!settings.adaptive) return;

    const target = this.fpsTarget;
    const currentDensity = this.engine.getControl('density', this.baseDensity);

    if (fps < target * 0.85 && currentDensity > 0.3) {
      this.engine.setControl('density', Math.max(0.3, currentDensity * 0.95));
      this.adaptiveCooldown = 30;
    } else if (fps > target * 1.1 && currentDensity < this.baseDensity * settings.densityScale) {
      this.engine.setControl('density', Math.min(this.baseDensity * settings.densityScale, currentDensity * 1.02));
      this.adaptiveCooldown = 60;
    }
  }
}

export { QUALITY_PRESETS, resolveQualityPreset, qualityPresetIds } from './QualityPresets';
