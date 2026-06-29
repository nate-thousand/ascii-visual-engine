import type { SourceFitMode } from './Source';
import { PixelSourceBase } from './PixelSourceBase';

export interface VideoSourceOptions {
  fitMode?: SourceFitMode;
  loop?: boolean;
  muted?: boolean;
  autoplay?: boolean;
}

export class VideoSource extends PixelSourceBase {
  private video: HTMLVideoElement | null = null;
  private loop = true;
  private muted = true;

  constructor(id = 'video', name = 'Video Source') {
    super(id, name, 'video');
  }

  async load(input: unknown): Promise<void> {
    this.error = null;
    this.ready = false;

    if (typeof document === 'undefined') {
      this.error = 'VideoSource requires a browser environment';
      return;
    }

    if (this.video) {
      this.video.pause();
      this.video.removeAttribute('src');
      this.video.load();
    } else {
      this.video = document.createElement('video');
      this.video.playsInline = true;
      this.video.crossOrigin = 'anonymous';
    }

    let src: string | null = null;
    if (typeof input === 'string') {
      src = input;
    } else if (input instanceof File) {
      src = URL.createObjectURL(input);
    } else if (input instanceof HTMLVideoElement) {
      this.video = input;
      this.ready = true;
      return;
    } else if (input && typeof input === 'object') {
      const opts = input as VideoSourceOptions & { src?: string; file?: File };
      if (opts.file) src = URL.createObjectURL(opts.file);
      else if (opts.src) src = opts.src;
      if (opts.fitMode) this.fitMode = opts.fitMode;
      if (typeof opts.loop === 'boolean') this.loop = opts.loop;
      if (typeof opts.muted === 'boolean') this.muted = opts.muted;
    }

    if (!src) {
      this.error = 'VideoSource: invalid input';
      return;
    }

    this.video.loop = this.loop;
    this.video.muted = this.muted;
    this.video.src = src;

    await new Promise<void>((resolve) => {
      const onReady = () => {
        this.ready = true;
        this.error = null;
        resolve();
      };
      const onError = () => {
        this.error = 'VideoSource: failed to load video';
        this.ready = false;
        resolve();
      };
      this.video!.addEventListener('loadeddata', onReady, { once: true });
      this.video!.addEventListener('error', onError, { once: true });
      this.video!.load();
    });

    try {
      await this.video.play();
    } catch {
      // Autoplay may be blocked; still ready for manual play
    }
  }

  play(): void {
    void this.video?.play();
  }

  pause(): void {
    this.video?.pause();
  }

  setLoop(loop: boolean): void {
    this.loop = loop;
    if (this.video) this.video.loop = loop;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.video) this.video.muted = muted;
  }

  isPlaying(): boolean {
    return !!this.video && !this.video.paused && !this.video.ended;
  }

  destroy(): void {
    if (this.video) {
      this.video.pause();
      this.video.removeAttribute('src');
      this.video.load();
    }
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
