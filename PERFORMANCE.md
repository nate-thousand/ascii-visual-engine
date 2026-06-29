# Performance System

ASCII Visual Engine includes a CPU-first performance subsystem for profiling, memory optimization, adaptive quality, and scalable rendering — without GPU acceleration.

## Architecture

| Module | Role |
|--------|------|
| `PerformanceManager` | Central orchestration, quality presets, adaptive density |
| `FrameProfiler` | Per-phase frame timing (script → render) |
| `MemoryProfiler` | Estimated memory from grid, particles, pools |
| `ObjectPool` | Reusable grid cells, event payloads |
| `GlyphCache` | Cached `measureText` / glyph metrics |
| `DirtyRegionTracker` | Partial canvas redraw for changed cells |
| `SpatialGrid` | Spatial partitioning for boids/particles |
| `WorkerManager` | Optional Web Worker offload (export, image processing) |

## Quality presets

| Preset | Density | Particles | Dirty render | Spatial grid | FPS target |
|--------|---------|-----------|--------------|--------------|------------|
| Ultra | 1.5× | 1.5× | ✓ | ✓ | 120 |
| High | 1.2× | 1.2× | ✓ | ✓ | 60 |
| Medium | 1× | 1× | ✓ | — | 60 (adaptive) |
| Low | 0.75× | 0.6× | — | — | 45 (adaptive) |
| Battery Saver | 0.5× | 0.3× | — | — | 30 (adaptive) |

```typescript
engine.setQualityPreset('high');
engine.getPerformanceManager().setAdaptiveQuality(true);
engine.setControl('fpsTarget', 60);
```

## Frame profiling

Each tick records phases:

`script` → `audio` → `input` → `source` → `simulation` / `motion` → `plugins` → `compositing` → `post` → `glyphs` → `render` → `export`

```typescript
const perf = engine.getDebugState().performance;
console.log(perf.slowestPhase, perf.slowestPhaseMs);
console.log(perf.phaseTimings);
```

## Dirty region rendering

When trails are off and dirty rendering is enabled, only changed grid cells are cleared and redrawn. Toggle via:

```typescript
engine.setControl('dirtyRendering', 1);
// or
engine.getPerformanceManager().getDirtyTracker().setEnabled(true);
```

## Object pooling

Grid cells are acquired from `gridCellPool` on grid rebuild instead of allocating new objects each resize/density change.

## Spatial grid

When enabled, boids use neighborhood queries via uniform grid instead of O(n²) all-pairs checks:

```typescript
engine.setControl('spatialGrid', 1);
engine.enableSimulation('boids');
```

## Workers

Optional worker offload for export and image processing tasks. Falls back to synchronous execution when workers are unavailable.

```typescript
engine.setControl('workerOffload', 1);
engine.getPerformanceManager().getWorkerManager().submit('export', data);
```

## Debug state

`engine.getDebugState().performance` includes:

- FPS, frame/update/render/simulation timing
- Glyph, particle, layer counts
- Draw calls, dirty cell count
- Memory estimate, pool stats
- Worker status, audio latency
- FPS history for graphs

## See also

- [BENCHMARKS.md](./BENCHMARKS.md)
- [OPTIMIZATION_GUIDE.md](./OPTIMIZATION_GUIDE.md)
