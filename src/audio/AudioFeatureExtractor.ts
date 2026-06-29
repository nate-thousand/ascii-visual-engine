import type { AudioFeatures } from './AudioTypes';
import type { AudioAnalyzer } from './AudioAnalyzer';

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

export class AudioFeatureExtractor {
  private prevAmplitude = 0;
  private bassEnvelope = 0;
  private beatPulse = 0;
  private lastBeatTime = 0;
  private beatCooldownMs = 180;

  reset(): void {
    this.prevAmplitude = 0;
    this.bassEnvelope = 0;
    this.beatPulse = 0;
    this.lastBeatTime = 0;
  }

  extract(analyzer: AudioAnalyzer, nowMs: number): AudioFeatures {
    const frequencyData = analyzer.getFrequencyData();
    const binCount = frequencyData.length;

    const amplitude = clamp01(analyzer.getRmsAmplitude() * 2.5);

    const bass = binCount > 0 ? analyzer.getBandEnergy(1, binCount * 0.06) : 0;
    const lowMid = binCount > 0 ? analyzer.getBandEnergy(binCount * 0.06, binCount * 0.15) : 0;
    const mid = binCount > 0 ? analyzer.getBandEnergy(binCount * 0.15, binCount * 0.35) : 0;
    const highMid = binCount > 0 ? analyzer.getBandEnergy(binCount * 0.35, binCount * 0.55) : 0;
    const treble = binCount > 0 ? analyzer.getBandEnergy(binCount * 0.55, binCount) : 0;

    const spectralCentroid = this.computeSpectralCentroid(frequencyData);

    const delta = amplitude - this.prevAmplitude;
    const transient = clamp01(Math.max(0, delta) * 6);
    this.prevAmplitude = amplitude;

    const beat = this.detectBeat(bass, nowMs);

    return {
      amplitude: clamp01(amplitude),
      bass: clamp01(bass),
      lowMid: clamp01(lowMid),
      mid: clamp01(mid),
      highMid: clamp01(highMid),
      treble: clamp01(treble),
      spectralCentroid: clamp01(spectralCentroid),
      transient: clamp01(transient),
      beat: clamp01(beat),
    };
  }

  /** Inject synthetic features for testing without Web Audio. */
  extractFromValues(values: Partial<AudioFeatures>, nowMs = 0): AudioFeatures {
    const amplitude = clamp01(values.amplitude ?? 0);
    const bass = clamp01(values.bass ?? 0);
    const features: AudioFeatures = {
      amplitude,
      bass,
      lowMid: clamp01(values.lowMid ?? 0),
      mid: clamp01(values.mid ?? 0),
      highMid: clamp01(values.highMid ?? 0),
      treble: clamp01(values.treble ?? 0),
      spectralCentroid: clamp01(values.spectralCentroid ?? 0.5),
      transient: clamp01(values.transient ?? Math.max(0, amplitude - this.prevAmplitude) * 6),
      beat: clamp01(values.beat ?? this.detectBeat(bass, nowMs)),
    };
    this.prevAmplitude = amplitude;
    return features;
  }

  private computeSpectralCentroid(frequencyData: Uint8Array<ArrayBuffer>): number {
    if (frequencyData.length === 0) return 0;
    let weighted = 0;
    let total = 0;
    for (let i = 0; i < frequencyData.length; i++) {
      const mag = frequencyData[i] / 255;
      weighted += i * mag;
      total += mag;
    }
    if (total <= 0) return 0;
    return weighted / total / frequencyData.length;
  }

  private detectBeat(bass: number, nowMs: number): number {
    const attack = 0.35;
    const release = 0.08;
    if (bass > this.bassEnvelope) {
      this.bassEnvelope += (bass - this.bassEnvelope) * attack;
    } else {
      this.bassEnvelope += (bass - this.bassEnvelope) * release;
    }

    const threshold = 0.35;
    if (
      bass > threshold &&
      this.bassEnvelope > threshold &&
      nowMs - this.lastBeatTime > this.beatCooldownMs
    ) {
      this.beatPulse = 1;
      this.lastBeatTime = nowMs;
    }

    this.beatPulse *= 0.88;
    if (this.beatPulse < 0.01) this.beatPulse = 0;
    return this.beatPulse;
  }
}
