import type { ScriptModule } from '../../src/scripting';

export const particleBurst: ScriptModule = {
  id: 'particle-burst',
  name: 'Particle Burst',
  description: 'Timed particle bursts on note and frame events.',
  init(api, ctx) {
    const preset = api.createPreset({
      id: 'script-particle-burst',
      name: 'Particle Burst',
      basePresetId: 'basic',
      motions: ['flowField'],
      simulations: ['particle'],
      trailAmount: 0.5,
    });
    api.setPreset(preset);
    api.enableSimulation('particle');
    ctx.vars.burstInterval = 2;
    ctx.vars.lastBurst = api.getTime();
    api.on('noteOn', () => api.spawnParticles({ intensity: 2 }));
    api.log('Particle burst script ready — press Space or wait for auto bursts');
  },
  update(api, ctx) {
    const interval = ctx.vars.burstInterval as number;
    const last = ctx.vars.lastBurst as number;
    if (api.getTime() - last >= interval) {
      ctx.vars.lastBurst = api.getTime();
      api.spawnParticles({
        x: 0.3 + Math.random() * 0.4,
        y: 0.3 + Math.random() * 0.4,
        intensity: 1.2 + Math.random(),
        count: 8,
      });
    }
  },
};
