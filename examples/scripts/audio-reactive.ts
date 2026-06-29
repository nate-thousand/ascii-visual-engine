import type { ScriptModule } from '../../src/scripting';

export const audioReactive: ScriptModule = {
  id: 'audio-reactive',
  name: 'Audio Reactive',
  description: 'Responds to audio features and note events.',
  init(api) {
    api.setPresetById('audioFullSpectrum');
    api.on('audio', (data) => {
      const features = data as { amplitude?: number; bass?: number; beat?: number };
      if (features.amplitude != null) {
        api.setControl('strength', 0.3 + features.amplitude * 1.2);
      }
      if (features.beat != null && features.beat > 0.6) {
        api.spawnParticles({ intensity: features.bass ?? 1 });
      }
    });
    api.on('noteOn', () => api.enablePlugin('burst'));
    api.log('Audio reactive — connect microphone in demo UI');
  },
};
