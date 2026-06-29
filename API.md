# API Reference

Public API for ASCII Visual Engine v0.3.0.

All symbols listed here are exported from the package entry point:

```typescript
import { AsciiEngine, /* ... */ } from 'ascii-visual-engine';
```

---

## AsciiEngine

Primary entry point. Manages lifecycle, presets, controls, plugins, rendering, and events.

### Constructor

```typescript
new AsciiEngine(options: AsciiEngineOptions)
```

#### AsciiEngineOptions

| Property | Type | Default | Description |
| --- | --- | --- | --- |
| `canvas` | `HTMLCanvasElement` | *required* | Target canvas element |
| `preset` | `AsciiPreset` | built-in default | Initial visual preset |
| `width` | `number` | `window.innerWidth` | Canvas width in pixels |
| `height` | `number` | `window.innerHeight` | Canvas height in pixels |
| `autoStart` | `boolean` | `true` | Start animation loop on construction |

### Methods

#### `start(): void`

Starts the animation loop. No-op if already running or destroyed. Emits `start` event.

#### `stop(): void`

Stops the animation loop. Preserves engine state. Emits `stop` event.

#### `destroy(): void`

Permanently tears down the engine. Stops loop, resets effects, clears renderer and event listeners. Cannot be restarted.

#### `setPreset(preset: AsciiPreset): void`

Switches active preset. Enables plugins from preset configuration. Emits `preset` event.

#### `registerPlugin(plugin: Plugin): void`

Registers a plugin with the engine. Calls `plugin.initialize(engine)`.

#### `unregisterPlugin(id: string): void`

Removes and destroys a plugin.

#### `enablePlugin(id: string): void`

Enables a registered plugin. Emits `plugin` event.

#### `disablePlugin(id: string): void`

Disables a plugin without removing it. Emits `plugin` event.

#### `getPlugin(id: string): Plugin | undefined`

Returns a registered plugin by id.

#### `getEnabledPlugins(): Plugin[]`

Returns all currently enabled plugins.

#### `getPluginManager(): PluginManager`

Returns the internal plugin manager for advanced use.

#### `registerPattern(pattern: Pattern): void` *(deprecated)*

Wraps pattern in `PatternPlugin` and calls `registerPlugin`.

#### `enablePattern(id: PatternId): void` *(deprecated)*

Calls `enablePlugin`. Maps legacy `wave` → `wavePattern`.

#### `disablePattern(id: PatternId): void` *(deprecated)*

Calls `disablePlugin`.

#### `setControl(name: string, value: number): void`

Sets a runtime control value by name. Known controls:

| Name | Effect |
| --- | --- |
| `density` | Rebuilds renderer grid at new density |
| `speed` | Animation speed multiplier |
| `trailAmount` | Frame fade strength (0–1) |
| `glitchAmount` | Random corruption intensity (0–1) |

Emits `control` event with `{ name, value }`.

#### `getControl(name: string, fallback?: number): number`

Returns current control value. Falls back to provided default or `0`.

#### `noteOn(event?: NoteEvent): void`

Triggers a visual burst and forwards to effect `onNoteOn` handlers. Emits `noteOn` event.

#### `noteOff(event?: NoteEvent): void`

Releases a note. Forwards to effect `onNoteOff` handlers. Emits `noteOff` event. Reserved for future sustained effects.

#### `emit(event: EngineEventPayload): void`

Emits a custom application event. Delivered to `custom` event listeners.

#### `resize(width: number, height: number): void`

Resizes canvas and rebuilds character grid. Emits `resize` event.

#### `getPreset(): AsciiPreset`

Returns the currently active preset object.

### Event methods

#### `on<K>(event: K, listener: (payload: EngineEventMap[K]) => void): () => void`

Subscribe to a typed event. Returns an unsubscribe function.

#### `off<K>(event: K, listener: (payload: EngineEventMap[K]) => void): void`

Remove a specific event listener.

### Events

