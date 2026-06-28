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

### Current (v0.1.0)

- `AsciiEngine` with full lifecycle (`start`, `stop`, `destroy`, `resize`)
- `CanvasAsciiRenderer` — grid-based ASCII rendering to HTML canvas
- Built-in effects: `NoiseField`, `WaveField`, `GlyphBurst`, `Glitch`, `Trails`
- Preset system with declarative schema and three built-in presets
- Runtime controls: density, speed, trail amount, glitch amount
- Event bus with typed events (`noteOn`, `noteOff`, `control`, `preset`, `frame`, etc.)
- ESM + CJS library build with TypeScript declarations
- Vanilla example with preset selector, sliders, and burst triggers

### Planned (v0.2 – v0.5)

- Formal plugin registration API and plugin manager
- Custom effect registration at runtime
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
┌─────────────────────────────────────────────────────────┐
│                      AsciiEngine                        │
│  Lifecycle · Controls · Presets · Frame Loop            │
├──────────────┬──────────────┬──────────────┬────────────┤
│   Renderer   │   Effects    │   Presets    │  EventBus  │
│  Canvas 2D   │ Noise · Wave │ basic · term │ noteOn/off │
│  (abstract)  │ Burst · Glitch│ organic    │ control    │
│              │ Trails       │              │ custom     │
└──────────────┴──────────────┴──────────────┴────────────┘
```

| System | Role |
| --- | --- |
| **Core** | Engine lifecycle, frame loop, control state, preset management |
| **Renderer** | Grid creation, glyph drawing, resize, density changes |
| **Plugin Manager** | *(planned)* Registration and lifecycle for custom plugins |
| **Effects** | Per-frame visual modifiers applied to the character grid |
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

### Loading a preset

```typescript
import { terminalPreset, listPresets } from 'ascii-visual-engine';

engine.setPreset(terminalPreset);

// Or select from all built-in presets
const preset = listPresets().find((p) => p.id === 'organic');
if (preset) engine.setPreset(preset);
```

### Changing controls

```typescript
engine.setControl('density', 1.5);
engine.setControl('speed', 0.8);
engine.setControl('trailAmount', 0.6);
engine.setControl('glitchAmount', 0.2);
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
│   ├── effects/        Built-in visual effects
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

Development follows eighteen milestones from foundation through version 1.0:

1. Foundation
2. Rendering Engine
3. Plugin Architecture
4. Motion Systems
5. Visual Effects
6. Preset System
7. Input Layer
8. Audio Reactivity
9. MIDI Integration
10. Touch & Gestures
11. Performance Optimization
12. GPU Rendering Research
13. Shader Pipeline
14. Examples
15. Documentation
16. Testing
17. NPM Publishing
18. Version 1.0

Current overall progress: **~12%**

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
