import type { InputEvent } from './InputTypes';

/** The subset of DOM pointer events this plugin reads, so tests can feed plain objects. */
export interface PointerLike {
  pointerId: number;
  clientX: number;
  clientY: number;
  pressure?: number;
  preventDefault?: () => void;
}

/** The subset of an element this plugin needs; a canvas satisfies it. */
export interface PointerTarget {
  addEventListener(type: string, listener: (e: PointerLike) => void): void;
  removeEventListener(type: string, listener: (e: PointerLike) => void): void;
  getBoundingClientRect(): { left: number; top: number; width: number; height: number };
  style?: { touchAction?: string };
}

export interface PointerState {
  /** Normalized position of the most recent pointer, 0 to 1 across the target. */
  x: number;
  y: number;
  /** Any pointer currently down. */
  down: boolean;
  /** Number of pointers currently down. */
  pointers: number;
  /** Pressure of the most recent pointer, 0 to 1 (1 for mice). */
  pressure: number;
}

export interface PointerInputOptions {
  /** Emit `noteOn` on pointer down and `noteOff` on release. Default true. */
  tapToNote?: boolean;
  /** Set `touch-action: none` on the target while enabled so touches do not scroll. Default true. */
  captureTouch?: boolean;
}

/** Pointer note ids sit above the MIDI range so they never collide with a key or pad. */
const POINTER_NOTE_BASE = 1000;

/**
 * Pointer input: mouse, touch, and pen on one element. Position is exposed
 * normalized for hosts and scripts; a press becomes a `noteOn` at that
 * position and a release the matching `noteOff`, through the same
 * `InputEvent` queue as MIDI and the keyboard. Off by default.
 */
export class PointerInput {
  private enabled = false;
  private target: PointerTarget | null = null;
  private options: Required<PointerInputOptions> = { tapToNote: true, captureTouch: true };
  private queue: InputEvent[] = [];
  private onMessage: ((event: InputEvent) => void) | null = null;
  private active = new Map<number, { x: number; y: number }>();
  private state: PointerState = { x: 0.5, y: 0.5, down: false, pointers: 0, pressure: 0 };
  private previousTouchAction: string | undefined;

  private boundDown = (e: PointerLike) => this.handleDown(e);
  private boundMove = (e: PointerLike) => this.handleMove(e);
  private boundUp = (e: PointerLike) => this.handleUp(e);

  enable(target: PointerTarget, options: PointerInputOptions = {}): void {
    if (this.enabled) this.disable();
    this.target = target;
    this.options = { tapToNote: true, captureTouch: true, ...options };
    this.enabled = true;
    target.addEventListener('pointerdown', this.boundDown);
    target.addEventListener('pointermove', this.boundMove);
    target.addEventListener('pointerup', this.boundUp);
    target.addEventListener('pointercancel', this.boundUp);
    target.addEventListener('pointerleave', this.boundUp);
    if (this.options.captureTouch && target.style) {
      this.previousTouchAction = target.style.touchAction;
      target.style.touchAction = 'none';
    }
  }

  disable(): void {
    if (!this.enabled || !this.target) return;
    this.releaseAll();
    const target = this.target;
    target.removeEventListener('pointerdown', this.boundDown);
    target.removeEventListener('pointermove', this.boundMove);
    target.removeEventListener('pointerup', this.boundUp);
    target.removeEventListener('pointercancel', this.boundUp);
    target.removeEventListener('pointerleave', this.boundUp);
    if (this.options.captureTouch && target.style) {
      target.style.touchAction = this.previousTouchAction;
    }
    this.enabled = false;
    this.target = null;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  getState(): PointerState {
    return { ...this.state };
  }

  setMessageHandler(handler: (event: InputEvent) => void): void {
    this.onMessage = handler;
  }

  drainQueue(): InputEvent[] {
    const events = this.queue;
    this.queue = [];
    return events;
  }

  getActiveNotes(): number[] {
    return [...this.active.keys()].map((id) => POINTER_NOTE_BASE + id);
  }

  /** Release every pointer, emitting `noteOff` for each. */
  releaseAll(): InputEvent[] {
    const released: InputEvent[] = [];
    for (const [pointerId, pos] of this.active) {
      const event = this.noteEvent('noteOff', pointerId, pos.x, pos.y, 0);
      released.push(event);
      this.emit(event);
    }
    this.active.clear();
    this.state = { ...this.state, down: false, pointers: 0 };
    return released;
  }

  private normalize(e: PointerLike): { x: number; y: number } {
    const rect = this.target!.getBoundingClientRect();
    const x = rect.width > 0 ? (e.clientX - rect.left) / rect.width : 0;
    const y = rect.height > 0 ? (e.clientY - rect.top) / rect.height : 0;
    return { x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) };
  }

  private pressureOf(e: PointerLike): number {
    // Mice report 0.5 while down in most browsers; treat anything unknown as full.
    const p = e.pressure;
    return typeof p === 'number' && p > 0 ? Math.min(1, p) : 1;
  }

  private handleDown(e: PointerLike): void {
    e.preventDefault?.();
    const pos = this.normalize(e);
    this.active.set(e.pointerId, pos);
    const pressure = this.pressureOf(e);
    this.state = { ...pos, down: true, pointers: this.active.size, pressure };
    if (this.options.tapToNote) {
      this.emit(this.noteEvent('noteOn', e.pointerId, pos.x, pos.y, Math.round(pressure * 127)));
    }
  }

  private handleMove(e: PointerLike): void {
    const pos = this.normalize(e);
    if (this.active.has(e.pointerId)) this.active.set(e.pointerId, pos);
    this.state = {
      ...pos,
      down: this.active.size > 0,
      pointers: this.active.size,
      pressure: this.active.has(e.pointerId) ? this.pressureOf(e) : 0,
    };
  }

  private handleUp(e: PointerLike): void {
    const pos = this.active.get(e.pointerId);
    if (!pos) return;
    this.active.delete(e.pointerId);
    const current = this.normalize(e);
    this.state = { ...current, down: this.active.size > 0, pointers: this.active.size, pressure: 0 };
    if (this.options.tapToNote) {
      this.emit(this.noteEvent('noteOff', e.pointerId, current.x, current.y, 0));
    }
  }

  private noteEvent(type: 'noteOn' | 'noteOff', pointerId: number, x: number, y: number, velocity: number): InputEvent {
    return {
      type,
      source: 'pointer',
      channel: 0,
      note: POINTER_NOTE_BASE + pointerId,
      velocity,
      x,
      y,
      timestamp: typeof performance !== 'undefined' ? performance.now() : Date.now(),
    };
  }

  private emit(event: InputEvent): void {
    this.queue.push(event);
    this.onMessage?.(event);
  }
}