| Event | Payload type | Description |
| --- | --- | --- |
| `start` | `void` | Engine started |
| `stop` | `void` | Engine stopped |
| `preset` | `AsciiPreset` | Preset changed |
| `control` | `{ name: string; value: number }` | Control updated |
| `noteOn` | `NoteEvent` | Note triggered |
| `noteOff` | `NoteEvent` | Note released |
| `resize` | `{ width: number; height: number }` | Canvas resized |
| `frame` | `{ time: number; fps: number }` | Emitted once per second |
| `custom` | `EngineEventPayload` | Custom application event |

---

## CanvasAsciiRenderer

Low-level canvas renderer. Most applications should use `AsciiEngine` directly.

### Constructor

```typescript
new CanvasAsciiRenderer(options: RendererOptions)
```

#### RendererOptions

| Property | Type | Default | Description |
| --- | --- | --- | --- |
| `canvas` | `HTMLCanvasElement` | *required* | Target canvas |
| `width` | `number` | *required* | Width in pixels |
| `height` | `number` | *required* | Height in pixels |
| `density` | `number` | *required* | Grid density multiplier |
| `glyphSet` | `string[]` | *required* | Available characters |
| `fontFamily` | `string` | `'monospace'` | CSS font family |
| `color` | `string` | `'#00ff88'` | Glyph color (hex) |
| `backgroundColor` | `string` | `'#000000'` | Background color (hex) |

### Methods

| Method | Description |
| --- | --- |
| `render(trailAmount?: number)` | Clear (with optional trail fade) and draw all cells |
| `clear(trailAmount?: number)` | Clear canvas or apply trail fade |
| `resize(width, height)` | Resize canvas and rebuild grid |
| `setDensity(density)` | Change density and rebuild grid |
| `setGlyphSet(glyphSet)` | Update character set |
| `setColor(color)` | Set glyph color |
| `setBackgroundColor(color)` | Set background color |
| `getGridState(time)` | Return current `GridState` for effect processing |
| `getDimensions()` | Return `{ cols, rows, cellWidth, cellHeight }` |
| `destroy()` | Clear grid and canvas |

---

## EventBus

Standalone typed pub/sub utility. Used internally by `AsciiEngine` but also exported for custom integrations.

### Methods

| Method | Description |
| --- | --- |
| `on(event, listener)` | Subscribe. Returns unsubscribe function. |
| `off(event, listener)` | Remove a listener. |
| `emit(event, payload)` | Dispatch to all listeners. |
| `clear()` | Remove all listeners. |

---

## Effect (interface)

Contract for visual effect modules. Built-in effects implement this interface.

```typescript
interface Effect {
  readonly type: EffectType;
  update(ctx: EffectContext): void;
  onNoteOn?(event: NoteEvent): void;
  onNoteOff?(event: NoteEvent): void;
  reset?(): void;
}
```

### Built-in implementations

| Class | `type` | Description |
| --- | --- | --- |
| `NoiseField` | `'noise'` | Organic sine-product glyph animation |
| `WaveField` | `'wave'` | Sine wave glyph patterns |
| `GlyphBurst` | `'burst'` | Radial burst on `noteOn` |
| `Glitch` | `'glitch'` | Random glyph corruption |
| `Trails` | `'trails'` | Burst decay and frame fade |

### EffectContext

Passed to `update()` each frame:

| Field | Type | Description |
| --- | --- | --- |
| `grid` | `GridState` | Mutable grid state |
| `glyphSet` | `string[]` | Active character set |
| `speed` | `number` | Speed multiplier |
| `glitchAmount` | `number` | Glitch intensity (0–1) |
| `trailAmount` | `number` | Trail fade strength (0–1) |
| `dt` | `number` | Delta time in seconds |
| `time` | `number` | Total elapsed time in seconds |

---

## Preset utilities

### Built-in presets

```typescript
import {
  basicPreset,
  terminalPreset,
  organicPreset,
  presets,
  getPreset,
  listPresets,
} from 'ascii-visual-engine';
```

| Export | Description |
| --- | --- |
| `basicPreset` | Wave motion, classic ASCII glyphs |
| `terminalPreset` | Noise motion, hex digit glyphs |
| `organicPreset` | Noise motion, soft dot glyphs |
| `presets` | `{ basic, terminal, organic }` map |
| `getPreset(id)` | Get preset by id |
| `listPresets()` | Array of all built-in presets |

