import { describe, it, expect, afterEach, vi } from 'vitest';
import { VideoRecorder, VIDEO_MIME_PREFERENCE, videoFormatOf, type MediaRecorderLike } from '../src/export/VideoRecorder';
import { AsciiEngine } from '../src/core/AsciiEngine';
import { createEngine } from '../src/core/createEngine';
import { ExportManager } from '../src/export/ExportManager';
import { createMockCanvas, stubAnimationFrame } from './helpers/mockCanvas';

/** A MediaRecorder that emits one chunk per start/stop and reports what it was asked. */
function fakeRecorderFactory(supported: string[] = ['video/webm;codecs=vp9', 'video/webm']) {
  const instances: FakeRecorder[] = [];
  class FakeRecorder implements MediaRecorderLike {
    state: 'inactive' | 'recording' | 'paused' = 'inactive';
    mimeType: string;
    ondataavailable: ((event: { data: Blob }) => void) | null = null;
    onstop: (() => void) | null = null;
    onerror: ((event: unknown) => void) | null = null;
    timeslice: number | undefined;
    readonly options: { mimeType: string; videoBitsPerSecond?: number };
    readonly stream: MediaStream;
    chunkSize = 1000;
    constructor(stream: MediaStream, options: { mimeType: string; videoBitsPerSecond?: number }) {
      this.stream = stream;
      this.options = options;
      this.mimeType = options.mimeType;
      instances.push(this);
    }
    static isTypeSupported(type: string): boolean {
      return supported.includes(type);
    }
    start(timeslice?: number): void {
      this.state = 'recording';
      this.timeslice = timeslice;
    }
    emit(size = this.chunkSize): void {
      this.ondataavailable?.({ data: new Blob([new Uint8Array(size)], { type: this.mimeType }) });
    }
    stop(): void {
      this.state = 'inactive';
      // Real recorders flush a final chunk before onstop.
      this.emit();
      queueMicrotask(() => this.onstop?.());
    }
    pause(): void {
      this.state = 'paused';
    }
    resume(): void {
      this.state = 'recording';
    }
  }
  return { FakeRecorder, instances };
}

function fakeStream() {
  const tracks: { kind: string; stop: ReturnType<typeof vi.fn> }[] = [{ kind: 'video', stop: vi.fn() }];
  const stream = {
    tracks,
    addTrack: (t: unknown) => tracks.push(t as { kind: string; stop: ReturnType<typeof vi.fn> }),
    getTracks: () => tracks,
  };
  return stream as unknown as MediaStream & { tracks: typeof tracks };
}

function makeRecorder(supported?: string[]) {
  const { FakeRecorder, instances } = fakeRecorderFactory(supported);
  const streams: ReturnType<typeof fakeStream>[] = [];
  const captured: number[] = [];
  let now = 0;
  const recorder = new VideoRecorder({
    MediaRecorder: FakeRecorder,
    captureStream: (_canvas, fps) => {
      captured.push(fps);
      const s = fakeStream();
      streams.push(s);
      return s;
    },
    now: () => now,
  });
  return { recorder, instances, streams, captured, tick: (ms: number) => (now += ms) };
}

