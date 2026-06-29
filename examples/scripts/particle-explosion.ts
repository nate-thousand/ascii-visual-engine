import type { ScriptModule } from '../../src/scripting';

export const particleExplosion: ScriptModule = {
  id: 'particle-explosion',
  name: 'Particle Explosion',
  description: 'Explosive bursts on interval and MIDI notes.',
  init(api, ctx) {
    api.setPresetById('particleSim');
    api.enableSimulation('particle');
    ctx.vars.cooldown = 0;
    api.on('noteOn', (data) => {
      const ev = data as { x?: number; y?: number; intensity?: number };
      api.spawnParticles({
        x: ev.x ?? 0.5,
        y: ev.y ?? 0.5,
        intensity: (ev.intensity ?? 1) * 2,
        count: 12,
      });
    });
    api.log('Particle explosion — trigger with Space or MIDI');
  },
  update(api, ctx) {
    let cd = (ctx.vars.cooldown as number) - 1;
    if (cd <= 0) {
      api.spawnParticles({ count: 10, intensity: 1.8 });
      cd = 90;
    }
    ctx.vars.cooldown = cd;
  },
};
