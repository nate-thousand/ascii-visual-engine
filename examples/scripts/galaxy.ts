import type { ScriptModule } from '../../src/scripting';

export const galaxy: ScriptModule = {
  id: 'galaxy',
  name: 'Galaxy',
  description: 'Orbital motion with particle stars.',
  init(api) {
    const preset = api.createPreset({
      id: 'script-galaxy',
      name: 'Galaxy',
      basePresetId: 'glyphParticleNebula',
      motions: ['orbital', 'spiral', 'curlNoise'],
      simulations: ['particle', 'boids'],
      trailAmount: 0.6,
      speed: 0.8,
    });
    api.setPreset(preset);
    api.setGlyphLanguage('cosmic');
    api.setControl('symmetry', 8);
    api.log('Galaxy scene');
  },
  update(api) {
    api.setControl('spiralAmount', 0.4 + Math.sin(api.getTime() * 0.2) * 0.3);
  },
};
