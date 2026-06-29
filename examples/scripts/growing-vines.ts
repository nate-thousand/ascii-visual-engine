import type { ScriptModule } from '../../src/scripting';

export const growingVines: ScriptModule = {
  id: 'growing-vines',
  name: 'Growing Vines',
  description: 'L-system vines with organic glyphs.',
  init(api) {
    const preset = api.createPreset({
      id: 'script-growing-vines',
      name: 'Growing Vines',
      basePresetId: 'glyphOrganicBloom',
      glyphLanguage: 'organic',
      motions: ['organicGrowth'],
      simulations: ['lsystem'],
      speed: 0.5,
    });
    api.setPreset(preset);
    api.setControl('simSpawnRate', 0.5);
    api.log('Growing vines');
  },
};
