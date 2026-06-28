# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] — 2026-06-28

### Added

- Initial framework release
- `AsciiEngine` with lifecycle methods: `start`, `stop`, `destroy`, `resize`
- `CanvasAsciiRenderer` for grid-based ASCII canvas rendering
- Built-in effects: `NoiseField`, `WaveField`, `GlyphBurst`, `Glitch`, `Trails`
- Preset system with `basic`, `terminal`, and `organic` presets
- Runtime controls: density, speed, trail amount, glitch amount
- `EventBus` with typed events: start, stop, preset, control, noteOn, noteOff, resize, frame, custom
- Note API: `noteOn`, `noteOff` for burst and future sustained effects
- Custom event API: `emit` with `custom` event subscription
- ESM + CJS library build via Vite with TypeScript declarations
- Vanilla example with preset selector, sliders, and burst buttons
- Documentation foundation: README, ROADMAP, ARCHITECTURE, API, PLUGIN_API, PRESET_SCHEMA, CONTRIBUTING

### Planned

- Plugin registration API and plugin manager
- Formal renderer abstraction interface
- Input layer (MIDI, touch, keyboard, OSC)
- Audio-reactive utilities
- Test suite and npm publishing

[0.1.0]: https://github.com/example/ascii-visual-engine/releases/tag/v0.1.0
