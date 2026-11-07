export const NOTE_NAMES = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
] as const;

export type NoteName = (typeof NOTE_NAMES)[number];

export interface NoteReading {
  /** Freqüència detectada, en Hz. */
  frequency: number;
  /** Índex MIDI arrodonit (69 = A4). */
  midi: number;
  note: NoteName;
  octave: number;
  /** Desviació respecte de la nota objectiu, en cents (-50..50). */
  cents: number;
  /** Freqüència exacta de la nota objectiu, en Hz. */
  targetFrequency: number;
}

/** Freqüència d'una nota MIDI donada una referència A4. */
export function midiToFrequency(midi: number, referenceA4 = 440): number {
  return referenceA4 * 2 ** ((midi - 69) / 12);
}

/** Converteix una freqüència en nota, octava i desviació en cents. */
export function frequencyToNote(frequency: number, referenceA4 = 440): NoteReading {
  const midiFloat = 69 + 12 * Math.log2(frequency / referenceA4);
  const midi = Math.round(midiFloat);
  const cents = (midiFloat - midi) * 100;
  const note = NOTE_NAMES[((midi % 12) + 12) % 12];
  const octave = Math.floor(midi / 12) - 1;
  const targetFrequency = midiToFrequency(midi, referenceA4);

  return {
    frequency,
    midi,
    note,
    octave,
    cents,
    targetFrequency,
  };
}
