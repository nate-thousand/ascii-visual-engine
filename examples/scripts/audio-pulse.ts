import type { ScriptModule } from '../../src/scripting';

export const audioPulse: ScriptModule = {
  id: 'audio-pulse',
  name: 'Audio Pulse',
  description: 'Pulse motion driven by audio amplitude.',
  init(api) {
    api.setPresetById('audioFullSpectrum');
    api.enableMotion('pulse');
    api.on('audio', (data) => {
      const { amplitude = 0, bass = 0 } = data as { amplitude?: number; bass?: number };
      api.setControl('speed', 0.5 + amplitude * 2);
      api.setMotionWeight('pulse', 0.3 + bass);
    });
    api.log('Audio pulse — enable microphone');
  },
};
