interface LevelMeterProps {
  level: number;
  active: boolean;
}

export function LevelMeter({ level, active }: LevelMeterProps) {
  const percent = active ? Math.min(100, Math.max(0, level * 500)) : 0;

  return (
    <div className={active ? 'level active' : 'level'} aria-hidden="true">
      <div className="level-fill" style={{ width: `${percent}%` }} />
    </div>
  );
}
