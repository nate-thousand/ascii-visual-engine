# Optimization Guide

Practical steps to maximize frame rate while preserving visual quality.

## 1. Choose the right quality preset

Start with **Medium** (default). Use **High** or **Ultra** on capable hardware. Use **Battery Saver** for installations running 24/7.

```typescript
engine.setQualityPreset('medium');
```

Enable adaptive quality to automatically reduce density when FPS drops below target:

```typescript
engine.setControl('adaptiveQuality', 1);
engine.setControl('fpsTarget', 60);
```

## 2. Reduce grid cost

Grid cell count scales with `density`. Each cell is one `fillText` call.

- Lower `density` for large displays
- Disable trails when not needed (trails force full-canvas fade)
- Enable dirty region rendering when trails are off

## 3. Simulation budget

- Limit active simulations — each runs every frame
- Lower `simSpawnRate` and `simStrength` on particle-heavy presets
- Enable spatial grid for boids: `engine.setControl('spatialGrid', 1)`

Quality presets automatically scale particle spawn rates via `particleCapScale`.

## 4. Compositing and layers

Each layer may re-run patterns or simulations. Keep layer count minimal for performance-critical installs.

Check compositing render time:

```typescript
engine.getDebugState().compositing.renderTimeMs;
```

## 5. Glyph language

Procedural glyph languages add a full-grid pass after compositing. Disable when not needed:

```typescript
engine.getGlyphRegistry().disable();
```

Glyph cache reduces `measureText` overhead for Unicode-heavy glyph sets.

## 6. Source pipeline

Video/webcam sources add sampling cost. Lower source resolution or use `sourceSampleScale` via quality presets.

## 7. Profiling workflow

1. Open demo → **Performance Debug** panel
2. Note `slowestPhase` each second
3. If `render` — reduce density, enable dirty rendering
4. If `simulation` — disable sims or lower spawn rate
5. If `glyphs` — simplify glyph language
6. If `compositing` — reduce layers

## 8. Memory

Grid cells use object pooling — avoid frequent density oscillation that triggers grid rebuilds.

Monitor:

```typescript
const mem = engine.getDebugState().performance.memory;
console.log(mem.estimatedBytes, mem.poolAvailable);
```

## 9. Workers

Enable worker offload for export-heavy workflows:

```typescript
engine.setControl('workerOffload', 1);
```

Rendering always stays on the main thread.

## 10. Target budgets

| Target | Frame budget | Typical density |
|--------|--------------|-----------------|
| 60 FPS | 16.6 ms | 0.8–1.2 |
| 120 FPS | 8.3 ms | 0.6–1.0 |
| 30 FPS (installations) | 33 ms | 1.0–1.5 |

Use the FPS graph in the demo to verify sustained performance over 30+ seconds.

## Future: GPU rendering

Milestone 15 targets WebGL/GPU rendering for further gains. Current optimizations are CPU-first and remain compatible with future GPU paths.
