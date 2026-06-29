import type { InputEvent } from './InputTypes';
import { mapMidiToNoteEvent } from './InputTypes';

const KEY_SEMITONE: Record<string, number> = {
  a: 0,
  w: 1,
  s: 2,
  e: 3,
  d: 4,
  f: 5,
  t: 6,
  g: 7,
  y: 8,
  h: 9,
  u: 10,
  j: 11,
  k: 12,
  o: 13,
  l: 14,
  p: 15,
  ';': 16,
};

const DEFAULT_VELOCITY = 100;
const BASE_NOTE = 60;

export class KeyboardInput {
  private enabled = false;
  private octaveOffset = 0;
  private velocity = DEFAULT_VELOCITY;
  private activeKeys = new Map<string, number>();
  private queue: InputEvent[] = [];
  private onMessage: ((event: InputEvent) => void) | null = null;
  private boundKeyDown: (e: KeyboardEvent) => void;
  private boundKeyUp: (e: KeyboardEvent) => void;
  private boundBlur: () => void;

  constructor() {
    this.boundKeyDown = (e) => this.handleKeyDown(e);
    this.boundKeyUp = (e) => this.handleKeyUp(e);
    this.boundBlur = () => this.releaseAll();
  }

  enable(): void {
    if (this.enabled || typeof window === 'undefined') return;
    this.enabled = true;
    window.addEventListener('keydown', this.boundKeyDown);
    window.addEventListener('keyup', this.boundKeyUp);
    window.addEventListener('blur', this.boundBlur);
  }

  disable(): void {
    if (!this.enabled || typeof window === 'undefined') return;
    this.releaseAll();
    this.enabled = false;
    window.removeEventListener('keydown', this.boundKeyDown);
    window.removeEventListener('keyup', this.boundKeyUp);
    window.removeEventListener('blur', this.boundBlur);
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  setOctaveOffset(offset: number): void {
    this.octaveOffset = offset;
  }

  shiftOctave(delta: number): void {
    this.octaveOffset = Math.max(-3, Math.min(3, this.octaveOffset + delta));
  }

  getOctaveOffset(): number {
    return this.octaveOffset;
  }

  setVelocity(velocity: number): void {
    this.velocity = Math.max(1, Math.min(127, velocity));
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
    return [...this.activeKeys.values()];
  }

  releaseAll(): InputEvent[] {
    const released: InputEvent[] = [];
    const now = performance.now();
    for (const note of this.activeKeys.values()) {
      const event: InputEvent = {
        type: 'noteOff',
        source: 'keyboard',
        channel: 0,
        note,
        velocity: 0,
        timestamp: now,
      };
      released.push(event);
      this.queue.push(event);
      this.onMessage?.(event);
    }
    this.activeKeys.clear();
    return released;
  }

  noteEventToEngineEvent(event: InputEvent) {
    if (event.note === undefined) return null;
    return mapMidiToNoteEvent(
      event.note,
      event.velocity ?? this.velocity,
      event.channel,
      'keyboard',
    );
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;

    if (e.key === '-' || e.key === '_') {
      this.shiftOctave(-1);
      return;
    }
    if (e.key === '=' || e.key === '+') {
      this.shiftOctave(1);
      return;
    }

    const key = e.key.toLowerCase();
    const semitone = KEY_SEMITONE[key];
    if (semitone === undefined) return;

    if (this.activeKeys.has(key)) return;

    e.preventDefault();
    const note = BASE_NOTE + this.octaveOffset * 12 + semitone;
    this.activeKeys.set(key, note);

    const event: InputEvent = {
      type: 'noteOn',
      source: 'keyboard',
      channel: 0,
      note,
      velocity: this.velocity,
      timestamp: performance.now(),
    };
    this.queue.push(event);
    this.onMessage?.(event);
  }

  private handleKeyUp(e: KeyboardEvent): void {
    const key = e.key.toLowerCase();
    if (!this.activeKeys.has(key)) return;

    e.preventDefault();
    const note = this.activeKeys.get(key)!;
    this.activeKeys.delete(key);

    const event: InputEvent = {
      type: 'noteOff',
      source: 'keyboard',
      channel: 0,
      note,
      velocity: 0,
      timestamp: performance.now(),
    };
    this.queue.push(event);
    this.onMessage?.(event);
  }
}
