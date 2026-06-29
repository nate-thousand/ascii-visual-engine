# Script Examples

Example scripts live in [`examples/scripts/`](./examples/scripts/). Run them from the vanilla demo **Script Console** or register them in your own app.

## Gallery

| Script | File | Description |
|--------|------|-------------|
| Hello World | `hello-world.ts` | Log message, basic preset, trails |
| Particle Burst | `particle-burst.ts` | Timed auto bursts + noteOn hooks |
| Organic Growth | `organic-growth.ts` | Organic glyphs, L-system, breathing |
| Terminal Rain | `terminal-rain.ts` | Matrix-style falling glyphs |
| Audio Reactive | `audio-reactive.ts` | Maps audio features to controls |
| Growing Vines | `growing-vines.ts` | L-system vine growth |
| Galaxy | `galaxy.ts` | Orbital/spiral cosmic scene |
| Reaction Diffusion Art | `reaction-diffusion-art.ts` | Gray-Scott patterns |
| Particle Explosion | `particle-explosion.ts` | MIDI/interval explosions |
| Breathing Mandala | `breathing-mandala.ts` | Radial symmetry + pulse |
| Audio Pulse | `audio-pulse.ts` | Pulse motion from amplitude |
| Generative Forest | `generative-forest.ts` | Forest layers + wind |
| Minimal Zen | `minimal-zen.ts` | Sparse slow breathing scene |

## Register all examples

```typescript
import { galleryScripts } from './examples/scripts';
engine.registerScripts(galleryScripts);
await engine.runScript('terminal-rain');
```

## Hello World

```typescript
export const helloWorld: ScriptModule = {
  id: 'hello-world',
  init(api) {
    api.log('Hello from the Scripting API!');
    api.setPresetById('basic');
    api.setControl('speed', 1.25);
    api.enablePlugin('trails');
  },
};
```

## Procedural preset scene

```typescript
init(api) {
  const preset = api.createPreset({
    id: 'my-scene',
    name: 'My Scene',
    glyphLanguage: 'organic',
    motions: ['FlowField', 'Breathing'],
    simulations: ['Particles'],
  });
  api.setPreset(preset);
}
```

## Event-driven audio

```typescript
init(api) {
  api.on('audio', (data) => {
    const { amplitude = 0 } = data as { amplitude?: number };
    api.setControl('strength', 0.3 + amplitude);
  });
}
```

## Particle burst on interval

```typescript
init(api, ctx) {
  ctx.vars.lastBurst = api.getTime();
},
update(api, ctx) {
  if (api.getTime() - (ctx.vars.lastBurst as number) > 2) {
    ctx.vars.lastBurst = api.getTime();
    api.spawnParticles({ count: 8, intensity: 1.5 });
  }
}
```

## Custom layers

```typescript
init(api) {
  api.createLayer({
    id: 'overlay',
    name: 'Overlay',
    opacity: 0.5,
    blendMode: 'screen',
    fill: 0.2,
  });
}
```

## Writing your own scripts

1. Create a `ScriptModule` with a unique `id`.
2. Register via `engine.registerScript()` or `registerScripts()`.
3. Call `await engine.runScript(id)`.
4. Use `destroy()` for cleanup (remove layers, unsubscribe is automatic for `api.on()`).

See [SCRIPTING.md](./SCRIPTING.md) and [SCRIPT_API.md](./SCRIPT_API.md) for full details.
