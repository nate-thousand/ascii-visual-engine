import type { ScriptModule } from '../../src/scripting';

export const generativeForest: ScriptModule = {
  id: 'generative-forest',
  name: 'Generative Forest',
  description: 'Forest of L-system branches with wind.',
  init(api) {
    const preset = api.createPreset({
      id: 'script-generative-forest',
      name: 'Generative Forest',
      basePresetId: 'glyphOrganicBloom',
      glyphLanguage: 'organic',
      motions: ['wind', 'organicGrowth'],
      simulations: ['lsystem'],
      density: 1.2,
    });
    api.setPreset(preset);
    api.createLayer({
      id: 'forest-bg',
      name: 'Background',
      opacity: 0.4,
      blendMode: 'multiply',
      fill: 0.1,
    });
    api.log('Generative forest');
  },
};
