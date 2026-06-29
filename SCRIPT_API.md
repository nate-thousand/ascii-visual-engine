# Script API Reference

Public methods available on `ScriptAPI` inside script `init`, `update`, and `destroy` handlers.

## Logging

| Method | Description |
|--------|-------------|
| `log(...args)` | Info log (visible in script console) |
| `warn(...args)` | Warning log |
| `error(...args)` | Error log |

## Presets

| Method | Description |
|--------|-------------|
| `setPreset(preset)` | Apply full `AsciiPreset` object |
| `setPresetById(id)` | Load built-in preset by id |
| `getPreset()` | Current preset snapshot |
| `createPreset(options)` | Build preset from base + overrides |
| `listPresets()` | All built-in preset ids |

### `createPreset` options

```typescript
createPreset({
  id: string;
  name: string;
  basePresetId?: string;      // default: 'basic'
  glyphLanguage?: string | string[];
  glyphSet?: string[];
  motions?: string[];         // e.g. ['flowField', 'breathing']
  simulations?: string[];     // e.g. ['particle', 'lsystem']
  plugins?: PluginConfig[];
  patterns?: PluginConfig[];
  controls?: ControlDef[];
  layers?: LayerPresetConfig[];
  density?, speed?, trailAmount?, glitchAmount?, ...
})
```

## Controls

| Method | Description |
|--------|-------------|
| `setControl(name, value)` | Set engine control |
| `getControl(name, fallback?)` | Read control value |
| `animateControl(name, to, duration, ctx)` | Smooth ramp over duration |

## Plugins & motions

| Method | Description |
|--------|-------------|
| `enablePlugin(id)` | Enable effect plugin |
| `disablePlugin(id)` | Disable effect plugin |
| `enableMotion(id)` | Enable motion system |
| `disableMotion(id)` | Disable motion system |
| `setMotionWeight(id, weight)` | Set motion blend weight |

## Simulations

| Method | Description |
|--------|-------------|
| `enableSimulation(id)` | Enable simulation |
| `disableSimulation(id)` | Disable simulation |
| `resetSimulations()` | Reset all simulation state |
| `spawnParticles(options?)` | Burst particles at x/y with intensity |

### `spawnParticles` options

```typescript
{ x?: number; y?: number; intensity?: number; count?: number }
```

Coordinates are normalized 0–1.

## Glyphs

| Method | Description |
|--------|-------------|
| `setGlyphLanguage(languageId)` | Apply glyph language preset |

## Compositing

| Method | Description |
|--------|-------------|
| `createLayer(config)` | Add compositing layer |
| `removeLayer(id)` | Remove layer |
| `enableLayer(id)` | Enable layer |
| `disableLayer(id)` | Disable layer |
| `resetComposition()` | Reset layers to preset defaults |

## Performance

| Method | Description |
|--------|-------------|
| `noteOn(event?)` | Trigger noteOn (effects, particles) |
| `noteOff(event?)` | Trigger noteOff |

## Introspection

| Method | Description |
|--------|-------------|
| `getTime()` | Engine elapsed time (seconds) |
| `getFps()` | Current FPS |
| `getGridState()` | Read-only grid snapshot |

## Events

| Method | Description |
|--------|-------------|
| `on(event, handler)` | Subscribe; returns unsubscribe fn |
| `off(unsub)` | Unsubscribe |
| `emit(type, data?)` | Emit custom engine event |

### Subscribable events

`frame`, `tick`, `noteOn`, `noteOff`, `control`, `controlChange`, `audio`, `input`, `midi`, `resize`, `preset`, `presetChanged`, `simulation`, `simulationUpdate`, `custom`

## ScriptContext

```typescript
interface ScriptContext {
  time: number;   // engine time
  dt: number;     // delta seconds
  frame: number;  // update counter
  vars: Record<string, unknown>;  // script-local state
}
```

## Engine-level scripting API

On `AsciiEngine`:

```typescript
engine.registerScript(module);
engine.registerScripts(modules);
await engine.runScript('script-id');
await engine.stopScript();
await engine.reloadScript('script-id');
await engine.restartScript();
engine.enableScript();
engine.disableScript();
engine.clearScriptConsole();
engine.getScriptEngine().getContextVars();
engine.getDebugState().script;
```

## ScriptDebugState

```typescript
{
  activeScriptId: string | null;
  enabledScripts: string[];
  state: 'idle' | 'running' | 'paused' | 'error';
  error: string | null;
  logs: ScriptLogEntry[];
  frameCount: number;
}
```
