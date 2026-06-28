# ASCII Visual Engine

A reusable TypeScript framework for building expressive, real-time ASCII visual systems.

---

## Project Overview

ASCII Visual Engine is a portable rendering and animation framework — designed similarly to a game engine or audio engine — that powers ASCII-based visuals in any JavaScript environment. It is **not** a demo. It is **not** tied to any single product or installation. It is a library intended to be imported, extended, and composed into larger creative systems.

Use it to build:

- Interactive installations and performances
- Visual synthesizers and generative instruments
- Creative coding sketches and live visuals
- Interactive art and museum exhibits
- Terminal and CLI visualizations
- Games and playful interfaces
- Data visualizations with character-based aesthetics
- Web experiences and embedded displays

The engine handles grid management, frame timing, effect composition, preset loading, and event dispatch. Your application handles UI, input routing, audio analysis, or whatever domain logic your project requires.

---

## Core Philosophy

| Principle | Description |
| --- | --- |
| **Modular** | Systems are separated into core, renderer, effects, presets, and events. Each can evolve independently. |
| **Plugin based** | Visual behavior is composed from registered plugins and effects rather than monolithic rendering code. |
| **Renderer agnostic** | The engine abstracts rendering behind a renderer interface. Canvas 2D is the first implementation; GPU renderers are planned. |
| **High performance** | Built for real-time animation with `requestAnimationFrame`, efficient grid updates, and a path toward worker and GPU backends. |
| **Framework first** | Optimized for reuse across projects, not for a single demo or product. |
| **Creative coding friendly** | Presets, controls, and events map naturally to knobs, sliders, MIDI, OSC, and generative parameters. |
| **TypeScript first** | Full type exports for consumers, contributors, and plugin authors. |
| **Realtime** | Designed for continuous animation at display refresh rates. |
| **Event driven** | Notes, controls, presets, and custom events flow through a typed event bus. |
| **Portable** | Zero framework dependency. Runs in browsers, bundlers, and any environment with canvas support. |

---

## Features

### Stabilization Pass (in progress)

Before adding new architecture, the current engine is being hardened so presets, sliders, effects, and patterns work together reliably:

- Audited UI → engine → renderer control flow
- Fixed preset control reset on `setPreset()` (controls fully reinitialize from preset)
- Console warnings for unknown controls, plugins, and presets
- `getDebugState()` API for live engine introspection
- Vanilla demo debug panel (preset, effects, patterns, controls, FPS, last noteOn)
- Manual test buttons: Trigger Burst, Max Glitch, Max Trails, Reset Controls
- Exaggerated effect strengths for visible verification (glitch, trails, burst)
- Stronger pattern blending so each pattern looks distinct when enabled
- Trails fade gated on trails plugin enabled state

Run `npm run dev` and use the debug panel + test buttons to verify behavior.

### Current (v0.4.0)

- **Motion system** — `MotionManager` with 12 blendable motion behaviors
- Motions: flowField, organicGrowth, orbital, wave, gravity, brownian, flocking, wind, pulse, breathing, spiral, curlNoise
- Weighted motion blending with priorities — multiple motions run simultaneously
- Motion controls: strength, randomness, frequency, amplitude, decay, drag, gravity, noiseScale, flowStrength, blendWeight
- Six motion presets: Ambient, Organic, Mechanical, Terminal, Chaotic, Minimal
- Motion debug panel in vanilla example (frame time, velocities, active motions)
- Per-cell motion properties: offset, velocity, scale, rotation, deformation

### Previous (v0.3.0)

- `AsciiEngine` with full lifecycle (`start`, `stop`, `destroy`, `resize`)
- **Plugin architecture** — unified `PluginManager` for patterns, effects, inputs, renderers
- `registerPlugin`, `enablePlugin`, `disablePlugin`, `getPlugin` public API
- Built-in effect plugins: `noise`, `wave`, `burst`, `glitch`, `trails`
- Built-in pattern plugins: `radialSymmetry`, `spiral`, `wavePattern`, `grid`, `cellular`, `scanline`
- Preset-driven plugin configuration via `plugins` array
- `CanvasAsciiRenderer` — grid-based ASCII rendering to HTML canvas
- Runtime controls: density, speed, symmetry, petals, spiral/cellular/scanline amount
- Event bus with typed events including `plugin`, `noteOn`, `control`, `preset`, `frame`
- Vanilla example with effect and pattern plugin toggles, debug panel, and manual test buttons

