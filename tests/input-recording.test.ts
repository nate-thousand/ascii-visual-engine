import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  InputRecorder,
  InputPlayer,
  serializeInputRecording,
  parseInputRecording,
  type InputRecording,
} from '../src/input/InputRecorder';
import { InputManager } from '../src/input/InputManager';
import type { InputEvent } from '../src/input/InputTypes';
import type { PointerLike, PointerTarget } from '../src/input/PointerInput';
import { AsciiEngine } from '../src/core/AsciiEngine';
import { createEngine } from '../src/core/createEngine';
import { createMockCanvas, stubAnimationFrame, gridFingerprint } from './helpers/mockCanvas';

const ev = (type: InputEvent['type'], note: number, extra: Partial<InputEvent> = {}): InputEvent => ({
  type,
  source: 'midi',
  channel: 0,
  note,
  velocity: type === 'noteOn' ? 100 : 0,
  timestamp: 0,
  ...extra,
});

function fakeTarget() {
  const listeners = new Map<string, Set<(e: PointerLike) => void>>();
  const target: PointerTarget & { fire: (type: string, e: PointerLike) => void } = {
    style: {},
    addEventListener: (type, l) => {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)!.add(l);
    },
    removeEventListener: (type, l) => listeners.get(type)?.delete(l),
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }),
    fire: (type, e) => listeners.get(type)?.forEach((l) => l(e)),
  };
  return target;
}

function fakeEngine() {
  const calls: string[] = [];
  return {
    calls,
    bridge: {
      setControl: (name: string, value: number) => calls.push(`control:${name}=${value.toFixed(2)}`),
      getControl: () => 0,
      getLayerManager: () => ({}) as never,
      getPostProcessor: () => ({}) as never,
      noteOn: (e: { id?: number }) => calls.push(`on:${e.id}`),
      noteOff: (e: { id?: number }) => calls.push(`off:${e.id}`),
      enablePlugin: () => {},
      disablePlugin: () => {},
      getPlugin: () => undefined,
    },
  };
}

describe('InputRecorder', () => {
  it('stamps events with the take clock and stops with a plain document', () => {
    const rec = new InputRecorder();
    expect(rec.getStatus()).toEqual({ state: 'idle', eventCount: 0, duration: 0 });
    rec.record(ev('noteOn', 60));
    expect(rec.getStatus().eventCount).toBe(0);

    rec.start();
    rec.record(ev('noteOn', 60));
    rec.advance(0.5);
    rec.record(ev('noteOff', 60));
    rec.advance(0.25);
    rec.record(ev('controlChange', 0, { note: undefined, controller: 1, value: 0.5 }));
    expect(rec.getStatus()).toMatchObject({ state: 'recording', eventCount: 3, duration: 0.75 });

    const take = rec.stop('take one');
    expect(take.version).toBe(1);
    expect(take.name).toBe('take one');
    expect(take.duration).toBe(0.75);
    expect(take.events.map((e) => [e.t, e.event.type])).toEqual([
      [0, 'noteOn'],
      [0.5, 'noteOff'],
      [0.75, 'controlChange'],
    ]);
    expect(rec.getStatus()).toEqual({ state: 'idle', eventCount: 0, duration: 0.75 });

    rec.start();
    rec.record(ev('noteOn', 1));
    rec.cancel();
    // A cancelled take leaves the last finished one's length on the status.
    expect(rec.getStatus()).toEqual({ state: 'idle', eventCount: 0, duration: 0.75 });
  });

  it('round trips through JSON and rejects bad documents with the first problem', () => {
    const rec = new InputRecorder();
    rec.start();
    rec.record(ev('noteOn', 60, { source: 'keyboard' }));
    rec.advance(1);
    const take = rec.stop();
    const parsed = parseInputRecording(serializeInputRecording(take));
    expect(parsed).toEqual(take);
    expect(parseInputRecording({ version: 1, duration: 0, events: [] }).events).toEqual([]);

    expect(() => parseInputRecording('[]')).toThrow('not an object');
    expect(() => parseInputRecording({ version: 2, duration: 1, events: [] })).toThrow('version 2');
    expect(() => parseInputRecording({ version: 1, duration: -1, events: [] })).toThrow('duration');
    expect(() => parseInputRecording({ version: 1, duration: 1, events: {} })).toThrow('array');
    expect(() => parseInputRecording({ version: 1, duration: 1, events: [{ t: 'a' }] })).toThrow('events[0].t');
    expect(() => parseInputRecording({ version: 1, duration: 1, events: [{ t: 0, event: { type: 'zap', source: 'midi', channel: 0 } }] })).toThrow('"zap"');
    expect(() => parseInputRecording({ version: 1, duration: 1, events: [{ t: 0, event: { type: 'noteOn', source: 'osc', channel: 0 } }] })).toThrow('"osc"');
    expect(() => parseInputRecording({ version: 1, duration: 1, events: [{ t: 0, event: { type: 'noteOn', source: 'midi' } }] })).toThrow('channel');
  });
});

