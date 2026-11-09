import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DEFAULT_SENSITIVITY,
  SENSITIVITY_OPTIONS,
  type Sensitivity,
} from './audio/sensitivity';
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
  const [sensitivity, setSensitivity] = useState<Sensitivity>(DEFAULT_SENSITIVITY);
  const [showSettings, setShowSettings] = useState(false);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const { status, reading, level, error, start, stop } = useTuner(reference, sensitivity);

  const listening = status === 'listening';
  const inTune = reading !== null && Math.abs(reading.cents) <= IN_TUNE_CENTS;

  // Activa el micròfon sol en carregar. Si el navegador el té suspès fins a un
  // gest, l'escoltador de `useTuner` el reprendrà al primer toc.
  useEffect(() => {
    void start();
  }, [start]);

  // Si l'activació automàtica falla (permís o gest requerit), reintentem un sol
  // cop quan l'usuari toca la pantalla o prem una tecla.
  const autoRetriedRef = useRef(false);
  useEffect(() => {
    if (status !== 'error' || autoRetriedRef.current) return;

    const retry = () => {
      autoRetriedRef.current = true;
      void start();
    };

    window.addEventListener('pointerdown', retry, { once: true });
    window.addEventListener('keydown', retry, { once: true });
    return () => {
      window.removeEventListener('pointerdown', retry);
      window.removeEventListener('keydown', retry);
    };
  }, [status, start]);

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
    const wasListening = listening;
    // Aturem el micròfon perquè no capti el to de referència (retroalimentació).
    if (wasListening) stop();

    const context = new AudioContextClass();
    const resumeMicrophone = () => {
      if (wasListening) void start();
    };

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
        resumeMicrophone();
      });
    } catch {
      void context.close();
      resumeMicrophone();
    }
  }, [listening, reading, start, stop]);

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
  const micLabel =
    status === 'starting'
      ? 'Activant el micròfon…'
      : listening
        ? 'Micròfon actiu'
        : 'Micròfon aturat';

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
          <div className="settings-group">
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
          </div>

          <div className="settings-group">
            <label>Sensibilitat</label>
            <div className="reference-row" role="group" aria-label="Sensibilitat">
              {SENSITIVITY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  className={option.value === sensitivity ? 'chip active' : 'chip'}
                  onClick={() => setSensitivity(option.value)}
                  aria-pressed={option.value === sensitivity}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <p className="hint">
              Si el detector s’apaga amb notes fluixes, apuja la sensibilitat. Si veu notes
              fantasma amb soroll de fons, baixa-la.
            </p>
          </div>
        </section>
      )}

      <main className="stage">
        <div className="note-slot" aria-live="polite">
          <div className={`note${inTune ? ' in-tune' : ''}`}>
            {reading ? (
              <>
                <span className="note-name">{reading.note}</span>
                <span className="note-octave">{reading.octave}</span>
              </>
            ) : (
              <span className="note-placeholder">
                {status === 'starting'
                  ? 'Activant el micròfon…'
                  : listening
                    ? 'Toqueu una nota'
                    : 'Micròfon aturat'}
              </span>
            )}
          </div>
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
        <div className="error-slot">
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
        </div>

        <LevelMeter level={level} active={listening} />

        <div className="footer-row">
          <div
            className={`mic-status${listening ? ' on' : ''}${
              status === 'starting' ? ' starting' : ''
            }`}
          >
            <span className="mic-dot" aria-hidden="true" />
            <span>{micLabel}</span>
            <button
              className="link"
              onClick={toggleMicrophone}
              disabled={status === 'starting'}
            >
              {listening ? 'Atura' : status === 'error' ? 'Reintenta' : 'Activa'}
            </button>
          </div>
          <button
            className={reading ? 'secondary' : 'secondary secondary-hidden'}
            onClick={() => void playReferenceTone()}
            disabled={!reading}
            aria-hidden={!reading}
            tabIndex={reading ? 0 : -1}
            title={`Escoltar ${noteLabel} de referència`}
          >
            Escoltar
          </button>
        </div>

        <p className="privacy">L’àudio es processa al teu dispositiu. No s’envia enlloc.</p>
      </footer>
    </div>
  );
}