---

## Types

### NoteEvent

```typescript
interface NoteEvent {
  id?: string | number;
  x?: number;        // normalized 0–1, default random
  y?: number;        // normalized 0–1, default random
  intensity?: number; // default 1
  data?: Record<string, unknown>;
}
```

### EngineEventPayload

```typescript
interface EngineEventPayload {
  type: string;
  data?: unknown;
}
```

### AsciiPreset

See [PRESET_SCHEMA.md](./PRESET_SCHEMA.md) for the complete format.

### GridCell

```typescript
interface GridCell {
  char: string;
  baseChar: string;
  x: number;
  y: number;
  phase: number;
  brightness: number;
  burst: number;
}
```

### GridState

```typescript
interface GridState {
  cells: GridCell[];
  cols: number;
  rows: number;
  time: number;
  width: number;
  height: number;
}
```

### ControlDef

```typescript
interface ControlDef {
  name: string;
  label?: string;
  min: number;
  max: number;
  default: number;
  step?: number;
}
```

---

## PluginManager

Central registry for all plugins.

| Method | Description |
| --- | --- |
| `register(plugin)` | Add plugin, call initialize |
| `unregister(id)` | Remove and destroy plugin |
| `enable(id)` / `disable(id)` | Toggle plugin enabled state |
| `get(id)` | Lookup by id |
| `getAll()` | All registered plugins |
| `getByType(type)` | Filter by plugin type |
| `getEnabled()` | All enabled plugins |
| `setEnabledIds(ids)` | Enable only listed ids |
| `runMotionEffects(ctx)` | Motion-phase effect plugins |
| `applyPatterns(ctx)` | Composite pattern plugins |
| `runPostEffects(ctx)` | Post-phase effect plugins |
| `destroy()` | Destroy all plugins |

See [PLUGIN_API.md](./PLUGIN_API.md) for building custom plugins.

---

## MotionManager

Procedural motion engine — independent from rendering and effects. See [MOTION_SYSTEM.md](./MOTION_SYSTEM.md).

| Method | Description |
| --- | --- |
| `registerMotion(motion)` | Register a motion behavior |
| `unregisterMotion(id)` | Remove and destroy motion |
| `enableMotion(id)` / `disableMotion(id)` | Toggle motion |
| `getMotion(id)` | Lookup by id |
| `getAll()` / `getEnabled()` | List motions |
| `setMotionWeight(id, weight)` | Set blend weight |
| `setMotionPriority(id, priority)` | Set blend priority |
| `setEnabledIds(configs)` | Enable motions from preset config |
| `combineMotions(context)` | Run and blend all enabled motions |
| `getDebugState()` | Frame time, velocities, active motions |
| `destroy()` | Destroy all motions |

### AsciiEngine motion API

| Method | Description |
| --- | --- |
| `registerMotion(motion)` | Register custom motion |
| `enableMotion(id)` / `disableMotion(id)` | Toggle motion |
| `getMotion(id)` | Get motion instance |
| `getEnabledMotions()` | List enabled motions |
| `setMotionWeight(id, weight)` | Adjust blend weight |
| `getMotionManager()` | Direct manager access |

---

## SourceManager

External visual source pipeline — images, video, webcam, canvas. See [SOURCE_PIPELINE.md](./SOURCE_PIPELINE.md).

| Method | Description |
| --- | --- |
| `registerSource(source)` | Register a source implementation |
| `unregisterSource(id)` | Remove and destroy source |
| `setActiveSource(id)` | Activate source (switches to source mode) |
| `getActiveSource()` | Currently active source |
| `setMode('procedural' \| 'source')` | Pipeline mode |
| `getMode()` | Current mode |
| `loadSource(id, input)` | Load input into source |
| `update(dt, context)` | Per-frame source update |
| `applyToGrid(grid, glyphSet, getControl)` | Sample source into grid |
| `getDebugState()` | Ready state, dimensions, errors |
| `destroy()` | Destroy all sources |

### Built-in sources

