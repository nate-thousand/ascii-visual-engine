import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CONTROL_CONSUMERS, listLiveControls } from '../src/core/liveControls';
import { listPresets, getPreset } from '../src/presets';

const ROOT = join(__dirname, '..', 'src');

/** id -> sorted control names read via getControl() in each file of a directory. */
function scan(dir: string): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const file of readdirSync(join(ROOT, dir))) {
    if (!file.endsWith('.ts')) continue;
    const text = readFileSync(join(ROOT, dir, file), 'utf8');
    const id = text.match(/readonly id = '([a-zA-Z]+)'/)?.[1];
    if (!id) continue;
    const reads = new Set<string>();
    for (const m of text.matchAll(/getControl\('([a-zA-Z]+)'/g)) {
      if (m[1] !== 'speed' && m[1] !== 'density') reads.add(m[1]);
    }
    out[id] = Array.from(reads).sort();
  }
  return out;
}

function sortedTable(table: Record<string, readonly string[]>): Record<string, string[]> {
  return Object.fromEntries(Object.entries(table).map(([k, v]) => [k, [...v].sort()]));
}

describe('CONTROL_CONSUMERS matches the source', () => {
  it('motions', () => {
    expect(sortedTable(CONTROL_CONSUMERS.motion)).toEqual(scan('motion/motions'));
  });

  it('simulations', () => {
    expect(sortedTable(CONTROL_CONSUMERS.simulation)).toEqual(scan('simulation/simulations'));
  });

  it('post passes', () => {
    expect(sortedTable(CONTROL_CONSUMERS.post)).toEqual(scan('postprocessing'));
  });

  it('patterns (keyed by plugin id)', () => {
    const scanned = scan('patterns');
    const expected: Record<string, string[]> = {};
    for (const [id, reads] of Object.entries(scanned)) {
      expected[id === 'wave' ? 'wavePattern' : id] = reads;
    }
    expect(sortedTable(CONTROL_CONSUMERS.pattern)).toEqual(expected);
  });
});

describe('listLiveControls', () => {
  it('always includes the globals', () => {
    for (const preset of listPresets()) {
      const live = listLiveControls(preset);
      expect(live).toContain('density');
      expect(live).toContain('speed');
    }
  });

  it('follows the preset composition', () => {
    const bloom = listLiveControls(getPreset('glyphOrganicBloom'));
    expect(bloom).toEqual(
      expect.arrayContaining(['strength', 'frequency', 'amplitude', 'symmetry', 'petals', 'cellularAmount', 'trailAmount']),
    );
    expect(bloom).not.toContain('gravity');
    expect(bloom).not.toContain('simStrength');

    const particles = listLiveControls(getPreset('particleSim'));
    expect(particles).toContain('simSpawnRate');

    const audio = listLiveControls(getPreset('audioBass'));
    expect(audio).toContain('audioAttack');
    expect(listLiveControls(getPreset('basic'))).not.toContain('audioAttack');
  });

  it('every hero preset declares only live controls', () => {
    const heroes = ['glyphOrganicBloom', 'glyphDigitalForest', 'glyphCrtTerminal', 'glyphCorruptedBroadcast', 'glyphFlowField', 'glyphMinimalZen'] as const;
    for (const id of heroes) {
      const preset = getPreset(id);
      const live = new Set(listLiveControls(preset));
      const dead = preset.controls.map((c) => c.name).filter((n) => !live.has(n));
      expect(dead, `${id} declares controls nothing reads`).toEqual([]);
    }
  });
});
