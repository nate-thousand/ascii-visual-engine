# Benchmarks

Automated performance benchmarks run via Vitest in `tests/performance-benchmarks.test.ts`.

## Running benchmarks

```bash
npm test -- tests/performance-benchmarks.test.ts
npm test -- tests/performance-system.test.ts
```

## Scenarios

| Benchmark | Configuration | Validates |
|-----------|---------------|-----------|
| 1k glyphs | density 0.6 | frame time < 500ms |
| 5k glyphs | density 1.0 | frame time < 500ms |
| 10k glyphs | density 1.4 | frame time < 500ms |
| 50k glyphs | density 2.0 | frame time < 500ms |
| Particles | `particleSim` preset, high quality | particle sim runs |
| Multiple sims | chaotic + particle + boids | simulation timing recorded |
| Compositing | compositing preset | layer count > 0 |
| Glyph language | `glyphOrganicBloom` | glyph system active |

## Metrics collected

Each benchmark reads `engine.getDebugState().performance`:

- `frameTimeMs` — total frame duration
- `glyphCount` — cells drawn
- `particleCount` — active simulation particles
- `simulationTimeMs` — simulation phase time
- `layerCount` — compositing layers

## Interpreting results

Benchmark thresholds in CI use generous limits (500ms/frame) to avoid flaky CI on varied hardware. For local tuning:

- Target **< 16ms** frame time for 60 FPS
- Target **< 8ms** for 120 FPS
- Watch `slowestPhase` to identify bottlenecks

## Manual profiling

Use the vanilla demo **Performance Debug** panel and FPS graph:

```bash
npm run dev
```

Compare quality presets (Ultra vs Battery Saver) under the same preset and note FPS, draw calls, and dirty cell counts.

## Adding benchmarks

```typescript
it('benchmark: my scenario', () => {
  const engine = new AsciiEngine({ canvas, preset, autoStart: false });
  // setup
  runFrames(engine, 10);
  expect(engine.getDebugState().performance.frameTimeMs).toBeLessThan(500);
  engine.destroy();
});
```
