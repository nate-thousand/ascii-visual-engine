import type { ExportEngineBridge } from '../export/ExportTypes';
import type { AsciiSceneDocument } from '../export/SceneFormat';
import { buildSceneDocument, parseScene, serializeScene } from '../export/JsonExporter';
import { AnimationRecorder } from '../export/AnimationRecorder';
import type { RecordedFrame, RecordingState } from '../export/ExportTypes';

export class RecordingSession {
  private recorder = new AnimationRecorder();
  private state: RecordingState = 'idle';
  private frameRate = 30;
  private engine: ExportEngineBridge | null = null;

  setEngine(engine: ExportEngineBridge): void {
    this.engine = engine;
  }

  start(frameRate = 30): { ok: boolean; error?: string } {
    if (!this.engine) return { ok: false, error: 'Engine not connected' };
    this.frameRate = frameRate;
    this.recorder.reset();
    this.recorder.setFrameRate(frameRate);
    this.state = 'recording';
    return { ok: true };
  }

  pause(): void {
    if (this.state === 'recording') this.state = 'paused';
  }

  resume(): void {
    if (this.state === 'paused') this.state = 'recording';
  }

  stop(): RecordedFrame[] {
    this.state = 'stopped';
    return this.recorder.getFrames();
  }

  cancel(): void {
    this.recorder.reset();
    this.state = 'idle';
  }

  onFrame(time: number): void {
    if (this.state !== 'recording' || !this.engine) return;
    this.recorder.captureIfDue(this.engine, time);
  }

  getState(): RecordingState {
    return this.state;
  }

  getStatus() {
    return {
      state: this.state,
      frameCount: this.recorder.getFrameCount(),
      duration: this.recorder.getDuration(),
      frameRate: this.frameRate,
    };
  }

  getFrames(): RecordedFrame[] {
    return this.recorder.getFrames();
  }

  exportSnapshot(name?: string): AsciiSceneDocument | null {
    if (!this.engine) return null;
    return buildSceneDocument(this.engine, name);
  }

  toJson(name?: string): string | null {
    const doc = this.exportSnapshot(name);
    return doc ? serializeScene(doc) : null;
  }

  static parseSnapshot(json: string): AsciiSceneDocument {
    return parseScene(json);
  }
}