describe('VideoRecorder', () => {
  it('reports support from isTypeSupported and picks the first preferred type', () => {
    const { recorder } = makeRecorder();
    expect(recorder.isSupported()).toBe(true);
    expect(recorder.supportedMimeTypes()).toEqual(['video/webm;codecs=vp9', 'video/webm']);
    expect(recorder.resolveMimeType()).toBe('video/webm;codecs=vp9');
    expect(recorder.resolveMimeType('video/webm')).toBe('video/webm');
    expect(recorder.resolveMimeType('video/mp4')).toBeNull();
    expect(VIDEO_MIME_PREFERENCE[0]).toContain('webm');
    expect(videoFormatOf('video/mp4;codecs=avc1')).toBe('mp4');
    expect(videoFormatOf('video/webm')).toBe('webm');

    const none = new VideoRecorder({ MediaRecorder: undefined as never });
    expect(none.isSupported()).toBe(false);
    expect(none.getStatus()).toMatchObject({ state: 'idle', supported: false, mimeType: null });
    expect(none.start(createMockCanvas())).toEqual({ ok: false, error: expect.stringContaining('not available') });
  });

  it('records, pauses, resumes, and stops with a blob of every chunk', async () => {
    const { recorder, instances, streams, captured, tick } = makeRecorder();
    const canvas = createMockCanvas();
    expect(recorder.start(canvas, { frameRate: 24, videoBitsPerSecond: 500_000, filename: 'take.webm' })).toEqual({ ok: true });
    expect(captured).toEqual([24]);
    const fake = instances[0];
    expect(fake.options).toEqual({ mimeType: 'video/webm;codecs=vp9', videoBitsPerSecond: 500_000 });
    expect(fake.timeslice).toBe(1000);
    expect(recorder.start(canvas)).toEqual({ ok: false, error: 'Already recording' });

    tick(1000);
    fake.emit(700);
    expect(recorder.getStatus()).toMatchObject({ state: 'recording', mimeType: 'video/webm;codecs=vp9', duration: 1, bytes: 700 });

    recorder.pause();
    expect(fake.state).toBe('paused');
    tick(5000);
    expect(recorder.getStatus().duration).toBe(1);
    recorder.resume();
    tick(500);
    expect(recorder.getStatus()).toMatchObject({ state: 'recording', duration: 1.5 });

    const pending = recorder.stop();
    expect(recorder.getStatus().state).toBe('stopping');
    expect(recorder.stop()).toBe(pending);
    const result = await pending;
    expect(result.ok).toBe(true);
    expect(result.format).toBe('webm');
    expect(result.filename).toBe('take.webm');
    expect(result.blob?.size).toBe(1700);
    expect(result.blob?.type).toBe('video/webm;codecs=vp9');
    expect(recorder.getStatus()).toMatchObject({ state: 'idle', mimeType: null, duration: 0, bytes: 0 });
    expect(streams[0].tracks[0].stop).toHaveBeenCalled();
  });

  it('muxes host audio tracks and leaves them running afterwards', async () => {
    const { recorder, streams } = makeRecorder();
    const audio = { kind: 'audio', stop: vi.fn() } as unknown as MediaStreamTrack;
    recorder.start(createMockCanvas(), { audioTracks: [audio] });
    expect(streams[0].tracks.map((t) => t.kind)).toEqual(['video', 'audio']);
    await recorder.stop();
    expect((audio as unknown as { stop: ReturnType<typeof vi.fn> }).stop).not.toHaveBeenCalled();
    expect(streams[0].tracks[0].stop).toHaveBeenCalled();
  });

  it('mp4 when that is what the browser offers; explicit unsupported types fail; no canvas fails', () => {
    const { recorder } = makeRecorder(['video/mp4']);
    expect(recorder.start(createMockCanvas(), { mimeType: 'video/webm' })).toEqual({
      ok: false,
      error: expect.stringContaining('video/webm is not supported'),
    });
    expect(recorder.start(createMockCanvas())).toEqual({ ok: true });
    expect(recorder.getStatus().mimeType).toBe('video/mp4');
    recorder.cancel();
    expect(recorder.start(null)).toEqual({ ok: false, error: expect.stringContaining('No canvas') });
  });

  it('cancel drops the data; an encoder error resolves stop with it; maxSeconds stops on its own', async () => {
    vi.useFakeTimers();
    try {
      const { recorder, instances } = makeRecorder();
      recorder.start(createMockCanvas());
      instances[0].emit();
      recorder.cancel();
      expect(recorder.getStatus().state).toBe('idle');
      expect(instances[0].state).toBe('inactive');
      expect(recorder.start(createMockCanvas())).toEqual({ ok: true });

      const failing = instances[1];
      const pending = recorder.stop();
      failing.onerror?.({ error: { message: 'encoder died' } });
      expect(await pending).toEqual({ ok: false, format: 'webm', error: 'encoder died' });
      expect(recorder.getStatus().state).toBe('idle');

      recorder.start(createMockCanvas(), { maxSeconds: 2 });
      expect(recorder.getStatus().state).toBe('recording');
      vi.advanceTimersByTime(2100);
      expect(recorder.getStatus().state).toBe('stopping');
      await vi.runAllTimersAsync();
      expect(recorder.getStatus().state).toBe('idle');
    } finally {
      vi.useRealTimers();
    }
  });

  it('a captureStream failure is reported, not thrown', () => {
    const { FakeRecorder } = fakeRecorderFactory();
    const recorder = new VideoRecorder({
      MediaRecorder: FakeRecorder,
      captureStream: () => {
        throw new Error('tainted canvas');
      },
    });
    expect(recorder.start(createMockCanvas())).toEqual({ ok: false, error: 'tainted canvas' });
    expect(recorder.getStatus().state).toBe('idle');
  });
});