| Class | Id | Type |
| --- | --- | --- |
| `ImageSource` | `image` | Static image file/URL |
| `VideoSource` | `video` | Video file with frame sampling |
| `WebcamSource` | `webcam` | Live camera feed |
| `CanvasSource` | `canvas` | HTMLCanvasElement |

### AsciiEngine source API

| Method | Description |
| --- | --- |
| `getSourceManager()` | Direct manager access |
| `setSourceMode(mode)` | `'procedural'` or `'source'` |
| `getSourceMode()` | Current pipeline mode |
| `setActiveSource(id)` | Activate registered source |
| `loadSource(id, input)` | Load external input |

### Source controls

| Control | Default | Description |
| --- | --- | --- |
| `sourceContrast` | `1` | Brightness contrast multiplier |
| `sourceEdge` | `0.3` | Edge emphasis blend |
| `sourceBlend` | `1` | Source brightness blend strength |

---

## RendererManager

Pluggable output backends — canvas, DOM text, offscreen canvas, WebGL stub. See [RENDERER_PIPELINE.md](./RENDERER_PIPELINE.md).

| Method | Description |
| --- | --- |
| `registerRenderer(renderer)` | Register a renderer backend |
| `unregisterRenderer(id)` | Remove and destroy renderer |
| `setActiveRenderer(id)` | Switch active backend (returns `{ ok, warning, activeId }`) |
| `getActiveRenderer()` | Currently active renderer |
| `getGridState(time)` | Grid from active renderer |
| `setDensity(density)` / `setGlyphSet(glyphs)` | Grid configuration |
| `resize(width, height)` | Resize all registered renderers |
| `render(frame, context)` | Draw current frame |
| `getDebugState()` | Active renderer, warnings, offscreen support |
| `destroy()` | Destroy all renderers |

### Built-in renderers

| Class | Id | Output |
| --- | --- | --- |
| `CanvasRenderer` | `canvas` | Canvas 2D (default) |
| `DomRenderer` | `dom` | `<pre>` / `<div>` text |
| `OffscreenCanvasRenderer` | `offscreen-canvas` | OffscreenCanvas → canvas blit |
| `WebGLRendererStub` | `webgl` | Planned — not yet implemented |

### AsciiEngine renderer API

| Method | Description |
| --- | --- |
| `getRendererManager()` | Direct manager access |
| `setActiveRenderer(id)` | Switch renderer at runtime |
| `getActiveRendererId()` | Current renderer id |

### Engine options

```typescript
new AsciiEngine({
  canvas,
  element,   // optional — DOM renderer target
  renderer: 'canvas' | 'dom' | 'offscreen-canvas' | 'webgl',
});
```

---

## SimulationManager

Emergent behavior engine — independent from rendering. See [SIMULATION_ENGINE.md](./SIMULATION_ENGINE.md).

| Method | Description |
| --- | --- |
| `registerSimulation(sim)` | Register a simulation |
| `unregisterSimulation(id)` | Remove and destroy simulation |
| `enableSimulation(id)` / `disableSimulation(id)` | Toggle simulation |
| `getSimulation(id)` | Lookup by id |
| `getAll()` / `getEnabled()` | List simulations |
| `setEnabledIds(configs)` | Enable simulations from preset config |
| `update(dt, context)` | Run all enabled simulations |
| `resetAll()` | Reset all simulation state |
| `getDebugState()` | Particles, memory, update time, FPS |
| `destroy()` | Destroy all simulations |

### Built-in simulations

| Class | Id |
| --- | --- |
| `ParticleSimulation` | `particle` |
| `BoidsSimulation` | `boids` |
| `CellularAutomataSimulation` | `cellularAutomata` |
| `ReactionDiffusionSimulation` | `reactionDiffusion` |
| `LSystemSimulation` | `lsystem` |
| `GravitySimulation` | `gravity` |
| `SpringSimulation` | `spring` |
| `FluidSimulation` | `fluid` |

### AsciiEngine simulation API

| Method | Description |
| --- | --- |
| `getSimulationManager()` | Direct manager access |
| `registerSimulation(sim)` | Register custom simulation |
| `enableSimulation(id)` / `disableSimulation(id)` | Toggle simulation |
| `getEnabledSimulations()` | List enabled simulations |

