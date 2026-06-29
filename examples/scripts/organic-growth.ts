import type { ScriptModule } from '../../src/scripting';

export const organicGrowth: ScriptModule = {
  id: 'organic-growth',
  name: 'Organic Growth',
  description: 'Organic glyph language with growth motion and L-system simulation.',
  init(api) {
    const preset = api.createPreset({
      id: 'script-organic-growth',
      name: 'Organic Growth',
      basePresetId: 'glyphOrganicBloom',
      glyphLanguage: 'organic',
      motions: ['organicGrowth', 'breathing'],
      simulations: ['lsystem'],
      trailAmount: 0.4,
      speed: 0.6,
    });
    api.setPreset(preset);
    api.setGlyphLanguage('organic');
    api.setControl('simSpawnRate', 0.3);
    api.log('Organic growth scene loaded');
  },
  update(api, ctx) {
    const t = api.getTime();
    api.setControl('strength', 0.5 + Math.sin(t * 0.4) * 0.3);
    ctx.vars.phase = t;
  },
};
