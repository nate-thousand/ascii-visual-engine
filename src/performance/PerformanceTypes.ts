export type QualityPresetId = 'ultra' | 'high' | 'medium' | 'low' | 'batterySaver';

export type FramePhase =
  | 'script'
  | 'audio'
  | 'input'
  | 'source'
  | 'simulation'
  | 'motion'
  | 'plugins'
  | 'compositing'
  | 'post'
  | 'glyphs'
  | 'render'
  | 'export';

export interface QualitySettings {
  id: QualityPresetId;
  label: string;
  densityScale: number;
  particleScale: number;
  trailScale: number;
  simQuality: number;
  sourceSampleScale: number;
  maxParticleCapacity: number;
  dirtyRendering: boolean;
  spatialGrid: boolean;
  workerOffload: boolean;
  adaptive: boolean;
  fpsTarget: number;
}

export interface PhaseTiming {
  phase: FramePhase;
  durationMs: number;
}

export interface FrameSample {
  timestamp: number;
  totalMs: number;
  fps: number;
  phases: PhaseTiming[];
}

export interface MemorySnapshot {
  estimatedBytes: number;
  gridCells: number;
  particles: number;
  glyphAtlasEntries: number;
  poolAvailable: number;
  poolInUse: number;
}

export interface RenderMetrics {
  cellCount: number;
  glyphCount: number;
  drawCalls: number;
  dirtyCells: number;
  renderTimeMs: number;
  partialUpdate: boolean;
}

export interface WorkerStatus {
  enabled: boolean;
  workerCount: number;
  pendingTasks: number;
  completedTasks: number;
  lastTaskMs: number;
}

export interface PerformanceDebugState {
  fps: number;
  fpsTarget: number;
  frameTimeMs: number;
  cpuFrameTimeMs: number;
  updateTimeMs: number;
  renderTimeMs: number;
  simulationTimeMs: number;
  pluginTimeMs: number;
  glyphCount: number;
  particleCount: number;
  layerCount: number;
  drawCalls: number;
  memory: MemorySnapshot;
  quality: QualityPresetId;
  adaptiveQuality: boolean;
  slowestPhase: FramePhase | null;
  slowestPhaseMs: number;
  fpsHistory: number[];
  phaseTimings: PhaseTiming[];
  render: RenderMetrics;
  workers: WorkerStatus;
  spatialGridEnabled: boolean;
  dirtyRenderingEnabled: boolean;
  audioLatencyMs: number;
  rendererId: string | null;
  sourceMode: string | null;
  glyphAtlasHits: number;
  glyphAtlasMisses: number;
}

export interface PerformanceManagerOptions {
  fpsTarget?: number;
  quality?: QualityPresetId;
  adaptiveQuality?: boolean;
  historySize?: number;
}

export const PERFORMANCE_CONTROLS = [
  'perfQuality',
  'fpsTarget',
  'adaptiveQuality',
  'dirtyRendering',
  'spatialGrid',
  'workerOffload',
] as const;

export type PerformanceControlName = (typeof PERFORMANCE_CONTROLS)[number];