### Simulation controls

| Control | Default | Description |
| --- | --- | --- |
| `simStrength` | `0.8` | Output intensity |
| `simSpeed` | `1` | Time scale |
| `simDensity` | `0.5` | Density threshold |
| `simDecay` | `0.2` | Decay/damping |
| `simSpawnRate` | `0.6` | Emission rate |

---

## LayerManager

Layer compositing — stack patterns, simulations, and fills with blend modes and masks. See [COMPOSITING.md](./COMPOSITING.md).

| Method | Description |
| --- | --- |
| `addLayer(config)` | Add a layer |
| `removeLayer(id)` | Remove layer by id |
| `enableLayer(id)` / `disableLayer(id)` | Toggle layer |
| `reorderLayer(id, newIndex)` | Change stack order |
| `getLayer(id)` | Lookup layer |
| `getAll()` / `getEnabled()` | List layers |
| `clear()` | Remove all layers |
| `setFromPreset(configs)` | Load layers from preset |
| `renderLayers(context)` | Composite enabled layers onto grid |
| `isCompositingActive()` | True when any layer enabled |
| `getDebugState()` | Layer count, order, render time |

### AsciiEngine compositing API

| Method | Description |
| --- | --- |
| `getLayerManager()` | Direct manager access |
| `getPostProcessor()` | Post processing manager |
| `resetComposition()` | Clear and reload preset layers + post passes |

### Blend modes

`normal` · `add` · `multiply` · `screen` · `difference` · `max` · `min` · `overlay`

### Mask types

`radial` · `linear` · `noise` · `brightness`

---

## PostProcessor

CPU post processing passes applied after compositing. See [POST_PROCESSING.md](./POST_PROCESSING.md).

| Method | Description |
| --- | --- |
| `registerPass(pass)` | Register custom pass |
| `enablePass(id)` / `disablePass(id)` | Toggle pass |
| `setPassAmount(id, amount)` | Set pass amount |
| `setFromPreset(configs)` | Load passes from preset |
| `process(grid, glyphSet, time, dt, getControl)` | Run enabled passes |
| `isActive()` | True when any pass enabled |
| `reset()` | Clear temporal buffers |
| `getDebugState()` | Enabled passes, process time |

### Built-in passes

| Id | Description |
| --- | --- |
| `feedback` | Previous-frame blend (trails) |
| `smear` | Neighbor blur / motion drag |
| `displacement` | Sine-wave spatial warp |
| `threshold` | Binary threshold |
| `invert` | Brightness invert |
| `edge` | Edge detection |
| `posterize` | Level reduction |
| `scanline` | Row dimming |
| `dither` | Bayer dither |

### Post processing controls

| Control | Default | Pass |
| --- | --- | --- |
| `postFeedback` | `0.7` | feedback |
| `postSmear` | `0.5` | smear |
| `postDisplacement` | `0.3` | displacement |
| `postThreshold` | `0.5` | threshold |
| `postInvert` | `1` | invert |
| `postEdge` | `0.6` | edge |
| `postPosterize` | `4` | posterize |
| `postScanline` | `0.5` | scanline |
| `postDither` | `0.5` | dither |

---

## Audio Reactivity

Real-time Web Audio analysis mapped to visual parameters. See [AUDIO_REACTIVITY.md](./AUDIO_REACTIVITY.md).

| Method | Description |
| --- | --- |
| `connectAudio(input)` | Connect mic, audio element, stream, or analyser |
| `disconnectAudio()` | Disconnect and restore base values |
| `setAudioMapping(config)` | Configure feature → target bindings |
| `getAudioFeatures()` | Latest extracted features |
| `isAudioConnected()` | Whether audio is active |

### Audio features

`amplitude` · `bass` · `lowMid` · `mid` · `highMid` · `treble` · `spectralCentroid` · `transient` · `beat`

### Smoothing controls

