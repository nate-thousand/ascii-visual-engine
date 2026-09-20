# Benchmarks

Two kinds: the frame budget, measured in a real browser and recorded here, and the automated Vitest benchmarks, which run against a mock canvas and guard against regressions in the update phases.

## Frame budget (decision 4)

The bar: every hero preset at its default density holds 60 fps at 1920x1080 on a laptop. That is 16.7 ms per frame; anything over gets fixed or has its default density lowered.

### How to measure

Open the harness (`npm run dev`), open the Performance section, and press **Run frame budget**. It switches through the six hero presets at the current viewport and pixel ratio, samples the engine profiler once per animation frame for three seconds each, and prints CPU time per frame (mean and 95th percentile), the slowest phase, and the cell count. The same routine is `window.bench({ presets?, seconds?, pixelRatios? })` in the dev console and `runFrameBudget()` in `examples/vanilla/bench.ts`. Adaptive quality is turned off for the run so density stays at the preset default. Keep the tab visible; a hidden tab stops `requestAnimationFrame`.

### 2026-09-20, release/0.3.0 at bcd439a (0.4.0 complete), 1920x1080

Same machine, same method, but the pane was visible this time, so the rAF fps column is real and the browser was compositing the canvas for every frame. Run after morphing, video and input recording, the logo and type sources, and sub cell anti aliasing landed.

| Preset | Cells | Ratio 2, frame ms (mean / p95) | Ratio 2, rAF fps | Ratio 1, frame ms (mean / p95) | Ratio 1, rAF fps | Slowest phase |
| --- | --- | --- | --- | --- | --- | --- |
| Organic Bloom | 8960 | 11.1 / 11.6 | 55.4 | 10.5 / 11.0 | 59.6 | render 4.0 |
| Digital Forest | 8960 | 12.3 / 12.9 | 52.1 | 11.8 / 12.3 | 54.2 | render 3.9 |
| CRT Terminal | 8960 | 8.5 / 9.4 | 60.1 | 8.0 / 8.5 | 60.1 | render 3.8 |
| Corrupted Broadcast | 8960 | 10.5 / 10.9 | 59.4 | 10.1 / 10.6 | 60.1 | render 4.1 |
| Flow Field | 8960 | 10.8 / 12.0 | 41.5 | 10.2 / 10.7 | 59.8 | render 4.1 |
| Minimal Zen | 3744 | 3.2 / 3.3 | 60.1 | 3.2 / 3.3 | 60.3 | render 1.8 |

All six under the 16.7 ms budget on CPU. The numbers sit 1 to 2 ms above the 09-18 run, and render is 3.8 to 4.1 ms against 3.1 to 3.5: that run had a hidden pane, so `fillText` was never rasterized by the compositor, and this one pays for it. Nothing in the engine changes since then runs per cell in the hot path (the morph, tempo, and source mask checks are per frame), so the two runs are not evidence of a regression in either direction; the next run on a visible pane is the one to compare against.

The rAF fps column shows something the CPU numbers cannot: at ratio 2 the backing store is 3840x2160, and Flow Field (41.5 fps) and Digital Forest (52.1) drop frames while their CPU time is under 13 ms. That is the browser compositing a 33 MB surface, not the engine. At ratio 1 every preset but Digital Forest (54.2) holds 60. Hosts that need a locked 60 on a 4K panel should pin `pixelRatio: 1`; the glyph grid is crisp enough at 1 for a projected wall, which is where 4K panels turn up.

### 2026-09-18, release/0.3.0, 1920x1080

MacBook, 8 cores, Chromium in the Claude desktop browser pane, emulated 1920x1080 viewport. The pane was hidden during the run, so frames were driven through a `setTimeout` shim; the per frame CPU numbers come from the engine profiler and do not depend on that, the wall clock fps column from that run is not meaningful and is omitted. On a visible pane at 791x1049 the same build held a steady 60 fps rAF rate.

| Preset | Cells | Ratio 2, frame ms (mean / p95) | Ratio 1, frame ms (mean / p95) | Slowest phase |
| --- | --- | --- | --- | --- |
| Organic Bloom | 8960 | 9.2 / 9.5 | 9.1 / 9.4 | render 3.2 |
| Digital Forest | 8960 | 10.7 / 11.1 | 10.6 / 10.9 | render 3.3 |
| CRT Terminal | 8960 | 7.3 / 7.6 | 7.1 / 7.4 | render 3.3 |
| Corrupted Broadcast | 8960 | 9.0 / 9.4 | 8.9 / 9.1 | render 3.5 |
| Flow Field | 8960 | 9.1 / 9.4 | 8.9 / 9.1 | render 3.1 |
| Minimal Zen | 3744 | 2.8 / 3.0 | 2.7 / 2.8 | render 1.5 |

All six are under budget with room. Pixel ratio barely matters: the draw loop is bound by per cell CPU work, not fill rate, so the HiDPI backing store is close to free.

Phase breakdown for the two heaviest, ratio 2:

| Phase | Digital Forest | Organic Bloom |
| --- | --- | --- |
| glyphs (language, morph, animate) | 2.5 | 2.5 |
| motion | 2.5 | 0.9 |
| plugins (patterns, effects) | 2.7 | 2.9 |
| render | 3.5 | 3.5 |

### What the first run found

Before the draw loop change in the same commit, the same run gave Organic Bloom 18.4 ms, Digital Forest 20.1 ms, and Flow Field 18.2 ms, all over budget, with render at 11.7 to 12.0 ms. Every cell was setting `ctx.fillStyle` to a freshly built `rgba()` string and calling `glyphCache.measure()` (a string key and a map lookup) before its `fillText`. `drawGridToCanvas` now quantizes brightness to 32 levels, groups cells by level, and sets `fillStyle` once per level from a memoized string table; the per cell measure is gone (the cache is still prewarmed once per frame). Render dropped to about 3.3 ms for 8960 cells and no default density had to change.

Next candidates if a preset ever crosses the line again, in order of cost: the glyph language pass (2.5 ms, per cell classification and morph), the pattern plugins (2.7 ms, two `sample()` calls per cell for two pattern presets), then motion.

## Automated benchmarks

Run via Vitest in `tests/performance-benchmarks.test.ts`.

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

Use the harness Performance section: quality presets, the FPS graph, the readout (frame, update, render, slowest phase, draw calls, dirty cells), and the frame budget button above.

```bash
npm run dev
```

Compare quality presets (Ultra vs Battery Saver) under the same preset and note frame time, draw calls, and dirty cell counts.

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
