# Integration Guide

How to consume ASCII Visual Engine from an external project (Plantasonic, prototypes, etc.).

---

## Basic Functionality Contract

These tiers define what v0.1.x guarantees vs. what is still experimental.

| Tier | Guaranteed | Verified by |
| --- | --- | --- |
| **Core** | Construct → load preset → animate on canvas → `setControl` / `noteOn` → `destroy` | Unit + integration tests |
| **Integration** | Import from built `dist/` bundle in a second project | `tests/consumer-smoke.test.ts` (run via `npm run test:all`) |
| **Visual baseline** | Core presets produce stable grid output | `tests/visual-snapshot.test.ts` |
| **Experimental** | WebGL renderer, worker offload, MP4/WebM/PDF export | Not integration-ready |

---

## Quick start (~30 lines)

```bash
# In ascii-visual-engine/
npm run build
npm link

# In your project
npm link ascii-visual-engine
```

```typescript
import { AsciiEngine, getPreset } from 'ascii-visual-engine';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;

const engine = new AsciiEngine({
  canvas,
  preset: getPreset('basic'),
  width: window.innerWidth,
  height: window.innerHeight,
});

engine.on('frame', ({ fps }) => {
  // optional telemetry
  console.debug('fps', fps);
});

engine.setControl('speed', 0.8);
engine.noteOn({ x: 0.5, y: 0.5, intensity: 1 });

window.addEventListener('resize', () => {
  engine.resize(window.innerWidth, window.innerHeight);
});

// when done
engine.destroy();
```

TypeScript types ship with the package — no separate `@types` package.

---

## Minimum integration path

If you only need **load preset → animate → respond to input**, you need:

1. A `<canvas>` element
2. `AsciiEngine` + one preset from `getPreset()` or `listPresets()`
3. Optional: `engine.setControl()` for sliders
4. Optional: `engine.noteOn()` for touch/click/MIDI-mapped events
5. `engine.destroy()` on teardown

You do **not** need to import motion, simulation, scripting, or performance subsystems directly — presets configure those through the engine.

---

## Presets

```typescript
import { getPreset, listPresets, type PresetId } from 'ascii-visual-engine';

const ids = listPresets().map((p) => p.id);
const ambient = getPreset('ambient');
engine.setPreset(ambient);
engine.setPresetById('terminal');
```

Custom presets must satisfy the schema in [PRESET_SCHEMA.md](./PRESET_SCHEMA.md). Invalid presets throw at load time:

```typescript
import { validatePreset } from 'ascii-visual-engine';

const result = validatePreset(myPreset);
if (!result.ok) console.error(result.errors);
```

---

## Audio reactivity (optional)

```typescript
await engine.connectAudio(); // mic or system audio — requires user gesture
engine.setControl('audioSensitivity', 0.8);
```

See [AUDIO_REACTIVITY.md](./AUDIO_REACTIVITY.md) for mapping presets.

---

## MIDI & keyboard (optional)

```typescript
await engine.connectMidi();
engine.enableMidiLearn(true);
```

See [MIDI_AND_INPUT.md](./MIDI_AND_INPUT.md).

---

## Build artifacts

After `npm run build`:

| File | Format |
| --- | --- |
| `dist/ascii-visual-engine.js` | ESM |
| `dist/ascii-visual-engine.cjs` | CommonJS |
| `dist/index.d.ts` | TypeScript declarations |

---

## Verification before shipping your integration

Run the full verification suite in this repo:

```bash
npm run test:all
```

This builds the library and runs all tests, including the consumer smoke test that imports from `dist/`.

---

## Experimental APIs (use with caution)

| API | Status |
| --- | --- |
| `WebGLRendererStub` | Interface only — no GPU draw path |
| `WorkerManager` / `workerOffload` control | Infrastructure stub; sync fallback is identity |
| `futureFormatPlaceholder('mp4' \| 'webm' \| 'pdf')` | Returns error — not implemented |
| Script hot reload | Dev/demo convenience only |

These are exported for forward compatibility but are **not** part of the basic functionality contract.

---

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Blank canvas | `autoStart` defaults to true; verify canvas size and preset plugins enabled |
| `Invalid preset` error | Run `validatePreset()` — see [PRESET_SCHEMA.md](./PRESET_SCHEMA.md) |
| Types not found | Import from package root; ensure `dist/index.d.ts` exists after build |
| Works in dev, fails in consumer | Run `npm run build` and `npm run test:all` — consumer must use `dist/` |

---

## Next steps

- [API.md](./API.md) — full engine API
- [ARCHITECTURE.md](./ARCHITECTURE.md) — frame loop and systems
- [PLUGIN_API.md](./PLUGIN_API.md) — custom effects and patterns
- [examples/vanilla/](./examples/vanilla/) — reference demo with debug panels