| Control | Default | Description |
| --- | --- | --- |
| `audioAttack` | `0.08` | Rise smoothing (seconds) |
| `audioRelease` | `0.25` | Fall smoothing (seconds) |
| `audioSensitivity` | `1` | Feature gain |
| `audioNoiseGate` | `0.02` | Silence threshold |
| `audioMinThreshold` | `0` | Output floor |
| `audioMaxClamp` | `1` | Output ceiling |

### Audio presets

`audioAmbient` · `audioBass` · `audioGlitch` · `audioVoice` · `audioFullSpectrum`

---

## MIDI & Performance Controls

Web MIDI and keyboard input mapped to visual parameters. See [MIDI_AND_INPUT.md](./MIDI_AND_INPUT.md).

| Method | Description |
| --- | --- |
| `connectMidi(deviceId?)` | Connect Web MIDI input device |
| `disconnectMidi()` | Disconnect active MIDI input |
| `getMidiDevices()` | List available MIDI input devices |
| `setInputMapping(config)` | Configure performance mappings |
| `getInputMapping()` | Current mapping configuration |
| `clearInputMapping()` | Clear learned CC bindings |
| `resetInputMapping()` | Reset to preset device mapping |
| `enableKeyboardInput()` | Enable QWERTY keyboard note input |
| `disableKeyboardInput()` | Disable keyboard input |
| `startInputLearn(target, callback?)` | Enter MIDI learn mode for a target |
| `cancelInputLearn()` | Exit learn mode without binding |
| `inputPanic()` | All notes off — clear stuck notes |
| `getInputNoteMonitor()` | Recent note on/off events |
| `getInputManager()` | Direct access to input subsystem |

### Input events

| Event | Payload |
| --- | --- |
| `input` | `InputDebugState` |

### Device presets

`akaiMpkMini` · `novationLaunchkey` · `genericKeyboard` · `qwertyKeyboard`

### Performance presets

`performanceGeneric` · `performanceAkai` · `performanceLaunchkey` · `performanceQwerty`

---

## Procedural Glyph Language

Semantic glyph selection with categories, roles, morphing, and animation. See [GLYPH_LANGUAGE.md](./GLYPH_LANGUAGE.md).

| Method | Description |
| --- | --- |
| `getGlyphRegistry()` | Access glyph subsystem |
| `registerGlyphLanguage(config)` | Register a custom glyph language |
| `getResolvedGlyphSet()` | Current character set for renderer |

### Glyph debug state

`engine.getDebugState().glyph` — enabled, languageId, categories, sampleCell, morphState, animationState

### Glyph presets

`glyphOrganicBloom` · `glyphDigitalForest` · `glyphCrtTerminal` · `glyphCorruptedBroadcast` · `glyphFlowField` · `glyphParticleNebula` · `glyphAbstractGeometry` · `glyphMinimalZen`

### Glyph categories

`organic` · `terminal` · `noise` · `geometric` · `technical` · `particle` · `fluid` · `architecture` · `minimal` · `abstract` · `unicodeDecorative`

---

## PatternRegistry *(legacy)*

Still exported. Engine uses `PluginManager` internally.

## Pattern (interface)

```typescript
interface Pattern {
  readonly id: PatternId;
  readonly name: string;
  initialize(engine: AsciiEngine): void;
  update(deltaTime: number, context: PatternSampleContext): void;
  sample(x: number, y: number, context: PatternSampleContext): number;
  destroy(): void;
}
```

### Built-in patterns

| Class | Id |
| --- | --- |
| `RadialSymmetryPattern` | `radialSymmetry` |
| `SpiralPattern` | `spiral` |
| `WavePattern` | `wave` (plugin id: `wavePattern`) |
| `GridPattern` | `grid` |
| `CellularPattern` | `cellular` |
| `ScanlinePattern` | `scanline` |

`organic` · `terminal` · `noise` · `geometric` · `technical` · `particle` · `fluid` · `architecture` · `minimal` · `abstract` · `unicodeDecorative`

---

## Recording & Export

Capture and export visuals. See [EXPORTING.md](./EXPORTING.md), [RECORDING.md](./RECORDING.md), [SCENE_FORMAT.md](./SCENE_FORMAT.md).

