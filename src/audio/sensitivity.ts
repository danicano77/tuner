export type Sensitivity = 'low' | 'normal' | 'high';

export interface SensitivityConfig {
  /** Nivell RMS mínim per considerar que hi ha so. */
  silenceRms: number;
  /** Claredat mínima de YIN per acceptar una lectura. */
  minClarity: number;
}

export const SENSITIVITY_CONFIG: Record<Sensitivity, SensitivityConfig> = {
  // Entorns amb soroll: només notes clares i relativament fortes.
  low: { silenceRms: 0.004, minClarity: 0.65 },
  // Equilibri per a la majoria d'instruments i sales.
  normal: { silenceRms: 0.0012, minClarity: 0.55 },
  // Notes fluixes o micròfons amb poca ganància.
  high: { silenceRms: 0.0004, minClarity: 0.5 },
};

export const SENSITIVITY_OPTIONS: ReadonlyArray<{ value: Sensitivity; label: string }> = [
  { value: 'low', label: 'Baixa' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'Alta' },
];

export const DEFAULT_SENSITIVITY: Sensitivity = 'high';
