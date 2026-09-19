import type { InputEvent, InputEventType, InputSource } from './InputTypes';

export const INPUT_RECORDING_VERSION = 1;

/** One performed event, `t` seconds after the recording started. */
export interface RecordedInputEvent {
  t: number;
  event: InputEvent;
}

/** A take: every mapped input event with its offset. Plain JSON. */
export interface InputRecording {
  version: typeof INPUT_RECORDING_VERSION;
  /** Seconds from start to stop. */
  duration: number;
  /** ISO timestamp of the take. */
  recordedAt?: string;
  name?: string;
  events: RecordedInputEvent[];
}

export type InputRecordingState = 'idle' | 'recording';

export interface InputRecordingStatus {
  state: InputRecordingState;
  eventCount: number;
  /** Seconds since start while recording; the last take's length when idle. */
  duration: number;
}

/**
 * Captures every input event the mapper receives, with its offset from the
 * start of the take, so a rehearsal can be replayed by `InputPlayer` without
 * a controller present. Time comes from the engine (`dt` per frame), so a
 * take made under a fixed timestep replays frame for frame.
 */
export class InputRecorder {
  private state: InputRecordingState = 'idle';
  private events: RecordedInputEvent[] = [];
  private elapsed = 0;
  private lastDuration = 0;

  start(): void {
    this.state = 'recording';
    this.events = [];
    this.elapsed = 0;
  }

  /** Advance the take clock by a frame. */
  advance(dt: number): void {
    if (this.state === 'recording') this.elapsed += Math.max(0, dt);
  }

  record(event: InputEvent): void {
    if (this.state !== 'recording') return;
    this.events.push({ t: this.elapsed, event: { ...event } });
  }

  stop(name?: string): InputRecording {
    const recording: InputRecording = {
      version: INPUT_RECORDING_VERSION,
      duration: this.elapsed,
      recordedAt: new Date().toISOString(),
      ...(name ? { name } : {}),
      events: this.events,
    };
    this.lastDuration = this.elapsed;
    this.state = 'idle';
    this.events = [];
    this.elapsed = 0;
    return recording;
  }

  cancel(): void {
    this.state = 'idle';
    this.events = [];
    this.elapsed = 0;
  }

  isRecording(): boolean {
    return this.state === 'recording';
  }

  getStatus(): InputRecordingStatus {
    return {
      state: this.state,
      eventCount: this.events.length,
      duration: this.state === 'recording' ? this.elapsed : this.lastDuration,
    };
  }
}

export type InputPlaybackState = 'idle' | 'playing' | 'paused';

export interface InputPlaybackOptions {
  loop?: boolean;
  /** Playback rate; 2 plays twice as fast. Default 1. */
  speed?: number;
}

export interface InputPlaybackStatus {
  state: InputPlaybackState;
  /** Seconds into the take. */
  position: number;
  duration: number;
  eventCount: number;
  /** Events dispatched so far in this pass. */
  index: number;
  loop: boolean;
  speed: number;
}

/**
 * Replays an `InputRecording` against the engine clock: `advance(dt)` returns
 * the events that fell due this frame, in order, with fresh timestamps and
 * `replayed: true`. Notes still held when playback stops or loops get their
 * `noteOff`, so nothing sticks.
 */
export class InputPlayer {
  private recording: InputRecording | null = null;
  private state: InputPlaybackState = 'idle';
  private position = 0;
  private index = 0;
  private loop = false;
  private speed = 1;
  private held = new Map<string, InputEvent>();

  load(recording: InputRecording): void {
    this.recording = { ...recording, events: [...recording.events].sort((a, b) => a.t - b.t) };
    this.position = 0;
    this.index = 0;
  }

  getRecording(): InputRecording | null {
    return this.recording;
  }

  play(options: InputPlaybackOptions = {}): boolean {
    if (!this.recording) return false;
    this.loop = options.loop ?? false;
    this.speed = options.speed && options.speed > 0 ? options.speed : 1;
    this.position = 0;
    this.index = 0;
    this.held.clear();
    this.state = 'playing';
    return true;
  }

  pause(): void {
    if (this.state === 'playing') this.state = 'paused';
  }

  resume(): void {
    if (this.state === 'paused') this.state = 'playing';
  }

  /** Stop and return the `noteOff` events for anything still held. */
  stop(): InputEvent[] {
    if (this.state === 'idle') return [];
    this.state = 'idle';
    this.position = 0;
    this.index = 0;
    return this.releaseHeld();
  }

