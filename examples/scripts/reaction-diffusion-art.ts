import type { ScriptModule } from '../../src/scripting';

export const reactionDiffusionArt: ScriptModule = {
  id: 'reaction-diffusion-art',
  name: 'Reaction Diffusion Art',
  description: 'Gray-Scott patterns with morphing glyphs.',
  init(api) {
    const preset = api.createPreset({
      id: 'script-rd-art',
      name: 'Reaction Diffusion',
      basePresetId: 'reactionDiffusionSim',
      glyphLanguage: 'organic',
      motions: ['breathing'],
      simulations: ['reactionDiffusion'],
      trailAmount: 0.2,
    });
    api.setPreset(preset);
    api.resetSimulations();
    api.log('Reaction diffusion art');
  },
  update(api, ctx) {
    api.animateControl('cellularAmount', 0.3 + Math.sin(api.getTime() * 0.15) * 0.2, 0.5, ctx);
  },
};
