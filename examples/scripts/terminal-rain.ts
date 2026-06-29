import type { ScriptModule } from '../../src/scripting';

export const terminalRain: ScriptModule = {
  id: 'terminal-rain',
  name: 'Terminal Rain',
  description: 'Matrix-style falling glyphs with wind motion.',
  init(api) {
    const preset = api.createPreset({
      id: 'script-terminal-rain',
      name: 'Terminal Rain',
      basePresetId: 'basic',
      glyphLanguage: 'technical',
      motions: ['wind', 'flowField'],
      plugins: [
        { id: 'trails', type: 'effect' },
        { id: 'wave', type: 'effect' },
      ],
      trailAmount: 0.85,
      speed: 1.8,
      glitchAmount: 0.05,
    });
    api.setPreset(preset);
    api.setGlyphLanguage('technical');
    api.enableMotion('wind');
    api.setControl('density', 1.4);
    api.log('Terminal rain — dense glyph fall');
  },
  update(api) {
    api.setControl('trailAmount', 0.7 + Math.sin(api.getTime() * 2) * 0.15);
  },
};
