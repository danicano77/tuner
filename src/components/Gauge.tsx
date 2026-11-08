interface GaugeProps {
  cents: number | null;
  inTune: boolean;
}

const TICKS = [-50, -25, 0, 25, 50];

function toPercent(cents: number): number {
  return 50 + (Math.max(-50, Math.min(50, cents)) / 50) * 50;
}

export function Gauge({ cents, inTune }: GaugeProps) {
  const position = toPercent(cents ?? 0);
  const state =
    cents === null ? 'idle' : inTune ? 'good' : Math.abs(cents) <= 15 ? 'close' : 'off';

  return (
    <div
      className={`gauge gauge-${state}`}
      role="img"
      aria-label={cents === null ? 'Sense lectura de to' : `Desviació de ${cents.toFixed(1)} cents`}
    >
      <div className="gauge-track">
        <div className="gauge-zone" />
        {TICKS.map((tick) => (
          <span
            key={tick}
            className="gauge-tick"
            style={{ left: `${toPercent(tick)}%` }}
          />
        ))}
        <div className="gauge-needle" style={{ left: `${position}%` }} />
      </div>
      <div className="gauge-labels" aria-hidden="true">
        {TICKS.map((tick) => (
          <span key={tick}>{tick > 0 ? `+${tick}` : tick}</span>
        ))}
      </div>
    </div>
  );
}
