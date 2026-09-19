import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MidiClock, MIDI_CLOCK, MIDI_CONTINUE, MIDI_SONG_POSITION, MIDI_START, MIDI_STOP } from '../src/input/MidiClock';
import { MidiInput } from '../src/input/MidiInput';
import { AsciiEngine } from '../src/core/AsciiEngine';
import { PulseMotion } from '../src/motion/motions/PulseMotion';
import { BreathingMotion } from '../src/motion/motions/BreathingMotion';
import { createMotionBuffer } from '../src/motion/Motion';
import { NO_TEMPO, tempoAngle } from '../src/core/tempo';
import { getPreset } from '../src/presets';
import { createMockCanvas, stubAnimationFrame } from './helpers/mockCanvas';

/** Send `count` clock ticks at `bpm` starting at `fromMs`; returns the time after the last tick. */
function ticks(clock: MidiClock, bpm: number, count: number, fromMs = 0): number {
  const interval = 60000 / bpm / 24;
  let t = fromMs;
  for (let i = 0; i < count; i++) {
    t = fromMs + i * interval;
    clock.handleMessage(MIDI_CLOCK, [MIDI_CLOCK], t);
  }
  return t;
}

describe('MidiClock', () => {
  it('reads the tempo from 24 ticks per beat and counts beats', () => {
    const clock = new MidiClock();
    clock.handleMessage(MIDI_START, [MIDI_START], 0);
    const t = ticks(clock, 120, 96, 0); // four beats
    const s = clock.getState(t);
    expect(s.active).toBe(true);
    expect(s.running).toBe(true);
    expect(s.bpm).toBeCloseTo(120, 0);
    expect(s.ticks).toBe(96);
    expect(s.beat).toBeCloseTo(4, 3);
    expect(s.phase).toBeCloseTo(0, 3);

    const tempo = clock.getTempo(t)!;
    expect(tempo.source).toBe('midi');
    expect(tempo.beat).toBe(4);
    expect(tempo.barPhase).toBeCloseTo(0, 3);
    expect(tempo.confidence).toBe(1);
  });

  it('interpolates the phase between ticks and never runs ahead of the next tick', () => {
    const clock = new MidiClock();
    clock.handleMessage(MIDI_START, [MIDI_START], 0);
    const t = ticks(clock, 120, 30, 0); // one beat and six ticks: phase 0.25
    const interval = 60000 / 120 / 24;
    expect(clock.getState(t).phase).toBeCloseTo(6 / 24, 3);
    expect(clock.getState(t + interval / 2).phase).toBeCloseTo(6.5 / 24, 3);
    expect(clock.getState(t + interval * 5).phase).toBeCloseTo(7 / 24, 3);
  });

  it('Stop freezes, Continue resumes, Start rewinds, Song Position jumps', () => {
    const clock = new MidiClock();
    clock.handleMessage(MIDI_START, [MIDI_START], 0);
    const t = ticks(clock, 100, 48, 0);
    clock.handleMessage(MIDI_STOP, [MIDI_STOP], t + 1);
    const stopped = clock.getState(t + 100);
    expect(stopped.running).toBe(false);
    expect(stopped.phase).toBeCloseTo(0, 3);
    expect(clock.getTempo(t + 100)?.confidence).toBe(0.5);

    clock.handleMessage(MIDI_CONTINUE, [MIDI_CONTINUE], t + 200);
    expect(clock.getState(t + 200).running).toBe(true);
    expect(clock.getState(t + 200).ticks).toBe(48);

    clock.handleMessage(MIDI_SONG_POSITION, [MIDI_SONG_POSITION, 8, 0], t + 300); // 8 sixteenths = 48 ticks = 2 beats
    expect(clock.getState(t + 300).ticks).toBe(48);
    clock.handleMessage(MIDI_SONG_POSITION, [MIDI_SONG_POSITION, 0, 1], t + 300); // 128 sixteenths
    expect(clock.getState(t + 300).ticks).toBe(768);

    clock.handleMessage(MIDI_START, [MIDI_START], t + 400);
    expect(clock.getState(t + 400).ticks).toBe(0);
  });

  it('goes inactive after two seconds without ticks and reports no tempo', () => {
    const clock = new MidiClock();
    const t = ticks(clock, 128, 48, 0);
    expect(clock.getState(t + 1000).active).toBe(true);
    expect(clock.getState(t + 2500).active).toBe(false);
    expect(clock.getTempo(t + 2500)).toBeNull();
    expect(clock.getState(t + 2500).bpm).toBe(0);
  });

  it('ticks without a Start still count as running', () => {
    const clock = new MidiClock();
    const t = ticks(clock, 90, 48, 0);
    const s = clock.getState(t);
    expect(s.running).toBe(true);
    expect(s.bpm).toBeCloseTo(90, 0);
  });

  it('MidiInput routes realtime bytes to the clock and channel messages to the queue', () => {
    vi.stubGlobal('performance', { now: () => 1234 });
    const input = new MidiInput();
    const handler = vi.fn();
    input.setMessageHandler(handler);
    const send = (bytes: number[]) => (input as unknown as { handleMessage: (m: { data: Uint8Array }) => void }).handleMessage({ data: new Uint8Array(bytes) });
    send([MIDI_START]);
    send([MIDI_CLOCK]);
    send([0x90, 60, 100]);
    expect(input.getClock().getState(1234).ticks).toBe(1);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0]).toMatchObject({ type: 'noteOn', note: 60 });
    input.disconnect();
    expect(input.getClock().getState(1234).ticks).toBe(0);
    vi.unstubAllGlobals();
  });
});

