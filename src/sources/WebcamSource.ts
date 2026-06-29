import type { SourceFitMode } from './Source';
import { PixelSourceBase } from './PixelSourceBase';

export interface WebcamSourceOptions {
  fitMode?: SourceFitMode;
  facingMode?: 'user' | 'environment';
  width?: number;
  height?: number;
}

export class WebcamSource extends PixelSourceBase {
  private video: HTMLVideoElement | null = null;
  private stream: MediaStream | null = null;
  private facingMode: 'user' | 'environment' = 'user';

  constructor(id = 'webcam', name = 'Webcam Source') {
    super(id, name, 'webcam');
  }

  async load(input: unknown): Promise<void> {
    this.error = null;
    this.ready = false;

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      this.error = 'WebcamSource: camera API not available';
      return;
    }

    if (input && typeof input === 'object') {
      const opts = input as WebcamSourceOptions;
      if (opts.fitMode) this.fitMode = opts.fitMode;
      if (opts.facingMode) this.facingMode = opts.facingMode;
    }

    await this.stopStream();

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: this.facingMode,
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      if (!this.video) {
        this.video = document.createElement('video');
        this.video.playsInline = true;
        this.video.muted = true;
      }

      this.video.srcObject = this.stream;
      await this.video.play();
      this.ready = true;
      this.error = null;
    } catch (err) {
      this.error =
        err instanceof DOMException && err.name === 'NotAllowedError'
          ? 'WebcamSource: camera permission denied'
          : `WebcamSource: ${err instanceof Error ? err.message : 'failed to start camera'}`;
      this.ready = false;
      await this.stopStream();
    }
  }

  async stopStream(): Promise<void> {
    if (this.stream) {
      for (const track of this.stream.getTracks()) {
        track.stop();
      }
      this.stream = null;
    }
    if (this.video) {
      this.video.pause();
      this.video.srcObject = null;
    }
  }

  destroy(): void {
    void this.stopStream();
    this.video = null;
    super.destroy();
  }

  protected refreshCapture(): void {
    if (!this.video || !this.ready) return;
    const w = this.video.videoWidth;
    const h = this.video.videoHeight;
    if (w <= 0 || h <= 0) return;

    const ctx = this.ensureCaptureCanvas(w, h);
    ctx.drawImage(this.video, 0, 0, w, h);
    this.cachedImageData = ctx.getImageData(0, 0, w, h);
  }
}
