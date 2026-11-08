import { describe, expect, it } from 'vitest';
import { TARGET_SAMPLE_RATE, analysisSettings } from './analysis';

describe('analysisSettings', () => {
  it.each([
    [22050, 4096, 1],
    [44100, 8192, 2],
    [48000, 8192, 2],
    [96000, 16384, 4],
    [192000, 32768, 8],
  ])('adapta la finestra a %i Hz (fftSize %i, factor %i)', (rate, fftSize, factor) => {
    const settings = analysisSettings(rate);

    expect(settings.fftSize).toBe(fftSize);
    expect(settings.factor).toBe(factor);
  });

  it.each([22050, 44100, 48000, 88200, 96000, 192000])(
    'manté una finestra d’anàlisi llarga a %i Hz',
    (rate) => {
      const { fftSize, factor } = analysisSettings(rate);
      const downsampled = Math.floor(fftSize / factor);
      const effectiveRate = rate / factor;
      const windowMs = (fftSize / rate) * 1000;

      // Finestra d'almenys ~170 ms per resoldre el B0 (30,87 Hz).
      expect(windowMs).toBeGreaterThan(160);
      // Freqüència efectiva semblant a 24 kHz: prou fina i prou barata.
      expect(effectiveRate).toBeGreaterThanOrEqual(22000);
      expect(effectiveRate).toBeLessThanOrEqual(26000);
      // La finestra que fa servir YIN ha de contenir més d'un període de 18 Hz.
      const maxTau = Math.min(Math.floor(effectiveRate / 18), downsampled - 2);
      expect(downsampled - maxTau).toBeGreaterThan((1.5 * effectiveRate) / 18);
      expect(TARGET_SAMPLE_RATE).toBe(24000);
    },
  );
});