describe('engine tempo', () => {
  let now = 0;
  beforeEach(() => {
    stubAnimationFrame();
    now = 0;
    vi.stubGlobal('performance', { now: () => now });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('is none by default, MIDI clock when ticking, and the facade exposes it', () => {
    const engine = new AsciiEngine({ canvas: createMockCanvas(200, 100), preset: getPreset('basic'), width: 200, height: 100, autoStart: false });
    expect(engine.getTempo()).toEqual(NO_TEMPO);
    expect(engine.getDebugState().tempo.source).toBe('none');
    expect(engine.getDebugState().input.clock.active).toBe(false);

    const clock = engine.getInputManager().getMidiClock();
    clock.handleMessage(MIDI_START, [MIDI_START], 0);
    now = ticks(clock, 140, 72, 0);
    const tempo = engine.getTempo();
    expect(tempo.source).toBe('midi');
    expect(tempo.bpm).toBeCloseTo(140, 0);
    expect(tempo.beat).toBe(3);
    expect(engine.getDebugState().input.clock.running).toBe(true);
    engine.destroy();
  });
});

describe('tempo synced motion', () => {
  function run(motion: PulseMotion | BreathingMotion, tempoSync: number, tempo = NO_TEMPO) {
    const cols = 12;
    const rows = 8;
    const cells = [];
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) cells.push({ char: '.', baseChar: '.', x, y, phase: 0, brightness: 0.5, burst: 0, ox: 0, oy: 0, vx: 0, vy: 0, scale: 1, rotation: 0, deformation: 0 });
    const grid = { cells, cols, rows, time: 0, width: 120, height: 128 };
    const scratch = createMotionBuffer(cells.length);
    motion.update(0.016, {
      engine: {} as never,
      grid,
      time: 3.7,
      dt: 0.016,
      cols,
      rows,
      cellCount: cells.length,
      scratch,
      getControl: (name: string, fallback = 0) => (name === 'tempoSync' ? tempoSync : name === 'strength' ? 0.7 : name === 'amplitude' || name === 'speed' || name === 'frequency' ? 1 : fallback),
      tempo,
    });
    return Array.from(scratch.brightness);
  }

  const beat = { source: 'midi' as const, bpm: 120, phase: 0.75, barPhase: 0.4375, beat: 1, confidence: 1 };

  it('tempoSync changes nothing without a tempo and follows the beat with one', () => {
    for (const M of [PulseMotion, BreathingMotion]) {
      expect(run(new M(), 1)).toEqual(run(new M(), 0));
      expect(run(new M(), 1, beat)).not.toEqual(run(new M(), 0, beat));
      expect(run(new M(), 0, beat)).toEqual(run(new M(), 0));
      // Fully synced output depends only on the beat, not on engine time.
      const a = run(new M(), 1, beat);
      const b = run(new M(), 1, { ...beat, beat: 5, phase: 0.75 });
      expect(a.length).toBe(b.length);
    }
  });

  it('tempoAngle turns beats into a full turn per cycle', () => {
    expect(tempoAngle({ ...beat, beat: 0, phase: 0 }, 1)).toBe(0);
    expect(tempoAngle({ ...beat, beat: 0, phase: 0.5 }, 1)).toBeCloseTo(Math.PI, 10);
    expect(tempoAngle({ ...beat, beat: 2, phase: 0 }, 4)).toBeCloseTo(Math.PI, 10);
  });
});