describe('engine video recording', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('goes through the export manager, downloads on stop, and shows in debug state', async () => {
    stubAnimationFrame();
    const { FakeRecorder } = fakeRecorderFactory();
    vi.stubGlobal('MediaRecorder', FakeRecorder);
    const canvas = createMockCanvas(200, 100) as HTMLCanvasElement & { captureStream?: () => MediaStream };
    canvas.captureStream = () => fakeStream();
    const engine = new AsciiEngine({ canvas, preset: undefined, width: 200, height: 100, autoStart: false });
    // Stubbed after construction: the DOM renderer needs a real-ish element.
    const clicks: string[] = [];
    vi.stubGlobal('document', {
      createElement: () => ({ click: () => clicks.push('download'), set href(_: string) {}, set download(_: string) {} }),
    });
    vi.stubGlobal('URL', { createObjectURL: () => 'blob:x', revokeObjectURL: () => {} });
    expect(engine.getVideoRecordingStatus().supported).toBe(true);
    expect(engine.startVideoRecording({ frameRate: 30 })).toEqual({ ok: true });
    expect(engine.getDebugState().export.video.state).toBe('recording');
    engine.pauseVideoRecording();
    expect(engine.getDebugState().export.video.state).toBe('paused');
    engine.resumeVideoRecording();

    const result = await engine.stopVideoRecording();
    expect(result.ok).toBe(true);
    expect(result.format).toBe('webm');
    expect(clicks).toEqual(['download']);
    expect(engine.getDebugState().export.lastExport).toBe('webm');
    expect(engine.getDebugState().export.video.state).toBe('idle');

    // download: false keeps the blob in the result only.
    engine.startVideoRecording();
    const kept = await engine.stopVideoRecording({ download: false });
    expect(kept.ok).toBe(true);
    expect(clicks).toHaveLength(1);
    engine.cancelVideoRecording();
    engine.destroy();
  });

  it('is on the facade and reports unsupported browsers without throwing', async () => {
    stubAnimationFrame();
    vi.stubGlobal('MediaRecorder', undefined);
    const handle = createEngine(createMockCanvas(200, 100), { width: 200, height: 100, autoStart: false });
    expect(handle.getVideoRecordingStatus().supported).toBe(false);
    expect(handle.startVideoRecording()).toEqual({ ok: false, error: expect.stringContaining('MediaRecorder') });
    expect(await handle.stopVideoRecording()).toEqual({ ok: false, format: 'webm', error: 'Not recording' });
    handle.destroy();
  });

  it('export manager without an engine reports it', () => {
    const manager = new ExportManager();
    expect(manager.startVideoRecording()).toEqual({ ok: false, error: 'Engine not connected' });
  });
});
