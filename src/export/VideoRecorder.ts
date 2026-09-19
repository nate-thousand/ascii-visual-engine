import type { ExportResult } from './ExportTypes';

export type VideoRecordingState = 'idle' | 'recording' | 'paused' | 'stopping';

export interface VideoRecordOptions {
  /**
   * Container and codec, as a MIME type. Default: the first supported of
   * `VIDEO_MIME_PREFERENCE` (VP9 WebM, VP8 WebM, plain WebM, MP4). An
   * unsupported explicit type fails `start()`.
   */
  mimeType?: string;
  /** Frames per second pulled from the canvas. Default 30. 0 captures on every paint. */
  frameRate?: number;
  /** Encoder target in bits per second. Default 8 000 000. */
  videoBitsPerSecond?: number;
  /** Audio tracks to mux, for example from the host's `AudioContext` via `createMediaStreamDestination()`. */
  audioTracks?: MediaStreamTrack[];
  /** Stop on its own after this many seconds. */
  maxSeconds?: number;
  /** Filename for the download. Default `ascii-<timestamp>.<ext>`. */
  filename?: string;
}

export interface VideoRecordingStatus {
  state: VideoRecordingState;
  /** `MediaRecorder` and `captureStream` exist in this environment. */
  supported: boolean;
  /** MIME type in use, null while idle. */
  mimeType: string | null;
  /** Seconds recorded so far, pauses excluded. */
  duration: number;
  /** Bytes received from the encoder so far. */
  bytes: number;
}

/** Tried in order when no `mimeType` is given. */
export const VIDEO_MIME_PREFERENCE = [
  'video/webm;codecs=vp9',
  'video/webm;codecs=vp8',
  'video/webm',
  'video/mp4;codecs=avc1',
  'video/mp4',
];

/** The pieces of `MediaRecorder` this recorder uses, so tests can supply a fake. */
export interface MediaRecorderLike {
  state: 'inactive' | 'recording' | 'paused';
  mimeType: string;
  ondataavailable: ((event: { data: Blob }) => void) | null;
  onstop: (() => void) | null;
  onerror: ((event: unknown) => void) | null;
  start(timeslice?: number): void;
  stop(): void;
  pause(): void;
  resume(): void;
}

/** A `MediaRecorder` constructor: the real one, or a fake in tests. */
export interface MediaRecorderFactory {
  new (stream: MediaStream, options: { mimeType: string; videoBitsPerSecond?: number }): MediaRecorderLike;
  isTypeSupported(type: string): boolean;
}

export interface VideoRecorderDeps {
  /** Default: the global `MediaRecorder`. */
  MediaRecorder?: MediaRecorderFactory;
  /** Default: `canvas.captureStream(frameRate)`. */
  captureStream?: (canvas: HTMLCanvasElement, frameRate: number) => MediaStream;
  /** Default: `performance.now()`. */
  now?: () => number;
}

function globalRecorder(): MediaRecorderFactory | null {
  const g = globalThis as { MediaRecorder?: MediaRecorderFactory };
  return typeof g.MediaRecorder === 'function' ? g.MediaRecorder : null;
}

function defaultCapture(canvas: HTMLCanvasElement, frameRate: number): MediaStream {
  const c = canvas as HTMLCanvasElement & { captureStream?: (fps?: number) => MediaStream };
  if (typeof c.captureStream !== 'function') {
    throw new Error('canvas.captureStream is not available');
  }
  return frameRate > 0 ? c.captureStream(frameRate) : c.captureStream();
}

/** `webm` or `mp4` from a MIME type. */
export function videoFormatOf(mimeType: string): 'webm' | 'mp4' {
  return /mp4/i.test(mimeType) ? 'mp4' : 'webm';
}

