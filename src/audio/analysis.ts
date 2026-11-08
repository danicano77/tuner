/**
 * Configuració de la finestra d'anàlisi en funció de la freqüència de mostreig
 * real del dispositiu.
 *
 * Volem una finestra temporal prou llarga (~170 ms) per resoldre notes molt
 * greus com el B0 (30,87 Hz), independentment que el maquinari treballi a
 * 44,1, 48, 96 o 192 kHz. Després decimem perquè el cost de YIN sigui semblant
 * a qualsevol freqüència de mostreig.
 */

/** Durada objectiu de la finestra d'anàlisi, en mil·lèsimes de segon. */
export const ANALYSIS_WINDOW_MS = 170;

/** Freqüència de mostreig efectiva després de decimar. */
export const TARGET_SAMPLE_RATE = 24000;

const MIN_FFT_SIZE = 4096;
const MAX_FFT_SIZE = 32768;

export interface AnalysisSettings {
  /** Mida de l'AnalyserNode (potència de 2). */
  fftSize: number;
  /** Factor de decimació per baixar a la freqüència efectiva. */
  factor: number;
}

export function analysisSettings(sampleRate: number): AnalysisSettings {
  const targetSamples = (sampleRate * ANALYSIS_WINDOW_MS) / 1000;

  let fftSize = MIN_FFT_SIZE;
  while (fftSize < targetSamples && fftSize < MAX_FFT_SIZE) {
    fftSize *= 2;
  }

  const factor = Math.max(1, Math.round(sampleRate / TARGET_SAMPLE_RATE));

  return { fftSize, factor };
}
