import type { AudioInputOptions, AudioInputType } from './AudioTypes';

export interface AudioInputState {
  connected: boolean;
  inputType: AudioInputType | null;
  ready: boolean;
  error: string | null;
}

export class AudioInput {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private sourceNode: AudioNode | null = null;
  private ownsContext = false;
  private ownsSource = false;
  private stream: MediaStream | null = null;
  private inputType: AudioInputType | null = null;
  private error: string | null = null;
  private ready = false;

  async connect(options: AudioInputOptions): Promise<{ ok: boolean; error?: string }> {
    this.disconnect();

    try {
      if (options.type === 'analyser') {
        return this.connectExternalAnalyser(options);
      }

      if (typeof window === 'undefined' || typeof AudioContext === 'undefined') {
        const message = 'Web Audio API is not available in this environment';
        this.error = message;
        return { ok: false, error: message };
      }

      switch (options.type) {
        case 'microphone':
          return await this.connectMicrophone(options);
        case 'audioElement':
          return this.connectAudioElement(options);
        case 'mediaStream':
          return this.connectMediaStream(options);
        default:
          return { ok: false, error: `Unknown audio input type` };
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.error = message;
      this.ready = false;
      return { ok: false, error: message };
    }
  }

  disconnect(): void {
    if (this.sourceNode && this.ownsSource) {
      try {
        this.sourceNode.disconnect();
      } catch {
        // already disconnected
      }
    }

    if (this.stream) {
      for (const track of this.stream.getTracks()) {
        track.stop();
      }
    }

    if (this.audioContext && this.ownsContext) {
      void this.audioContext.close();
    }

    this.audioContext = null;
    this.analyser = null;
    this.sourceNode = null;
    this.stream = null;
    this.inputType = null;
    this.ready = false;
    this.ownsContext = false;
    this.ownsSource = false;
    this.error = null;
  }

  getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  getAudioContext(): AudioContext | null {
    return this.audioContext;
  }

  getState(): AudioInputState {
    return {
      connected: this.analyser !== null,
      inputType: this.inputType,
      ready: this.ready,
      error: this.error,
    };
  }

  isConnected(): boolean {
    return this.analyser !== null && this.ready;
  }

  private async connectMicrophone(options: AudioInputOptions): Promise<{ ok: boolean; error?: string }> {
    if (!navigator.mediaDevices?.getUserMedia) {
      const message = 'Microphone access is not supported in this browser';
      this.error = message;
      return { ok: false, error: message };
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: options.microphoneConstraints ?? true,
        video: false,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Microphone permission denied or unavailable';
      this.error = message;
      return { ok: false, error: message };
    }

    return this.setupFromStream(this.stream, options, 'microphone');
  }

  private connectAudioElement(options: AudioInputOptions): { ok: boolean; error?: string } {
    const element = options.audioElement;
    if (!element) {
      const message = 'audioElement is required for audioElement input type';
      this.error = message;
      return { ok: false, error: message };
    }

    this.audioContext = options.audioContext ?? new AudioContext();
    this.ownsContext = !options.audioContext;

    if (this.audioContext.state === 'suspended') {
      void this.audioContext.resume();
    }

    this.analyser = this.createAnalyser(this.audioContext, options);
    const source = this.audioContext.createMediaElementSource(element);
    source.connect(this.analyser);
    this.analyser.connect(this.audioContext.destination);

    this.sourceNode = source;
    this.ownsSource = true;
    this.inputType = 'audioElement';
    this.ready = true;
    return { ok: true };
  }

  private connectMediaStream(options: AudioInputOptions): { ok: boolean; error?: string } {
    const stream = options.mediaStream;
    if (!stream) {
      const message = 'mediaStream is required for mediaStream input type';
      this.error = message;
      return { ok: false, error: message };
    }

    return this.setupFromStream(stream, options, 'mediaStream');
  }

  private connectExternalAnalyser(options: AudioInputOptions): { ok: boolean; error?: string } {
    const analyser = options.analyser;
    if (!analyser) {
      const message = 'analyser is required for analyser input type';
      this.error = message;
      return { ok: false, error: message };
    }

    this.analyser = analyser;
    this.audioContext = options.audioContext ?? analyser.context as AudioContext;
    this.ownsContext = false;
    this.ownsSource = false;
    this.inputType = 'analyser';
    this.ready = true;
    return { ok: true };
  }

  private setupFromStream(
    stream: MediaStream,
    options: AudioInputOptions,
    type: AudioInputType,
  ): { ok: boolean; error?: string } {
    this.stream = stream;
    this.audioContext = options.audioContext ?? new AudioContext();
    this.ownsContext = !options.audioContext;

    if (this.audioContext.state === 'suspended') {
      void this.audioContext.resume();
    }

    this.analyser = this.createAnalyser(this.audioContext, options);
    const source = this.audioContext.createMediaStreamSource(stream);
    source.connect(this.analyser);

    this.sourceNode = source;
    this.ownsSource = true;
    this.inputType = type;
    this.ready = true;
    return { ok: true };
  }

  private createAnalyser(context: AudioContext, options: AudioInputOptions): AnalyserNode {
    const analyser = context.createAnalyser();
    analyser.fftSize = options.fftSize ?? 2048;
    analyser.smoothingTimeConstant = options.smoothingTimeConstant ?? 0.8;
    analyser.minDecibels = -90;
    analyser.maxDecibels = -10;
    return analyser;
  }
}
