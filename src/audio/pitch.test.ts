import { describe, expect, it } from 'vitest';
import { detectPitch } from './pitch';

const SAMPLE_RATE = 44100;

function sine(frequency: number, length = 4096, amplitude = 0.5): Float32Array {
  const buffer = new Float32Array(length);
  for (let i = 0; i < length; i += 1) {
    buffer[i] = amplitude * Math.sin((2 * Math.PI * frequency * i) / SAMPLE_RATE);
  }
  return buffer;
}

function centsError(detected: number, expected: number): number {
  return Math.abs(1200 * Math.log2(detected / expected));
}

describe('detectPitch (YIN)', () => {
  it.each([82.41, 110, 146.83, 220, 329.63, 440, 880])(
    'detecta un to pur de %f Hz amb menys de 2 cents d’error',
    (frequency) => {
      const estimate = detectPitch(sine(frequency), SAMPLE_RATE);

      expect(estimate).not.toBeNull();
      expect(centsError(estimate!.frequency, frequency)).toBeLessThan(2);
      expect(estimate!.clarity).toBeGreaterThan(0.9);
    },
  );

  it('detecta un to molt suau', () => {
    const estimate = detectPitch(sine(196, 4096, 0.01), SAMPLE_RATE);

    expect(estimate).not.toBeNull();
    expect(centsError(estimate!.frequency, 196)).toBeLessThan(3);
  });

  it('retorna null amb silenci', () => {
    expect(detectPitch(new Float32Array(4096), SAMPLE_RATE)).toBeNull();
  });

  it('retorna null fora del rang de freqüències', () => {
    const estimate = detectPitch(sine(5000), SAMPLE_RATE);
    expect(estimate).toBeNull();
  });

  it('distingeix una octava', () => {
    const low = detectPitch(sine(220), SAMPLE_RATE);
    const high = detectPitch(sine(440), SAMPLE_RATE);

    expect(low).not.toBeNull();
    expect(high).not.toBeNull();
    expect(centsError(high!.frequency / low!.frequency, 2)).toBeLessThan(2);
  });
});