### Planned (v0.4 – v0.5)

- Input plugin adapters (MIDI, keyboard, touch)
- Renderer plugins (WebGL, terminal)
- Image/video sampling patterns for ASCII translation
- Preset validation, loading from JSON, and interpolation
- Color palette support and per-cell color gradients
- React hook (`useAsciiEngine`)
- Audio-reactive helper utilities
- MIDI and OSC input adapters
- OffscreenCanvas / Worker rendering
- Adaptive density and performance monitoring

### Future (v1.0+)

- WebGL / GPU renderer
- Shader pipeline and post-processing
- Multi-layer compositing
- Image-to-ASCII import
- Recording and export (video, GIF)
- Published npm package with semver guarantees
- Comprehensive test suite and CI

See [ROADMAP.md](./ROADMAP.md) for the full milestone plan.

---

## Architecture

The engine is organized into distinct systems:

```
┌──────────────────────────────────────────────────────────────┐
│                        AsciiEngine                           │
│  Lifecycle · Controls · Presets · Patterns · Frame Loop      │
├────────────┬─────────────┬────────────┬────────────┬────────┤
│  Renderer  │  Motions    │  Patterns   │  Effects   │ Presets │
│ Canvas 2D  │ Flow·Wave   │ Radial·Grid │ Burst·Glitch│ ambient │
│            │ Organic·Wind│ Spiral·Scan │ Trails     │ chaotic │
└────────────┴─────────────┴────────────┴────────────┴────────┘
```

| System | Role |
| --- | --- |
| **Core** | Engine lifecycle, frame loop, control state, preset management |
| **Renderer** | Grid creation, glyph drawing, resize, density changes |
| **Plugins** | Unified registration for patterns, effects, inputs, renderers |
| **Patterns** | Procedural forms — flowers, spirals, waves, grids, decay, scanlines |
| **Effects** | Per-frame visual modifiers (motion, glitch, trails, burst) |
| **Motion** | Field generators (`NoiseField`, `WaveField`) that drive glyph selection |
| **Input** | *(planned)* Unified input layer for MIDI, touch, keyboard, OSC |
| **Presets** | Declarative visual configurations (glyphs, effects, defaults) |
| **Events** | Typed pub/sub for notes, controls, frames, and custom payloads |
| **Examples** | Reference integrations (vanilla demo; more planned) |
| **Documentation** | Architecture, API, plugin guide, preset schema, contributing |

Full details: [ARCHITECTURE.md](./ARCHITECTURE.md)

---

## Installation

### As a dependency

```bash
npm install ascii-visual-engine
```

### Development

```bash
git clone <repository-url>
cd ascii-visual-engine
npm install
```

### Build

```bash
npm run build      # Compile TypeScript + bundle to dist/
npm run typecheck  # Type-check without emitting
```

### Run the example

```bash
npm run dev
```

Opens the vanilla example at `http://localhost:5173` with a fullscreen ASCII canvas, preset selector, control sliders, and burst buttons.

---

## Example Usage

### Basic engine creation

```typescript
import { AsciiEngine, basicPreset } from 'ascii-visual-engine';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;

const engine = new AsciiEngine({
  canvas,
  preset: basicPreset,
  width: window.innerWidth,
  height: window.innerHeight,
});
```

### Loading a preset with plugins

```typescript
import { terminalPreset } from 'ascii-visual-engine';

engine.setPreset(terminalPreset);
// Enables plugins declared in preset.plugins:
// noise, burst, glitch, trails, scanline, grid
```

### Toggling plugins live

```typescript
engine.enablePlugin('radialSymmetry');
engine.disablePlugin('glitch');
engine.getPlugin('burst');
```

### Changing controls and patterns

