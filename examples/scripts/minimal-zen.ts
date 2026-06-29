import type { ScriptModule } from '../../src/scripting';

export const minimalZen: ScriptModule = {
  id: 'minimal-zen',
  name: 'Minimal Zen',
  description: 'Sparse, slow breathing visuals.',
  init(api) {
    const preset = api.createPreset({
      id: 'script-minimal-zen',
      name: 'Minimal Zen',
      basePresetId: 'basic',
      glyphLanguage: 'minimal',
      motions: ['breathing'],
      plugins: [{ id: 'trails', type: 'effect' }],
      density: 0.6,
      speed: 0.3,
      trailAmount: 0.15,
      glitchAmount: 0,
    });
    api.setPreset(preset);
    api.disablePlugin('glitch');
    api.disablePlugin('burst');
    api.log('Minimal zen — slow and sparse');
  },
  update(api) {
    api.setControl('density', 0.5 + Math.sin(api.getTime() * 0.3) * 0.1);
  },
};
