# Scene Format

JSON schema for exporting and importing complete ASCII Visual Engine state.

---

## Version

Current format version: **1** (`SCENE_FORMAT_VERSION`)

---

## Document Structure

```typescript
interface AsciiSceneDocument {
  version: number;
  metadata: {
    exportedAt: string;      // ISO 8601
    engineVersion: string;
    name?: string;
    description?: string;
  };
  preset: AsciiPreset;
  renderer: string | null;
  controls: Record<string, number>;
  enabledPlugins: string[];
  enabledMotions: string[];
  enabledSimulations: string[];
  inputMapping: InputMappingConfig;
  audioMapping: AudioMappingConfig;
  glyphSet: string[];
  grid?: GridState;
  camera?: {
    width: number;
    height: number;
    density: number;
  };
}
```

---

## Included State

| Section | Contents |
| --- | --- |
| `preset` | Full preset definition (plugins, patterns, glyph language, etc.) |
| `renderer` | Active renderer id (`canvas`, `dom`, `offscreen-canvas`) |
| `controls` | All known runtime control values |
| `enabledPlugins` | Currently enabled effect/pattern plugins |
| `enabledMotions` | Active motion ids |
| `enabledSimulations` | Active simulation ids |
| `inputMapping` | MIDI/keyboard performance mappings |
| `audioMapping` | Audio reactivity bindings |
| `glyphSet` | Resolved glyph character set |
| `grid` | Optional snapshot of current grid cells |
| `camera` | Viewport width, height, density |

---

## Example

```json
{
  "version": 1,
  "metadata": {
    "exportedAt": "2026-06-28T12:00:00.000Z",
    "engineVersion": "0.1.0",
    "name": "Organic Bloom Session"
  },
  "preset": {
    "id": "glyphOrganicBloom",
    "name": "Glyph — Organic Bloom",
    "glyphSet": [".", "·", "•", "*", "✿"],
    "glyphLanguage": "organicBloom",
    "plugins": [{ "id": "burst", "type": "effect" }],
    "controls": [],
    "density": 1,
    "speed": 0.8,
    "trailAmount": 0.5,
    "glitchAmount": 0.1,
    "motionField": "noise"
  },
  "renderer": "canvas",
  "controls": {
    "density": 1,
    "speed": 0.8,
    "trailAmount": 0.5
  },
  "enabledPlugins": ["burst", "trails"],
  "enabledMotions": ["organicGrowth"],
  "enabledSimulations": [],
  "inputMapping": { "enabled": false },
  "audioMapping": { "enabled": false, "mappings": [] },
  "glyphSet": [".", "·", "•", "*", "✿"],
  "grid": {
    "cols": 80,
    "rows": 40,
    "time": 12.5,
    "width": 800,
    "height": 600,
    "cells": []
  },
  "camera": {
    "width": 800,
    "height": 600,
    "density": 1
  }
}
```

---

## Import / Export

```typescript
import { buildSceneDocument, parseScene, serializeScene } from 'ascii-visual-engine';

// Export
const json = serializeScene(buildSceneDocument(engine));
engine.exportJSON('my-scene');

// Import
engine.importJSON(json);
// or
const doc = parseScene(json);
engine.applySceneDocument(doc);
```

Import applies preset, controls, mappings, renderer, and grid snapshot in order.

---

## Compatibility

- Plain JSON — no binary encoding
- `glyphSet` retained for backward compatibility with legacy presets
- Future versions will increment `version` and support migration
- Grid cell arrays may be large; omit `grid` for preset-only snapshots

---

## API Reference

| Function | Description |
| --- | --- |
| `buildSceneDocument(engine, name?)` | Build document from live engine |
| `serializeScene(doc)` | JSON string |
| `parseScene(json)` | Parse and validate |
| `exportSceneJson(engine)` | Convenience export string |
| `importSceneJson(engine, json)` | Parse and apply |
