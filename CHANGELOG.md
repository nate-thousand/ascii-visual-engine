# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] — Unreleased

### Added

- Plugin architecture with `PluginManager` and unified `Plugin` interface
- Plugin types: pattern, effect, input, renderer, utility
- `EffectPlugin` and `PatternPlugin` typed wrappers
- Engine API: `registerPlugin`, `unregisterPlugin`, `enablePlugin`, `disablePlugin`, `getPlugin`
- Preset `plugins` array for declarative plugin configuration
- `resolvePresetPlugins()` for legacy preset migration
- `plugin` event on enable/disable
- Vanilla example: separate effect and pattern plugin toggles

### Changed

- AsciiEngine orchestrates frame loop through PluginManager
- Built-in effects and patterns registered as plugins at startup
- Wave pattern plugin id is `wavePattern` (distinct from `wave` effect)

## [0.2.0] — Unreleased

### Added

- Pattern system with `Pattern` interface and `PatternRegistry`
- Built-in patterns: `RadialSymmetry`, `Spiral`, `Wave`, `Grid`, `Cellular`, `Scanline`
- Engine pattern API: `registerPattern`, `unregisterPattern`, `enablePattern`, `disablePattern`, `getPattern`
- Preset `patterns` array for declarative pattern configuration
- Pattern controls: symmetry, petals, spiralAmount, cellularAmount, scanlineAmount
- Pattern selector and controls in vanilla example
- `pattern` event on enable/disable

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
