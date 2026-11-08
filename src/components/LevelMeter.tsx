interface LevelMeterProps {
  level: number;
  active: boolean;
}

export function LevelMeter({ level, active }: LevelMeterProps) {
  // Escala en decibels: fa visible la senyal fluixa (-60 dB → 0 %, 0 dB → 100 %).
  const decibels = 20 * Math.log10(Math.max(level, 1e-6));
  const percent = active ? Math.min(100, Math.max(0, ((decibels + 60) / 60) * 100)) : 0;

  return (
    <div className={active ? 'level active' : 'level'} aria-hidden="true">
      <div className="level-fill" style={{ width: `${percent}%` }} />
    </div>
  );
}