/**
 * Real time video capture of the canvas through `MediaRecorder`. The browser
 * encodes what is painted as it is painted, so a recording is exactly what
 * the audience saw, dropped frames included; for frame perfect output use
 * the timeline recorder and `exportSequence()` instead. Audio tracks from
 * the host can be muxed in. Chrome and Firefox record WebM; Safari records
 * MP4. Nothing here touches the engine loop.
 */
export class VideoRecorder {
  private readonly deps: Required<VideoRecorderDeps>;
  private recorder: MediaRecorderLike | null = null;
  private stream: MediaStream | null = null;
  private chunks: Blob[] = [];
  private bytes = 0;
  private state: VideoRecordingState = 'idle';
  private mimeType: string | null = null;
  private filename = '';
  private startedAt = 0;
  private accumulated = 0;
  private maxTimer: ReturnType<typeof setTimeout> | null = null;
  private stopPromise: Promise<ExportResult> | null = null;
  private pendingResolve: ((result: ExportResult) => void) | null = null;
  private hostTracks: MediaStreamTrack[] = [];

  constructor(deps: VideoRecorderDeps = {}) {
    this.deps = {
      MediaRecorder: deps.MediaRecorder ?? (globalRecorder() as MediaRecorderFactory),
      captureStream: deps.captureStream ?? defaultCapture,
      now: deps.now ?? (() => (typeof performance !== 'undefined' ? performance.now() : Date.now())),
    };
  }

  /** `MediaRecorder` exists and at least one video type is supported. */
  isSupported(): boolean {
    return this.supportedMimeTypes().length > 0;
  }

  /** The entries of `VIDEO_MIME_PREFERENCE` this browser can encode, in order. */
  supportedMimeTypes(): string[] {
    const R = this.deps.MediaRecorder;
    if (!R || typeof R.isTypeSupported !== 'function') return [];
    return VIDEO_MIME_PREFERENCE.filter((t) => R.isTypeSupported(t));
  }

  /** The type `start()` would use for these options, or null when none works. */
  resolveMimeType(preferred?: string): string | null {
    const R = this.deps.MediaRecorder;
    if (!R || typeof R.isTypeSupported !== 'function') return null;
    if (preferred) return R.isTypeSupported(preferred) ? preferred : null;
    return this.supportedMimeTypes()[0] ?? null;
  }

  getStatus(): VideoRecordingStatus {
    return {
      state: this.state,
      supported: this.isSupported(),
      mimeType: this.mimeType,
      duration: this.durationSeconds(),
      bytes: this.bytes,
    };
  }

  start(canvas: HTMLCanvasElement | null, options: VideoRecordOptions = {}): { ok: boolean; error?: string } {
    if (this.state !== 'idle') return { ok: false, error: `Already ${this.state}` };
    if (!canvas) return { ok: false, error: 'No canvas to record; the DOM renderer has none' };
    const mimeType = this.resolveMimeType(options.mimeType);
    if (!mimeType) {
      return {
        ok: false,
        error: options.mimeType
          ? `${options.mimeType} is not supported by this browser's MediaRecorder`
          : 'MediaRecorder is not available in this environment',
      };
    }

    let stream: MediaStream;
    try {
      stream = this.deps.captureStream(canvas, options.frameRate ?? 30);
      for (const track of options.audioTracks ?? []) stream.addTrack(track);
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'captureStream failed' };
    }