  /** Jump to a time; the next `advance()` continues from there. Held notes are released. */
  seek(seconds: number): InputEvent[] {
    if (!this.recording) return [];
    const released = this.releaseHeld();
    this.position = Math.max(0, Math.min(this.recording.duration, seconds));
    this.index = this.recording.events.findIndex((e) => e.t >= this.position);
    if (this.index < 0) this.index = this.recording.events.length;
    return released;
  }

  isActive(): boolean {
    return this.state !== 'idle';
  }

  advance(dt: number, now: number): InputEvent[] {
    if (this.state !== 'playing' || !this.recording) return [];
    const out: InputEvent[] = [];
    this.position += Math.max(0, dt) * this.speed;
    this.emitDue(out, now);

    if (this.position >= this.recording.duration && this.index >= this.recording.events.length) {
      if (this.loop && this.recording.duration > 0) {
        out.push(...this.releaseHeld(now));
        this.position -= this.recording.duration;
        this.index = 0;
        this.emitDue(out, now);
      } else {
        this.state = 'idle';
        this.position = 0;
        this.index = 0;
        out.push(...this.releaseHeld(now));
      }
    }
    return out;
  }

  getStatus(): InputPlaybackStatus {
    return {
      state: this.state,
      position: this.position,
      duration: this.recording?.duration ?? 0,
      eventCount: this.recording?.events.length ?? 0,
      index: this.index,
      loop: this.loop,
      speed: this.speed,
    };
  }

  private emitDue(out: InputEvent[], now: number): void {
    const events = this.recording!.events;
    while (this.index < events.length && events[this.index].t <= this.position) {
      const event: InputEvent = { ...events[this.index].event, timestamp: now, replayed: true };
      this.track(event);
      out.push(event);
      this.index++;
    }
  }

  private track(event: InputEvent): void {
    if (event.note === undefined) return;
    const key = `${event.channel}:${event.note}`;
    if (event.type === 'noteOn') this.held.set(key, event);
    else if (event.type === 'noteOff') this.held.delete(key);
  }

  private releaseHeld(now = 0): InputEvent[] {
    const out: InputEvent[] = [];
    for (const on of this.held.values()) {
      out.push({ ...on, type: 'noteOff', velocity: 0, timestamp: now, replayed: true });
    }
    this.held.clear();
    return out;
  }
}

const EVENT_TYPES = new Set<InputEventType>(['noteOn', 'noteOff', 'controlChange', 'pitchBend', 'aftertouch']);
const SOURCES = new Set<InputSource>(['midi', 'keyboard', 'pointer']);

/** A recording as JSON text. */
export function serializeInputRecording(recording: InputRecording): string {
  return JSON.stringify(recording, null, 2);
}

/** Parse and validate JSON (text or object) as an `InputRecording`; throws with the first problem. */
export function parseInputRecording(input: string | unknown): InputRecording {
  const raw = typeof input === 'string' ? JSON.parse(input) : input;
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new Error('[parseInputRecording] not an object');
  }
  const r = raw as Record<string, unknown>;
  if (r.version !== INPUT_RECORDING_VERSION) {
    throw new Error(`[parseInputRecording] unsupported version ${String(r.version)}`);
  }
  if (typeof r.duration !== 'number' || !(r.duration >= 0)) {
    throw new Error('[parseInputRecording] duration must be a non negative number');
  }
  if (!Array.isArray(r.events)) throw new Error('[parseInputRecording] events must be an array');
  const events: RecordedInputEvent[] = r.events.map((entry, i) => {
    const e = entry as { t?: unknown; event?: Record<string, unknown> };
    if (typeof e?.t !== 'number' || !(e.t >= 0)) throw new Error(`[parseInputRecording] events[${i}].t must be a non negative number`);
    const ev = e.event;
    if (typeof ev !== 'object' || ev === null) throw new Error(`[parseInputRecording] events[${i}].event missing`);
    if (!EVENT_TYPES.has(ev.type as InputEventType)) throw new Error(`[parseInputRecording] events[${i}].event.type "${String(ev.type)}" unknown`);
    if (!SOURCES.has(ev.source as InputSource)) throw new Error(`[parseInputRecording] events[${i}].event.source "${String(ev.source)}" unknown`);
    if (typeof ev.channel !== 'number') throw new Error(`[parseInputRecording] events[${i}].event.channel must be a number`);
    return { t: e.t, event: { ...(ev as unknown as InputEvent), timestamp: typeof ev.timestamp === 'number' ? ev.timestamp : 0 } };
  });
  return {
    version: INPUT_RECORDING_VERSION,
    duration: r.duration,
    ...(typeof r.recordedAt === 'string' ? { recordedAt: r.recordedAt } : {}),
    ...(typeof r.name === 'string' ? { name: r.name } : {}),
    events,
  };
}
