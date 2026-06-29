export class AudioAnalyzer {
  private analyser: AnalyserNode | null = null;
  private frequencyData: Uint8Array<ArrayBuffer> = new Uint8Array(0);
  private timeDomainData: Uint8Array<ArrayBuffer> = new Uint8Array(0);

  setAnalyser(analyser: AnalyserNode | null): void {
    this.analyser = analyser;
    if (analyser) {
      this.frequencyData = new Uint8Array(analyser.frequencyBinCount);
      this.timeDomainData = new Uint8Array(analyser.fftSize);
    } else {
      this.frequencyData = new Uint8Array(0);
      this.timeDomainData = new Uint8Array(0);
    }
  }

  getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  getFftSize(): number {
    return this.analyser?.fftSize ?? 0;
  }

  update(): void {
    if (!this.analyser) return;
    this.analyser.getByteFrequencyData(this.frequencyData);
    this.analyser.getByteTimeDomainData(this.timeDomainData);
  }

  getFrequencyData(): Uint8Array<ArrayBuffer> {
    return this.frequencyData;
  }

  getTimeDomainData(): Uint8Array<ArrayBuffer> {
    return this.timeDomainData;
  }

  /** RMS amplitude from time-domain samples (0–1). */
  getRmsAmplitude(): number {
    if (this.timeDomainData.length === 0) return 0;
    let sum = 0;
    for (let i = 0; i < this.timeDomainData.length; i++) {
      const sample = (this.timeDomainData[i] - 128) / 128;
      sum += sample * sample;
    }
    return Math.sqrt(sum / this.timeDomainData.length);
  }

  /** Average normalized energy in a bin range (0–1). */
  getBandEnergy(startBin: number, endBin: number): number {
    if (this.frequencyData.length === 0 || endBin <= startBin) return 0;
    const start = Math.max(0, Math.floor(startBin));
    const end = Math.min(this.frequencyData.length, Math.ceil(endBin));
    if (end <= start) return 0;

    let sum = 0;
    for (let i = start; i < end; i++) {
      sum += this.frequencyData[i] / 255;
    }
    return sum / (end - start);
  }
}
