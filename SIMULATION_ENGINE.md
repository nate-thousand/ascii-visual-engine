# Simulation Engine

Emergent behavior systems that drive ASCII visuals independently from rendering.

Simulations maintain their own state, update each frame, and stamp results onto the grid. The renderer pipeline draws whatever the grid contains — simulations never call canvas or DOM APIs directly.

---

## Overview

```
Preset simulations[]
        │
        ▼
SimulationManager.update()
        │
        ├── ParticleSimulation
        ├── BoidsSimulation
        ├── CellularAutomataSimulation
        ├── ReactionDiffusionSimulation
        ├── LSystemSimulation
        ├── GravitySimulation
        ├── SpringSimulation
        └── FluidSimulation
        │
        ▼
Grid cells (char, brightness, phase)
        │
        ▼
Patterns → Effects → Renderer
```

---

## Simulation Interface

```typescript
interface Simulation {
  readonly id: string;
  readonly name: string;
  enabled: boolean;
  initialize(engine: AsciiEngine): void;
  update(deltaTime: number, context: SimulationContext): void;
  reset(): void;
  destroy(): void;
  getParticleCount(): number;
  getMemoryBytes(): number;
}
```

### SimulationContext

```typescript
interface SimulationContext {
  engine: AsciiEngine;
  grid: GridState;
  glyphSet: string[];
  time: number;
  dt: number;
  cols: number;
  rows: number;
  cellCount: number;
  getControl: (name: string, fallback?: number) => number;
}
```

---

## Built-in Simulations

| Id | Class | Behavior |
| --- | --- | --- |
| `particle` | `ParticleSimulation` | Spawned particles with velocity, acceleration, lifespan, glyph assignment |
| `boids` | `BoidsSimulation` | Flocking with alignment, cohesion, separation, predator avoidance |
| `cellularAutomata` | `CellularAutomataSimulation` | Custom growth/decay rules, organic regeneration |
| `reactionDiffusion` | `ReactionDiffusionSimulation` | Gray-Scott chemical patterns — coral, lichen, mold textures |
| `lsystem` | `LSystemSimulation` | Grammar-based branching — trees, vines, ferns |
| `gravity` | `GravitySimulation` | Attractors, repulsors, orbital body motion |
| `spring` | `SpringSimulation` | Mass-spring network with pinned nodes — cloth-like motion |
| `fluid` | `FluidSimulation` | Simple velocity field for smoke, fog, flowing ASCII |

Multiple simulations can run simultaneously. Each enabled simulation receives `update()` every frame.

---

## SimulationManager

```typescript
const manager = engine.getSimulationManager();

manager.registerSimulation(customSim);
manager.enableSimulation('particle');
manager.disableSimulation('boids');
manager.getSimulation('reactionDiffusion');
manager.update(dt, context);
manager.resetAll();
manager.destroy();
```

### AsciiEngine API

| Method | Description |
| --- | --- |
| `getSimulationManager()` | Direct manager access |
| `registerSimulation(sim)` | Register custom simulation |
| `enableSimulation(id)` / `disableSimulation(id)` | Toggle simulation |
| `getSimulation(id)` | Lookup by id |
| `getEnabledSimulations()` | List enabled simulations |

---

## Simulation Controls

| Control | Default | Description |
| --- | --- | --- |
| `simStrength` | `0.8` | Output intensity |
| `simSpeed` | `1` | Simulation time scale |
| `simDensity` | `0.5` | Density/spawn threshold |
| `simDecay` | `0.2` | Decay and damping |
| `simSpawnRate` | `0.6` | Emission rate for particle/fluid sims |

```typescript
engine.setControl('simStrength', 0.9);
engine.setControl('simSpawnRate', 0.8);
```

---

## Preset Configuration

```typescript
const preset: AsciiPreset = {
  id: 'reactionDiffusionSim',
  name: 'Reaction Diffusion',
  glyphSet: ['.', ':', '-', '~', '≈', '∿', '◦', '○'],
  motionField: 'none',
  plugins: [{ id: 'trails', type: 'effect' }],
  simulations: [
    { id: 'reactionDiffusion' },
    { id: 'particle', enabled: false },
  ],
  controls: [],
  density: 1,
  speed: 1,
  trailAmount: 0.4,
  glitchAmount: 0.1,
  simStrength: 0.85,
  simSpeed: 0.8,
};
```

Built-in simulation presets: `particleSim`, `reactionDiffusionSim`, `lsystemSim`.

---

## Frame Pipeline Integration

When simulations are enabled and source mode is inactive:

1. `SimulationManager.update()` runs all enabled simulations
2. Simulations stamp grid cells directly
3. Patterns and effects apply on top
4. Renderer draws the result

When source mode is active, simulations are skipped (source drives the base layer).

When simulations are disabled, procedural motion/effects behave exactly as before.

---

## Debug State

```typescript
const { simulation } = engine.getDebugState();
// activeSimulations, totalParticles, totalMemoryBytes, updateTimeMs, fps
```

The vanilla example includes a **Simulation Debug** panel showing active simulations, particle counts, memory usage, and per-simulation update times.

---

## Performance

- Pre-allocated `Float32Array` / `Uint8Array` buffers — no per-frame allocations in update loops
- Fixed-capacity particle pools (`ParticleSimulation`)
- Reused grid stamping utilities (`stampCell`, `stampDisc`)
- Per-simulation update timing tracked in debug state

---

## Custom Simulations

```typescript
import type { Simulation, SimulationContext } from 'ascii-visual-engine';

class MySimulation implements Simulation {
  readonly id = 'mySim';
  readonly name = 'My Simulation';
  enabled = false;

  initialize(_engine) {}
  update(dt: number, ctx: SimulationContext) {
    // modify ctx.grid.cells or maintain internal state
  }
  reset() {}
  destroy() {}
  getParticleCount() { return 0; }
  getMemoryBytes() { return 0; }
}

engine.registerSimulation(new MySimulation());
engine.enableSimulation('mySim');
```

---

## See Also

- [MOTION_SYSTEM.md](./MOTION_SYSTEM.md) — procedural motion (alternative base layer)
- [SOURCE_PIPELINE.md](./SOURCE_PIPELINE.md) — external visual input
- [RENDERER_PIPELINE.md](./RENDERER_PIPELINE.md) — output backends
- [API.md](./API.md) — SimulationManager reference
