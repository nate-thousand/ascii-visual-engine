export { PerformanceManager, QUALITY_PRESETS, resolveQualityPreset, qualityPresetIds } from './PerformanceManager';
export { FrameProfiler } from './FrameProfiler';
export { MemoryProfiler } from './MemoryProfiler';
export { ObjectPool, gridCellPool, eventPayloadPool, createPool, createDefaultGridCell } from './ObjectPool';
export { GlyphCache } from './GlyphCache';
export type { GlyphMetrics, GlyphCacheStats } from './GlyphCache';
export { SpatialGrid } from './SpatialGrid';
export type { SpatialEntity } from './SpatialGrid';
export { DirtyRegionTracker } from './DirtyRegionTracker';
export type { DirtyRegion } from './DirtyRegionTracker';
export { WorkerManager } from './WorkerManager';
export type { WorkerTaskType, WorkerTask } from './WorkerManager';
export { PERFORMANCE_CONTROLS } from './PerformanceTypes';
export { DEFAULT_PERFORMANCE_CONTROLS } from './defaultControls';
export type {
  QualityPresetId,
  QualitySettings,
  FramePhase,
  PhaseTiming,
  FrameSample,
  MemorySnapshot,
  RenderMetrics,
  WorkerStatus,
  PerformanceDebugState,
  PerformanceManagerOptions,
  PerformanceControlName,
} from './PerformanceTypes';
