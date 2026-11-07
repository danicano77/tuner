import { useCallback, useEffect, useState } from 'react';
import { useTuner } from './audio/useTuner';
import { Gauge } from './components/Gauge';
import { LevelMeter } from './components/LevelMeter';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const REFERENCE_PITCHES = [415, 430, 432, 435, 438, 440, 442, 443, 444, 445];
const IN_TUNE_CENTS = 5;

function getAudioContextClass(): typeof AudioContext | undefined {
  return (
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  );
}

export default function App() {
  const [reference, setReference] = useState(440);
  const [showSettings, setShowSettings] = useState(false);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const { status, reading, level, error, start, stop } = useTuner(reference);

  const listening = status === 'listening';
  const inTune = reading !== null && Math.abs(reading.cents) <= IN_TUNE_CENTS;

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const toggleMicrophone = useCallback(() => {
    if (listening) {
      stop();
    } else {
      void start();
    }
  }, [listening, start, stop]);

  const playReferenceTone = useCallback(async () => {
    if (!reading) return;
    const AudioContextClass = getAudioContextClass();
    if (!AudioContextClass) return;

    const targetFrequency = reading.targetFrequency;
    if (listening) stop();

    const context = new AudioContextClass();
    try {
      await context.resume();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = targetFrequency;

      const now = context.currentTime;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 0.02);
      gain.gain.setValueAtTime(0.18, now + 0.9);
      gain.gain.linearRampToValueAtTime(0, now + 1.15);

      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(now);
      oscillator.stop(now + 1.2);
      oscillator.addEventListener('ended', () => {
        void context.close();
      });
    } catch {
      void context.close();
    }
  }, [listening, reading, stop]);

  const install = useCallback(async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
  }, [installEvent]);

  const noteLabel = reading ? `${reading.note}${reading.octave}` : '—';
  const centsLabel = reading
    ? `${reading.cents >= 0 ? '+' : ''}${reading.cents.toFixed(1)} ¢`
    : '—';

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true" />
          <span>Afinador</span>
        </div>
        <div className="topbar-actions">
          {installEvent && (
            <button className="ghost" onClick={() => void install()}>
              Instal·la
            </button>
          )}
          <button
            className="ghost"
            onClick={() => setShowSettings((value) => !value)}
            aria-expanded={showSettings}
            aria-controls="settings"
            title="Configuració"
          >
            A4 = {reference} Hz
          </button>
        </div>
      </header>

      {showSettings && (
        <section id="settings" className="settings">
          <label>Referència A4</label>
          <div className="reference-row" role="group" aria-label="Referència A4">
            {REFERENCE_PITCHES.map((value) => (
              <button
                key={value}
                className={value === reference ? 'chip active' : 'chip'}
                onClick={() => setReference(value)}
                aria-pressed={value === reference}
              >
                {value}
              </button>
            ))}
          </div>
          <p className="hint">
            El La central (A4) varia segons l’instrument i l’època. 440 Hz és l’estàndard
            actual; 415 Hz s’usa sovint en música barroca.
          </p>
        </section>
      )}

      <main className="stage">
        <div className={`note${inTune ? ' in-tune' : ''}`} aria-live="polite">
          {reading ? (
            <>
              <span className="note-name">{reading.note}</span>
              <span className="note-octave">{reading.octave}</span>
            </>
          ) : (
            <span className="note-placeholder">
              {listening ? 'Toqueu una nota' : 'Micròfon aturat'}
            </span>
          )}
        </div>

        <div className={`cents${inTune ? ' in-tune' : ''}`}>{centsLabel}</div>

        <Gauge cents={reading?.cents ?? null} inTune={inTune} />

        <dl className="readout">
          <div>
            <dt>Detectat</dt>
            <dd>{reading ? `${reading.frequency.toFixed(1)} Hz` : '—'}</dd>
          </div>
          <div>
            <dt>Objectiu</dt>
            <dd>{reading ? `${reading.targetFrequency.toFixed(1)} Hz` : '—'}</dd>
          </div>
        </dl>
      </main>

      <footer className="controls">
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        <LevelMeter level={level} active={listening} />

        <div className="button-row">
          <button
            className={listening ? 'primary stop' : 'primary'}
            onClick={toggleMicrophone}
            disabled={status === 'starting'}
          >
            {status === 'starting'
              ? 'Connectant…'
              : listening
                ? 'Atura el micròfon'
                : 'Activa el micròfon'}
          </button>
          {reading && (
            <button
              className="secondary"
              onClick={() => void playReferenceTone()}
              title={`Escoltar ${noteLabel} de referència`}
            >
              Escoltar
            </button>
          )}
        </div>

        <p className="privacy">L’àudio es processa al teu dispositiu. No s’envia enlloc.</p>
      </footer>
    </div>
  );
}
