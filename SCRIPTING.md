# Scripting

The Scripting API lets developers extend ASCII Visual Engine with **scripts** instead of modifying engine internals. Scripts receive a safe, public `ScriptAPI` facade — no direct access to private engine state.

## Quick start

```typescript
import { AsciiEngine, type ScriptModule } from 'ascii-visual-engine';

const myScript: ScriptModule = {
  id: 'my-scene',
  name: 'My Scene',
  init(api) {
    api.setPresetById('ambient');
    api.enableMotion('flowField');
    api.log('Scene ready');
  },
  update(api, ctx, dt) {
    api.setControl('speed', 0.5 + Math.sin(api.getTime()) * 0.3);
  },
  destroy(api) {
    api.log('Cleanup');
  },
};

const engine = new AsciiEngine({ canvas, width, height });
engine.registerScript(myScript);
await engine.runScript('my-scene');
```

## Architecture

| Module | Role |
|--------|------|
| `ScriptEngine` | Orchestrates loader, runner, and engine bridge |
| `ScriptAPI` | Public facade exposed to scripts |
| `ScriptContext` | Per-script mutable state (`time`, `dt`, `vars`) |
| `ScriptRunner` | Lifecycle: init → update → destroy |
| `ScriptRegistry` | Catalog of registered script modules |
| `ScriptLoader` | Load/reload modules with optional hot reload |

Scripts attach to `AsciiEngine` automatically. Each frame, the engine calls `scriptEngine.onFrameStart(dt, time)` before audio/simulation updates.

## Script module shape

```typescript
interface ScriptModule {
  id: string;
  name?: string;
  description?: string;
  init?(api, ctx): void | Promise<void>;
  update?(api, ctx, dt): void;
  destroy?(api, ctx): void;
  onEvent?(api, ctx, event, data): void;
}
```

Use `ctx.vars` for script-local state. Use `api.animateControl()` for timed control ramps.

## Engine methods

| Method | Description |
|--------|-------------|
| `registerScript(module)` | Register one script |
| `registerScripts(modules)` | Register many scripts |
| `runScript(id)` | Start script (stops previous) |
| `stopScript()` | Stop and destroy active script |
| `reloadScript(id?)` | Hot reload (dev) and restart |
| `restartScript()` | Re-run init on active script |
| `enableScript()` / `disableScript()` | Pause/resume update loop |
| `clearScriptConsole()` | Clear script logs |
| `getScriptEngine()` | Access full script subsystem |

## Event hooks

Scripts receive engine events via `api.on()` and the optional `onEvent` handler:

- `frame` — once per second (FPS tick)
- `tick` — every animation frame (via runner)
- `noteOn` / `noteOff`
- `control` — control changes
- `audio` — audio feature updates
- `input` — MIDI/keyboard events
- `resize`
- `preset` — preset changed
- `simulation` — simulation enable/disable
- `custom` — user-emitted events via `api.emit()`

## Preset authoring

Build complete presets in code:

```typescript
const preset = api.createPreset({
  id: 'procedural-scene',
  name: 'Procedural Scene',
  basePresetId: 'basic',
  glyphLanguage: 'organic',
  motions: ['FlowField', 'Breathing'],
  simulations: ['Particles'],
  trailAmount: 0.5,
});
api.setPreset(preset);
```

Motion/simulation names are normalized (`FlowField` → `flowField`, `Particles` → `particle`).

## Live reload (development)

```typescript
engine.getScriptEngine().setHotReload(true);
await engine.reloadScript('my-scene');
```

Hot reload re-registers the module and restarts if it is active.

## Script console (vanilla demo)

The vanilla example includes a **Script Console** panel:

- Select and run example scripts
- Stop, reload, restart
- Enable/disable script updates
- View logs and inspect `ctx.vars`

Example gallery lives in [`examples/scripts/`](./examples/scripts/).

## Security

Scripts only receive `ScriptAPI`. The bridge wraps `AsciiEngine` public methods — internal managers, private fields, and direct grid mutation are not exposed.

## See also

- [SCRIPT_API.md](./SCRIPT_API.md) — full API reference
- [EXAMPLES.md](./EXAMPLES.md) — example gallery walkthrough
- [API.md](./API.md) — core engine API