    let recorder: MediaRecorderLike;
    try {
      recorder = new this.deps.MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: options.videoBitsPerSecond ?? 8_000_000,
      });
    } catch (err) {
      this.releaseStream(stream, options.audioTracks);
      return { ok: false, error: err instanceof Error ? err.message : 'MediaRecorder failed' };
    }

    this.recorder = recorder;
    this.stream = stream;
    this.chunks = [];
    this.bytes = 0;
    this.mimeType = mimeType;
    this.filename = options.filename ?? `ascii-${Date.now()}.${videoFormatOf(mimeType)}`;
    this.accumulated = 0;
    this.startedAt = this.deps.now();
    this.state = 'recording';
    this.hostTracks = options.audioTracks ?? [];

    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        this.chunks.push(event.data);
        this.bytes += event.data.size;
      }
    };
    recorder.onerror = (event) => {
      const message = (event as { error?: { message?: string } })?.error?.message ?? 'MediaRecorder error';
      this.fail(message);
    };
    recorder.start(1000);

    if (options.maxSeconds && options.maxSeconds > 0) {
      this.maxTimer = setTimeout(() => void this.stop(), options.maxSeconds * 1000);
    }
    return { ok: true };
  }

  pause(): void {
    if (this.state !== 'recording' || !this.recorder) return;
    this.accumulated += this.deps.now() - this.startedAt;
    this.recorder.pause();
    this.state = 'paused';
  }

  resume(): void {
    if (this.state !== 'paused' || !this.recorder) return;
    this.startedAt = this.deps.now();
    this.recorder.resume();
    this.state = 'recording';
  }

  /** Finish and resolve with the encoded file. Resolves the same promise when called twice. */
  stop(): Promise<ExportResult> {
    if (this.stopPromise) return this.stopPromise;
    const recorder = this.recorder;
    const mimeType = this.mimeType;
    if (!recorder || !mimeType) {
      return Promise.resolve({ ok: false, format: 'webm', error: 'Not recording' });
    }
    if (this.state === 'recording') this.accumulated += this.deps.now() - this.startedAt;
    this.state = 'stopping';
    this.clearMaxTimer();

    this.stopPromise = new Promise<ExportResult>((resolve) => {
      this.pendingResolve = resolve;
      recorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: mimeType });
        const result: ExportResult = {
          ok: blob.size > 0,
          format: videoFormatOf(mimeType),
          blob,
          filename: this.filename,
          ...(blob.size > 0 ? {} : { error: 'The recorder produced no data' }),
        };
        this.reset();
        resolve(result);
      };
      try {
        recorder.stop();
      } catch (err) {
        this.fail(err instanceof Error ? err.message : 'MediaRecorder.stop failed');
      }
    });
    return this.stopPromise;
  }

  /** Drop the recording; nothing is resolved with data. */
  cancel(): void {
    if (this.state === 'idle') return;
    const recorder = this.recorder;
    const resolve = this.pendingResolve;
    this.reset();
    if (recorder) {
      recorder.onstop = null;
      recorder.ondataavailable = null;
      try {
        if (recorder.state !== 'inactive') recorder.stop();
      } catch {
        // Already stopped.
      }
    }
    resolve?.({ ok: false, format: 'webm', error: 'Cancelled' });
  }

  destroy(): void {
    this.cancel();
  }

  private fail(message: string): void {
    const resolve = this.pendingResolve;
    const format = this.mimeType ? videoFormatOf(this.mimeType) : 'webm';
    this.reset();
    resolve?.({ ok: false, format, error: message });
  }

  private durationSeconds(): number {
    const live = this.state === 'recording' ? this.deps.now() - this.startedAt : 0;
    return (this.accumulated + live) / 1000;
  }

  private clearMaxTimer(): void {
    if (this.maxTimer !== null) {
      clearTimeout(this.maxTimer);
      this.maxTimer = null;
    }
  }

  private releaseStream(stream: MediaStream, hostTracks: MediaStreamTrack[] = []): void {
    // Canvas tracks are ours to stop; the host's audio tracks stay alive.
    const keep = new Set(hostTracks);
    for (const track of stream.getTracks?.() ?? []) {
      if (!keep.has(track)) track.stop?.();
    }
  }

  private reset(): void {
    this.clearMaxTimer();
    if (this.stream) this.releaseStream(this.stream, this.hostTracks);
    this.recorder = null;
    this.stream = null;
    this.chunks = [];
    this.bytes = 0;
    this.hostTracks = [];
    this.state = 'idle';
    this.mimeType = null;
    this.accumulated = 0;
    this.stopPromise = null;
    this.pendingResolve = null;
  }
}