```typescript
engine.setControl('density', 1.5);
engine.setControl('symmetry', 8);
engine.setControl('petals', 7);
engine.setControl('cellularAmount', 0.65);
engine.setControl('scanlineAmount', 0.75);

engine.enablePattern('radialSymmetry');
engine.enablePattern('spiral');
engine.disablePattern('grid');
```

### Handling events

```typescript
engine.on('noteOn', (event) => {
  console.log(`Burst at (${event.x}, ${event.y}) intensity ${event.intensity}`);
});

engine.on('control', ({ name, value }) => {
  console.log(`Control ${name} → ${value}`);
});

engine.on('frame', ({ fps }) => {
  document.title = `ASCII Engine — ${fps} fps`;
});

// Trigger a burst programmatically
engine.noteOn({ x: 0.5, y: 0.5, intensity: 1.2 });

// Custom events
engine.emit({ type: 'scene-change', data: { scene: 'intro' } });
engine.on('custom', (event) => {
  if (event.type === 'scene-change') {
    // handle scene transition
  }
});
```

---

## Repository Structure

```
ascii-visual-engine/
├── src/
│   ├── core/           Engine, event bus, shared types
│   ├── renderers/      Canvas renderer (future: WebGL, terminal)
│   ├── patterns/       Procedural pattern implementations
│   ├── plugins/        Plugin system (manager, typed wrappers)
│   ├── effects/        Effect implementations (wrapped as plugins)
│   ├── presets/        Built-in preset definitions
│   └── index.ts        Public API barrel export
├── examples/
│   └── vanilla/        Standalone browser demo
├── dist/               Compiled library output (generated)
├── README.md           Project overview (this file)
├── ROADMAP.md          Milestone-driven development plan
├── ARCHITECTURE.md     System design and data flow
├── API.md              Public class and interface reference
├── PLUGIN_API.md       Plugin development guide
├── PRESET_SCHEMA.md    Preset format specification
├── CONTRIBUTING.md     Contribution guidelines
├── CHANGELOG.md        Version history
├── LICENSE             MIT license
├── package.json        Package metadata and scripts
├── tsconfig.json       TypeScript configuration
└── vite.config.ts      Build and dev server configuration
```

---

## Roadmap Summary

Development follows nineteen milestones from foundation through version 1.0:

1. Foundation
2. Pattern System
3. Rendering Engine
4. Plugin Architecture
5. Motion Systems
6. Visual Effects
7. Preset System
8. Input Layer
9. Audio Reactivity
10. MIDI Integration
11. Touch & Gestures
12. Performance Optimization
13. GPU Rendering Research
14. Shader Pipeline
15. Examples
16. Documentation
17. Testing
18. NPM Publishing
19. Version 1.0

Current overall progress: **~18%**

See [ROADMAP.md](./ROADMAP.md) for task-level detail and completion status.

---

## Long Term Vision

ASCII Visual Engine aims to become the **ASCII equivalent** of foundational creative libraries:

| Library | Domain | ASCII Visual Engine parallel |
| --- | --- | --- |
| [Tone.js](https://tonejs.github.io/) | Web audio synthesis | Visual synthesis with presets, notes, and real-time parameters |
| [Three.js](https://threejs.org/) | 3D rendering | Character grid rendering with pluggable backends |
| [Matter.js](https://brm.io/matter-js/) | 2D physics | Motion fields and force-driven glyph behavior |
| [PixiJS](https://pixijs.com/) | 2D WebGL rendering | High-performance ASCII rendering pipeline |

The goal is a mature, documented, npm-published framework that any developer can install, extend with plugins, and integrate into installations, instruments, games, and creative tools — without carrying project-specific baggage.

---

## Documentation Index

| Document | Description |
| --- | --- |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Engine design, pipelines, and extension points |
| [API.md](./API.md) | Public class and method reference |
| [PLUGIN_API.md](./PLUGIN_API.md) | How to build custom plugins and effects |
| [PRESET_SCHEMA.md](./PRESET_SCHEMA.md) | Preset format specification with examples |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | Coding standards and pull request guidelines |
| [CHANGELOG.md](./CHANGELOG.md) | Version history |
| [ROADMAP.md](./ROADMAP.md) | Milestone plan and progress |

---

## License

[MIT](./LICENSE)