| Method | Description |
| --- | --- |
| `exportPNG(options?)` | PNG screenshot (retina, transparent, clipboard) |
| `exportSVG(options?)` | SVG vector download |
| `exportGIF(options?)` | Animated GIF from recorded frames |
| `exportJSON(name?)` | Download JSON scene snapshot |
| `importJSON(json)` | Restore engine from JSON scene |
| `exportASCII(options?)` | Plain ASCII text download |
| `exportSequence(options?)` | Numbered PNG frame sequence |
| `startRecording(fps?)` | Begin frame capture |
| `stopRecording()` | Stop and return frames |
| `pauseRecording()` / `resumeRecording()` / `cancelRecording()` | Recording control |
| `playRecording(options?)` | Replay recorded frames |
| `pausePlayback()` / `resumePlayback()` / `stopPlayback()` | Playback control |
| `stepPlayback(delta)` | Step forward/back one frame |
| `scrubPlayback(index)` | Jump to frame index |
| `getExportManager()` | Direct access to export subsystem |
| `getGridState()` | Current grid for custom export |
| `getCanvas()` | Canvas element for custom capture |

### Export debug state

`engine.getDebugState().export` — recording state, playback state, last export format

---

## Scripting API

Programmatic scene control via scripts. See [SCRIPTING.md](./SCRIPTING.md), [SCRIPT_API.md](./SCRIPT_API.md), [EXAMPLES.md](./EXAMPLES.md).

| Method | Description |
| --- | --- |
| `registerScript(module)` | Register a script module |
| `registerScripts(modules)` | Register multiple scripts |
| `runScript(id)` | Start script (async) |
| `stopScript()` | Stop active script |
| `reloadScript(id?)` | Hot reload and restart |
| `restartScript()` | Re-run init on active script |
| `enableScript()` / `disableScript()` | Pause/resume script updates |
| `clearScriptConsole()` | Clear script logs |
| `getScriptEngine()` | Access script subsystem |
| `applyGlyphLanguage(id)` | Apply glyph language by id |
| `getEngineTime()` / `getEngineFps()` | Engine time and FPS |

### Script debug state

`engine.getDebugState().script` — active script id, state, logs, frame count, error

---

## Performance

CPU profiling, quality presets, and optimization. See [PERFORMANCE.md](./PERFORMANCE.md), [OPTIMIZATION_GUIDE.md](./OPTIMIZATION_GUIDE.md).

| Method | Description |
| --- | --- |
| `getPerformanceManager()` | Access performance subsystem |
| `setQualityPreset(id)` | Apply Ultra/High/Medium/Low/Battery Saver |
| `getQualityPreset()` | Current quality preset id |

### Performance controls

`perfQuality` · `fpsTarget` · `adaptiveQuality` · `dirtyRendering` · `spatialGrid` · `workerOffload`

### Performance debug state

`engine.getDebugState().performance` — FPS, frame timing, memory, draw calls, phase timings, worker status

---

## Future APIs

### AsciiRenderer interface *(planned)*

```typescript
engine.setRenderer(renderer: AsciiRenderer): void;
```

### PresetLoader *(planned v0.3)*

```typescript
loadPreset(url: string): Promise<AsciiPreset>;
validatePreset(preset: unknown): AsciiPreset;
interpolatePresets(a: AsciiPreset, b: AsciiPreset, t: number): AsciiPreset;
```

### InputAdapter *(planned v0.3)*

```typescript
engine.connectInput(adapter: InputAdapter): void;
engine.disconnectInput(adapter: InputAdapter): void;
```

### useAsciiEngine *(planned v0.4)*

```typescript
function useAsciiEngine(options: AsciiEngineOptions): {
  engine: AsciiEngine;
  preset: AsciiPreset;
  setControl: (name: string, value: number) => void;
};
```

### AudioMapper *(planned v0.3)*

```typescript
createAudioMapper(analyser: AnalyserNode): AudioMapper;
mapper.bindControl(controlName: string, bin: number): void;
mapper.bindNote(frequency: number, threshold: number): void;
```

See [ROADMAP.md](./ROADMAP.md) for implementation timeline.
