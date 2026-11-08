import { describe, expect, it } from 'vitest';
import { detectPitch, downsample } from './pitch';

const SAMPLE_RATE = 44100;
// Els tons greus s'analitzen amb una finestra de 8192 mostres decimada per 2,
// exactament com al detector en directe.
const LOW_SAMPLE_RATE = SAMPLE_RATE / 2;
const LOW_BUFFER_LENGTH = 8192;

function sine(
  frequency: number,
  length = 4096,
  amplitude = 0.5,
  sampleRate = SAMPLE_RATE,
): Float32Array {
  const buffer = new Float32Array(length);
  for (let i = 0; i < length; i += 1) {
    buffer[i] = amplitude * Math.sin((2 * Math.PI * frequency * i) / sampleRate);
  }
  return buffer;
}

function detectLow(frequency: number, amplitude = 0.5) {
  const decimated = downsample(
    sine(frequency, LOW_BUFFER_LENGTH, amplitude, SAMPLE_RATE),
    2,
  );
  return detectPitch(decimated, LOW_SAMPLE_RATE);
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

describe('rang greu (baix de 5 cordes i drop tunings)', () => {
  // D0, E0, F#0 (baix de 6 cordes), A0 (drop A), B0 (5a corda) i E1.
  it.each([18.35, 20.6, 23.12, 27.5, 30.87, 41.2])(
    'detecta un to greu de %f Hz amb menys de 5 cents d’error',
    (frequency) => {
      const estimate = detectLow(frequency);

      expect(estimate).not.toBeNull();
      expect(centsError(estimate!.frequency, frequency)).toBeLessThan(5);
      expect(estimate!.clarity).toBeGreaterThan(0.5);
    },
  );

  it('detecta el B0 del baix de 5 cordes (30.87 Hz)', () => {
    const estimate = detectLow(30.87);

    expect(estimate).not.toBeNull();
    expect(estimate!.frequency).toBeGreaterThan(30);
    expect(estimate!.frequency).toBeLessThan(31.8);
  });

  it('detecta un to greu molt suau', () => {
    const estimate = detectLow(30.87, 0.01);

    expect(estimate).not.toBeNull();
    expect(centsError(estimate!.frequency, 30.87)).toBeLessThan(8);
  });
});

describe('downsample', () => {
  it('redueix la longitud i fa la mitjana de cada bloc', () => {
    const output = downsample(new Float32Array([1, 3, -2, 2, 0.5, 1.5]), 2);

    expect(output.length).toBe(3);
    expect([...output]).toEqual([2, 0, 1]);
  });

  it('retorna la mateixa referència si el factor és 1', () => {
    const input = new Float32Array([1, 2, 3]);

    expect(downsample(input, 1)).toBe(input);
  });

  it('reutilitza el buffer de sortida proporcionat', () => {
    const output = new Float32Array(2);
    const result = downsample(new Float32Array([2, 4, 6, 8]), 2, output);

    expect(result).toBe(output);
    expect([...result]).toEqual([3, 7]);
  });
});