describe('InputPlayer', () => {
  const take: InputRecording = {
    version: 1,
    duration: 1,
    events: [
      { t: 0, event: ev('noteOn', 60) },
      { t: 0.3, event: ev('noteOn', 64) },
      { t: 0.5, event: ev('noteOff', 60) },
      { t: 0.9, event: ev('controlChange', 0, { note: undefined, controller: 7, value: 1 }) },
    ],
  };

  it('delivers events as the clock passes them, with fresh timestamps and the replayed flag', () => {
    const player = new InputPlayer();
    expect(player.play()).toBe(false);
    player.load(take);
    expect(player.play()).toBe(true);
    expect(player.getStatus()).toMatchObject({ state: 'playing', position: 0, duration: 1, eventCount: 4, index: 0 });

    let out = player.advance(0.1, 1000);
    expect(out.map((e) => `${e.type}:${e.note}`)).toEqual(['noteOn:60']);
    expect(out[0]).toMatchObject({ timestamp: 1000, replayed: true });
    expect(player.advance(0.1, 1001)).toEqual([]);
    out = player.advance(0.3, 1002);
    expect(out.map((e) => `${e.type}:${e.note}`)).toEqual(['noteOn:64', 'noteOff:60']);
    out = player.advance(0.5, 1003);
    // The end releases the note still held: 64 was never turned off in the take.
    expect(out.map((e) => `${e.type}:${e.note ?? e.controller}`)).toEqual(['controlChange:7', 'noteOff:64']);
    expect(player.getStatus().state).toBe('idle');
    expect(player.advance(1, 1004)).toEqual([]);
  });

  it('loops with held notes released at the wrap, honors speed, pause, seek, and stop', () => {
    const player = new InputPlayer();
    player.load(take);
    player.play({ loop: true, speed: 2 });
    let out = player.advance(0.25, 0); // position 0.5
    expect(out.map((e) => `${e.type}:${e.note}`)).toEqual(['noteOn:60', 'noteOn:64', 'noteOff:60']);
    player.pause();
    expect(player.advance(1, 0)).toEqual([]);
    expect(player.getStatus().state).toBe('paused');
    player.resume();
    out = player.advance(0.3, 0); // position 1.1: wraps, 64 released, then t=0 fires again
    expect(out.map((e) => `${e.type}:${e.note ?? e.controller}`)).toEqual(['controlChange:7', 'noteOff:64', 'noteOn:60']);
    expect(player.getStatus().position).toBeCloseTo(0.1);
    expect(player.getStatus().loop).toBe(true);

    const released = player.seek(0.8);
    expect(released.map((e) => `${e.type}:${e.note}`)).toEqual(['noteOff:60']);
    expect(player.getStatus()).toMatchObject({ position: 0.8, index: 3 });
    out = player.advance(0.1, 0); // 1.0: cc fires, wrap, noteOn 60 again
    expect(out.map((e) => `${e.type}:${e.note ?? e.controller}`)).toEqual(['controlChange:7', 'noteOn:60']);
    const stopped = player.stop();
    expect(stopped.map((e) => `${e.type}:${e.note}`)).toEqual(['noteOff:60']);
    expect(player.getStatus()).toMatchObject({ state: 'idle', position: 0, index: 0 });
    expect(player.stop()).toEqual([]);
  });
});

