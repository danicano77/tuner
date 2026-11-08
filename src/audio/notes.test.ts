import { describe, expect, it } from 'vitest';
import { frequencyToNote, midiToFrequency } from './notes';

describe('frequencyToNote', () => {
  it('converteix A4 = 440 Hz en A4 amb 0 cents', () => {
    const reading = frequencyToNote(440);

    expect(reading.note).toBe('A');
    expect(reading.octave).toBe(4);
    expect(reading.midi).toBe(69);
    expect(reading.cents).toBeCloseTo(0, 6);
    expect(reading.targetFrequency).toBeCloseTo(440, 6);
  });

  it('converteix el Do central', () => {
    const reading = frequencyToNote(261.6255653);

    expect(reading.note).toBe('C');
    expect(reading.octave).toBe(4);
    expect(reading.midi).toBe(60);
    expect(Math.abs(reading.cents)).toBeLessThan(0.01);
  });

  it('respecta una referència A4 diferent', () => {
    const reading = frequencyToNote(440, 432);

    expect(reading.note).toBe('A');
    expect(reading.cents).toBeCloseTo(31.77, 1);
    expect(reading.targetFrequency).toBeCloseTo(432, 6);
  });

  it('distingeix desviacions positives i negatives', () => {
    expect(frequencyToNote(445).cents).toBeGreaterThan(0);
    expect(frequencyToNote(435).cents).toBeLessThan(0);
  });
});

describe('midiToFrequency', () => {
  it('converteix MIDI a Hz', () => {
    expect(midiToFrequency(69, 440)).toBeCloseTo(440, 6);
    expect(midiToFrequency(60, 440)).toBeCloseTo(261.6255653, 4);
  });
});
