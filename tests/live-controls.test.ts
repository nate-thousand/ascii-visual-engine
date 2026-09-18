import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CONTROL_CONSUMERS, listLiveControls } from '../src/core/liveControls';
import { listPresets, getPreset } from '../src/presets';
import { getDevicePresetMapping } from '../src/input/devicePresets';

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

  it('every built in preset declares exactly the controls its composition reads', () => {
    for (const preset of listPresets()) {
      const live = new Set(listLiveControls(preset));
      const declared = new Set(preset.controls.map((c) => c.name));
      const dead = Array.from(declared).filter((n) => !live.has(n));
      const missing = Array.from(live).filter((n) => !declared.has(n));
      expect(dead, `${preset.id} declares controls nothing reads`).toEqual([]);
      expect(missing, `${preset.id} reads controls it does not declare`).toEqual([]);
    }
  });

  it('every audio and MIDI mapping writes a control its preset reads', () => {
    for (const preset of listPresets()) {
      const live = new Set(listLiveControls(preset));
      const dead: string[] = [];
      for (const m of preset.audioMapping?.mappings ?? []) {
        if (m.target.type === 'control' && !live.has(m.target.control)) dead.push(`audio ${m.feature} -> ${m.target.control}`);
      }
      // Same expansion InputManager.applyPresetConfig does.
      const config = preset.inputMapping;
      const base = config ? getDevicePresetMapping(config.devicePreset ?? 'genericKeyboard') : null;
      const input = config && base ? { ...base, ...config, ccMappings: config.ccMappings?.length ? config.ccMappings : base.ccMappings } : null;
      for (const cc of input?.ccMappings ?? []) {
        if (cc.target.type === 'control' && !live.has(cc.target.control)) dead.push(`cc${cc.controller} -> ${cc.target.control}`);
      }
      const wheel = input?.modWheel;
      if (wheel?.type === 'control' && !live.has(wheel.control)) dead.push(`modWheel -> ${wheel.control}`);
      expect(dead, `${preset.id} maps into controls nothing reads`).toEqual([]);
    }
  });

  it('keeps an author declared range for a live control', () => {
    const terminal = getPreset('terminal');
    const density = terminal.controls.find((c) => c.name === 'density');
    expect(density?.default).toBe(1.2);
  });
});
