import type { ScriptModule } from '../../src/scripting';

export const breathingMandala: ScriptModule = {
  id: 'breathing-mandala',
  name: 'Breathing Mandala',
  description: 'Radial symmetry with breathing motion.',
  init(api) {
    const preset = api.createPreset({
      id: 'script-breathing-mandala',
      name: 'Breathing Mandala',
      basePresetId: 'glyphOrganicBloom',
      motions: ['breathing', 'pulse'],
      glyphLanguage: 'sacred',
      symmetry: 12,
      trailAmount: 0.35,
    });
    api.setPreset(preset);
    api.setControl('petals', 12);
    api.log('Breathing mandala');
  },
  update(api) {
    const breath = 0.5 + Math.sin(api.getTime() * 0.8) * 0.5;
    api.setControl('amplitude', breath);
    api.setMotionWeight('breathing', breath);
  },
};
