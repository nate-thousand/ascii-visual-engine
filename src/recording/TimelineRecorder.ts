import type { ExportEngineBridge } from '../export/ExportTypes';
import type { RecordedFrame } from '../export/ExportTypes';
import { RecordingSession } from './RecordingSession';
import { PlaybackSession } from './PlaybackSession';

/** Coordinates recording sessions with timeline metadata and playback handoff. */
export class TimelineRecorder {
  private session = new RecordingSession();
  private playback = new PlaybackSession();
  private timeline: RecordedFrame[] = [];

  setEngine(engine: ExportEngineBridge, importGrid: (grid: import('../core/types').GridState) => void): void {
    this.session.setEngine(engine);
    this.playback.setEngine(engine, importGrid);
  }

  startRecording(frameRate = 30) {
    return this.session.start(frameRate);
  }

  pauseRecording(): void {
    this.session.pause();
  }

  resumeRecording(): void {
    this.session.resume();
  }

  stopRecording(): RecordedFrame[] {
    this.timeline = this.session.stop();
    return this.timeline;
  }

  cancelRecording(): void {
    this.session.cancel();
    this.timeline = [];
  }

  onFrame(time: number): void {
    this.session.onFrame(time);
  }

  playRecording(options?: { loop?: boolean; speed?: number; frameRate?: number }): void {
    const frames = this.timeline.length > 0 ? this.timeline : this.session.getFrames();
    this.playback.loadFrames(frames);
    this.playback.play(options);
  }

  pausePlayback(): void {
    this.playback.pause();
  }

  resumePlayback(): void {
    this.playback.resume();
  }

  stopPlayback(): void {
    this.playback.stop();
  }

  stepPlayback(delta: number): void {
    this.playback.step(delta);
  }

  scrubPlayback(index: number): void {
    this.playback.scrub(index);
  }

  getRecordingStatus() {
    return this.session.getStatus();
  }

  getPlaybackStatus() {
    return this.playback.getStatus();
  }

  getTimeline(): RecordedFrame[] {
    return this.timeline.length > 0 ? this.timeline : this.session.getFrames();
  }

  destroy(): void {
    this.session.cancel();
    this.playback.destroy();
    this.timeline = [];
  }
}