describe('InputManager recording and playback', () => {
  it('records what devices send, exactly once per event, and replays it through the mapper', () => {
    const { bridge, calls } = fakeEngine();
    const manager = new InputManager();
    manager.setEngine(bridge);
    const target = fakeTarget();
    manager.enablePointer(target);

    manager.startInputRecording();
    target.fire('pointerdown', { pointerId: 1, clientX: 25, clientY: 50 });
    manager.processQueuedEvents(0.5, 0);
    target.fire('pointerup', { pointerId: 1, clientX: 25, clientY: 50 });
    manager.processQueuedEvents(0.5, 16);
    // A device event reaches the mapper once, not once now and again on the frame.
    expect(calls).toEqual(['on:1001', 'off:1001']);
    expect(manager.getDebugState().recording).toMatchObject({ state: 'recording', eventCount: 2 });

    const take = manager.stopInputRecording();
    expect(take.events.map((e) => [e.t, e.event.type, e.event.source])).toEqual([
      [0, 'noteOn', 'pointer'],
      [0.5, 'noteOff', 'pointer'],
    ]);
    expect(manager.getInputRecording()).toBe(take);

    calls.length = 0;
    expect(manager.playInputRecording()).toBe(true);
    manager.processQueuedEvents(0.1, 100);
    expect(calls).toEqual(['on:1001']);
    manager.processQueuedEvents(0.5, 200);
    expect(calls).toEqual(['on:1001', 'off:1001']);
    manager.processQueuedEvents(0.5, 300);
    expect(manager.getDebugState().playback.state).toBe('idle');
    expect(manager.getDebugState().lastEvent).toMatchObject({ type: 'noteOff', replayed: true });

    // Replayed events are not recorded into a new take; live ones are.
    manager.startInputRecording();
    manager.playInputRecording(undefined, { loop: true });
    manager.processQueuedEvents(0.1, 400);
    target.fire('pointerdown', { pointerId: 2, clientX: 0, clientY: 0 });
    expect(manager.getInputRecordingStatus().eventCount).toBe(1);
    manager.stopInputPlayback();
    expect(calls.at(-1)).toBe('off:1001');
    manager.cancelInputRecording();
    manager.destroy();
  });

  it('playInputRecording with an explicit take loads it; stop releases held notes; seek', () => {
    const { bridge, calls } = fakeEngine();
    const manager = new InputManager();
    manager.setEngine(bridge);
    const take: InputRecording = {
      version: 1,
      duration: 2,
      events: [
        { t: 0, event: ev('noteOn', 40) },
        { t: 1, event: ev('controlChange', 0, { note: undefined, controller: 1, value: 0.5 }) },
      ],
    };
    expect(manager.playInputRecording(take, { speed: 1 })).toBe(true);
    manager.processQueuedEvents(0.1, 0);
    expect(calls).toEqual(['on:40']);
    manager.seekInputPlayback(1.5);
    expect(calls).toEqual(['on:40', 'off:40']);
    manager.processQueuedEvents(0.1, 0);
    expect(manager.getInputPlaybackStatus().position).toBeCloseTo(1.6);
    manager.pauseInputPlayback();
    manager.processQueuedEvents(5, 0);
    expect(manager.getInputPlaybackStatus().state).toBe('paused');
    manager.resumeInputPlayback();
    manager.stopInputPlayback();
    expect(manager.getInputPlaybackStatus().state).toBe('idle');
    expect(manager.getInputRecording()).toBe(take);
    manager.destroy();
  });
});

describe('engine input recording', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function boot() {
    vi.unstubAllGlobals();
    const clock = stubAnimationFrame();
    const engine = new AsciiEngine({
      canvas: createMockCanvas(240, 160),
      width: 240,
      height: 160,
      autoStart: false,
      seed: 7,
      fixedTimestep: 20,
    });
    engine.getPerformanceManager().setAdaptiveQuality(false);
    engine.start();
    return { engine, clock };
  }

  it('a take replayed under the same seed and timestep reproduces the frames', () => {
    const notes: string[] = [];
    const a = boot();
    a.engine.on('noteOn', (n) => notes.push(`on:${n.id}`));
    const target = fakeTarget();
    a.engine.enablePointerInput(target);
    a.engine.startInputRecording();
    a.clock.advanceFrames(2);
    target.fire('pointerdown', { pointerId: 1, clientX: 50, clientY: 50 });
    a.clock.advanceFrames(3);
    target.fire('pointerup', { pointerId: 1, clientX: 50, clientY: 50 });
    a.clock.advanceFrames(5);
    const take = a.engine.stopInputRecording('rehearsal');
    expect(take.duration).toBeCloseTo(0.5);
    expect(take.events).toHaveLength(2);
    expect(notes).toEqual(['on:1001']);
    const live = gridFingerprint(a.engine.getRendererManager().getGridState(0).cells);
    a.engine.destroy();

    const b = boot();
    b.engine.on('noteOn', (n) => notes.push(`replay:${n.id}`));
    expect(b.engine.playInputRecording(take)).toBe(true);
    expect(b.engine.getDebugState().input.playback.state).toBe('playing');
    b.clock.advanceFrames(9);
    expect(notes).toEqual(['on:1001', 'replay:1001']);
    expect(b.engine.getInputPlaybackStatus().state).toBe('playing');
    b.clock.advanceFrames(1);
    expect(b.engine.getInputPlaybackStatus().state).toBe('idle');
    // Same seed, same timestep, same input: the same picture after the same frame count.
    const c = boot();
    c.engine.playInputRecording(take);
    c.clock.advanceFrames(10);
    expect(gridFingerprint(c.engine.getRendererManager().getGridState(0).cells)).toBe(live);
    b.engine.destroy();
    c.engine.destroy();
  });

  it('is on the facade', () => {
    vi.unstubAllGlobals();
    const clock = stubAnimationFrame();
    const handle = createEngine(createMockCanvas(240, 160), { width: 240, height: 160, fixedTimestep: 20 });
    handle.startInputRecording();
    expect(handle.getInputRecordingStatus().state).toBe('recording');
    clock.advanceFrames(2);
    const take = handle.stopInputRecording();
    expect(take.duration).toBeCloseTo(0.1);
    expect(handle.playInputRecording(take, { loop: true })).toBe(true);
    expect(handle.getInputPlaybackStatus()).toMatchObject({ state: 'playing', loop: true });
    handle.stopInputPlayback();
    expect(handle.getInputPlaybackStatus().state).toBe('idle');
    handle.destroy();
  });
});
