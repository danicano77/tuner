/**
 * Detecció de to amb l'algorisme YIN.
 *
 * Referència: de Cheveigné & Kawahara (2002), "YIN, a fundamental frequency
 * estimator for speech and music". És robust per a instruments de corda i veu,
 * que és exactament el que necessita un afinador cromàtic.
 */

export interface PitchEstimate {
  /** Freqüència fonamental estimada, en Hz. */
  frequency: number;
  /** Claredat de la detecció, de 0 (soroll) a 1 (to net). */
  clarity: number;
}

// 18 Hz cobreix el B0 del baix de 5 cordes (30.87 Hz), el drop A (27.5 Hz)
// i afinacions baixes fins a ~D0, incloent-hi baixos de 6 cordes (F#0 = 23.12 Hz).
export const MIN_FREQUENCY = 18;
export const MAX_FREQUENCY = 4500;

const DEFAULT_THRESHOLD = 0.15;
const FALLBACK_THRESHOLD = 0.55;

/** Valor eficaç (RMS) de la senyal: serveix per distingir so de silenci. */
export function rms(buffer: Float32Array): number {
  if (buffer.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < buffer.length; i += 1) {
    sum += buffer[i] * buffer[i];
  }
  return Math.sqrt(sum / buffer.length);
}

/**
 * Decima la senyal agrupant `factor` mostres (mitjana).
 * Permet analitzar notes molt greus amb una finestra més llarga sense
 * disparar el cost de càlcul de YIN.
 */
export function downsample(
  input: Float32Array,
  factor: number,
  output?: Float32Array,
): Float32Array {
  if (factor <= 1) return input;

  const length = Math.floor(input.length / factor);
  const result = output && output.length === length ? output : new Float32Array(length);

  for (let i = 0; i < length; i += 1) {
    const start = i * factor;
    let sum = 0;
    for (let j = 0; j < factor; j += 1) {
      sum += input[start + j];
    }
    result[i] = sum / factor;
  }

  return result;
}

export interface DetectOptions {
  threshold?: number;
  minFrequency?: number;
  maxFrequency?: number;
}

export function detectPitch(
  buffer: Float32Array,
  sampleRate: number,
  options: DetectOptions = {},
): PitchEstimate | null {
  const threshold = options.threshold ?? DEFAULT_THRESHOLD;
  const minFrequency = options.minFrequency ?? MIN_FREQUENCY;
  const maxFrequency = options.maxFrequency ?? MAX_FREQUENCY;

  const maxTau = Math.min(Math.floor(sampleRate / minFrequency), buffer.length - 2);
  const windowSize = buffer.length - maxTau;

  if (windowSize < 64 || maxTau < 4) return null;

  // 1. Funció de diferència.
  const difference = new Float32Array(maxTau + 1);
  for (let tau = 1; tau <= maxTau; tau += 1) {
    let sum = 0;
    for (let j = 0; j < windowSize; j += 1) {
      const delta = buffer[j] - buffer[j + tau];
      sum += delta * delta;
    }
    difference[tau] = sum;
  }

  // 2. Diferència normalitzada amb mitjana acumulada (CMND).
  const normalized = new Float32Array(maxTau + 1);
  normalized[0] = 1;
  let runningSum = 0;
  for (let tau = 1; tau <= maxTau; tau += 1) {
    runningSum += difference[tau];
    normalized[tau] = runningSum > 0 ? (difference[tau] * tau) / runningSum : 1;
  }

  // 3. Primer mínim local per sota del llindar.
  let tauEstimate = -1;
  for (let tau = 2; tau < maxTau; tau += 1) {
    if (normalized[tau] < threshold) {
      while (tau + 1 < maxTau && normalized[tau + 1] < normalized[tau]) {
        tau += 1;
      }
      tauEstimate = tau;
      break;
    }
  }

  if (tauEstimate === -1) {
    // Cap dip clar: provem el mínim global, però exigim més claredat.
    let best = 2;
    for (let tau = 2; tau < maxTau; tau += 1) {
      if (normalized[tau] < normalized[best]) best = tau;
    }
    if (normalized[best] > FALLBACK_THRESHOLD) return null;
    tauEstimate = best;
  }

  // 4. Interpolació parabòlica per afinar el període.
  let betterTau = tauEstimate;
  if (tauEstimate > 1 && tauEstimate < maxTau - 1) {
    const before = normalized[tauEstimate - 1];
    const at = normalized[tauEstimate];
    const after = normalized[tauEstimate + 1];
    const denominator = 2 * (2 * at - after - before);
    if (Math.abs(denominator) > 1e-12) {
      betterTau = tauEstimate + (after - before) / denominator;
    }
  }

  if (betterTau <= 0) return null;

  const frequency = sampleRate / betterTau;
  if (!Number.isFinite(frequency) || frequency < minFrequency || frequency > maxFrequency) {
    return null;
  }

  const clarity = Math.max(0, Math.min(1, 1 - normalized[tauEstimate]));
  return { frequency, clarity };
}
