import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PointerInput, type PointerLike, type PointerTarget } from '../src/input/PointerInput';
import { InputManager } from '../src/input/InputManager';
import { createEngine } from '../src/core/createEngine';
import { createMockCanvas, stubAnimationFrame } from './helpers/mockCanvas';

/** An element that records listeners so a test can fire pointer events by hand. */
function fakeTarget(rect = { left: 100, top: 50, width: 400, height: 200 }) {
  const listeners = new Map<string, Set<(e: PointerLike) => void>>();
  const target: PointerTarget & { fire: (type: string, e: PointerLike) => void; listeners: typeof listeners } = {
    style: { touchAction: 'auto' },
    addEventListener: (type, l) => {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)!.add(l);
    },
    removeEventListener: (type, l) => listeners.get(type)?.delete(l),
    getBoundingClientRect: () => rect,
    fire: (type, e) => listeners.get(type)?.forEach((l) => l(e)),
    listeners,
  };
  return target;
}

const at = (pointerId: number, clientX: number, clientY: number, pressure?: number): PointerLike => ({
  pointerId,
  clientX,
  clientY,
  pressure,
  preventDefault: vi.fn(),
});

describe('PointerInput', () => {
  it('normalizes position to the target rect and tracks press state', () => {
    const target = fakeTarget();
    const input = new PointerInput();
    input.enable(target);
    expect(target.style!.touchAction).toBe('none');

    target.fire('pointermove', at(1, 300, 150));
    expect(input.getState()).toMatchObject({ x: 0.5, y: 0.5, down: false, pointers: 0 });

    target.fire('pointerdown', at(1, 100, 50, 0.5));
    expect(input.getState()).toMatchObject({ x: 0, y: 0, down: true, pointers: 1, pressure: 0.5 });

    target.fire('pointermove', at(1, 900, 900));
    expect(input.getState()).toMatchObject({ x: 1, y: 1, down: true });

    target.fire('pointerup', at(1, 500, 250));
    expect(input.getState()).toMatchObject({ x: 1, y: 1, down: false, pointers: 0 });

    input.disable();
    expect(target.style!.touchAction).toBe('auto');
    expect([...target.listeners.values()].every((s) => s.size === 0)).toBe(true);
  });

  it('a press is a noteOn with position and pressure, a release its noteOff, per pointer', () => {
    const target = fakeTarget();
    const input = new PointerInput();
    const seen: string[] = [];
    input.setMessageHandler((e) => seen.push(`${e.type}:${e.note}:${e.x?.toFixed(2)},${e.y?.toFixed(2)}:v${e.velocity}`));
    input.enable(target);

    target.fire('pointerdown', at(7, 200, 100, 0.25));
    target.fire('pointerdown', at(8, 400, 200));
    expect(input.getActiveNotes()).toEqual([1007, 1008]);
    expect(input.getState().pointers).toBe(2);
    target.fire('pointerup', at(7, 200, 100));
    target.fire('pointercancel', at(8, 400, 200));
    expect(seen).toEqual([
      'noteOn:1007:0.25,0.25:v32',
      'noteOn:1008:0.75,0.75:v127',
      'noteOff:1007:0.25,0.25:v0',
      'noteOff:1008:0.75,0.75:v0',
    ]);
    expect(input.drainQueue()).toHaveLength(4);
    expect(input.drainQueue()).toHaveLength(0);
  });

  it('tapToNote false only tracks position', () => {
    const target = fakeTarget();
    const input = new PointerInput();
    const handler = vi.fn();
    input.setMessageHandler(handler);
    input.enable(target, { tapToNote: false, captureTouch: false });
    expect(target.style!.touchAction).toBe('auto');
    target.fire('pointerdown', at(1, 300, 150));
    expect(handler).not.toHaveBeenCalled();
    expect(input.getState().down).toBe(true);
  });

  it('releaseAll emits noteOff for held pointers', () => {
    const target = fakeTarget();
    const input = new PointerInput();
    input.enable(target);
    target.fire('pointerdown', at(1, 300, 150));
    const released = input.releaseAll();
    expect(released.map((e) => e.type)).toEqual(['noteOff']);
    expect(input.getState()).toMatchObject({ down: false, pointers: 0 });
  });
});

describe('pointer through the engine', () => {
  beforeEach(() => {
    stubAnimationFrame();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('routes a press to engine.noteOn at the pointer position', () => {
    const target = fakeTarget();
    const manager = new InputManager();
    const noteOn = vi.fn();
    const noteOff = vi.fn();
    manager.setEngine({
      setControl: vi.fn(),
      getControl: () => 0,
      getLayerManager: () => ({}) as never,
      getPostProcessor: () => ({}) as never,
      noteOn,
      noteOff,
      enablePlugin: vi.fn(),
      disablePlugin: vi.fn(),
      getPlugin: () => undefined,
    });
    manager.enablePointer(target);
    target.fire('pointerdown', at(3, 200, 100, 1));
    expect(noteOn).toHaveBeenCalledWith(expect.objectContaining({ x: 0.25, y: 0.25, id: 1003 }));
    expect(noteOn.mock.calls[0][0].intensity).toBeCloseTo(2, 5);
    target.fire('pointerup', at(3, 200, 100));
    expect(noteOff).toHaveBeenCalledWith(expect.objectContaining({ x: 0.25, y: 0.25 }));
    expect(manager.getDebugState().pointerEnabled).toBe(true);
    manager.disablePointer();
    expect(manager.getDebugState().pointerEnabled).toBe(false);
  });

  it('is off by default and the facade enables it on the canvas', () => {
    const canvas = Object.assign(createMockCanvas(400, 200), {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 400, height: 200 }),
    });
    const handle = createEngine(canvas, { width: 400, height: 200, autoStart: false });
    expect(handle.engine.isPointerInputEnabled()).toBe(false);
    expect(handle.engine.getDebugState().input.pointer).toMatchObject({ down: false, pointers: 0 });

    handle.enablePointerInput();
    expect(handle.engine.isPointerInputEnabled()).toBe(true);
    expect(canvas.addEventListener).toHaveBeenCalledWith('pointerdown', expect.any(Function));
    const down = canvas.addEventListener.mock.calls.find((c) => c[0] === 'pointerdown')![1] as (e: PointerLike) => void;
    down(at(1, 100, 100));
    expect(handle.getPointerState()).toMatchObject({ x: 0.25, y: 0.5, down: true });
    handle.engine.getDebugState();
    handle.disablePointerInput();
    expect(canvas.removeEventListener).toHaveBeenCalledWith('pointerdown', expect.any(Function));
    handle.destroy();
  });
});
