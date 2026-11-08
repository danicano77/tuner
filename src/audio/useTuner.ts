import { useCallback, useEffect, useRef, useState } from 'react';
import { analysisSettings } from './analysis';
import { frequencyToNote, type NoteReading } from './notes';
import { detectPitch, downsample, rms } from './pitch';
import { SENSITIVITY_CONFIG, type Sensitivity } from './sensitivity';

export type TunerStatus = 'idle' | 'starting' | 'listening' | 'error';

export interface TunerApi {
  status: TunerStatus;
  reading: NoteReading | null;
  level: number;
  error: string | null;
  start: () => Promise<void>;
  stop: () => void;
}

const DETECTION_INTERVAL_MS = 60;
const HISTORY_SIZE = 5;
const SILENCE_TIMEOUT_MS = 600;

const AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: false,
  noiseSuppression: false,
  autoGainControl: false,
  channelCount: 1,
};

export function useTuner(referenceA4: number, sensitivity: Sensitivity): TunerApi {
  const [status, setStatus] = useState<TunerStatus>('idle');
  const [reading, setReading] = useState<NoteReading | null>(null);
  const [level, setLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const contextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const timerRef = useRef<number | null>(null);
  const historyRef = useRef<number[]>([]);
  const lastPitchRef = useRef(0);
  const runningRef = useRef(false);
  const referenceRef = useRef(referenceA4);
  const sensitivityRef = useRef(sensitivity);

  useEffect(() => {
    referenceRef.current = referenceA4;
    setReading((previous) =>
      previous ? frequencyToNote(previous.frequency, referenceA4) : previous,
    );
  }, [referenceA4]);

  useEffect(() => {
    sensitivityRef.current = sensitivity;
  }, [sensitivity]);

  const cleanup = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    analyserRef.current = null;
    const context = contextRef.current;
    contextRef.current = null;
    if (context && context.state !== 'closed') {
      void context.close();
    }
    historyRef.current = [];
  }, []);

  const stop = useCallback(() => {
    runningRef.current = false;
    cleanup();
    setStatus('idle');
    setReading(null);
    setLevel(0);
  }, [cleanup]);

  const start = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    setError(null);
    setStatus('starting');

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Aquest navegador no dona accés al micròfon.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: AUDIO_CONSTRAINTS,
        video: false,
      });

      if (!runningRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      const AudioContextClass =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) {
        throw new Error('Aquest navegador no suporta Web Audio.');
      }

      const context = new AudioContextClass();
      await context.resume();

      if (!runningRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        void context.close();
        return;
      }

      // Adaptem la finestra i la decimació al maquinari (44,1, 48, 96 kHz…).
      const { fftSize, factor } = analysisSettings(context.sampleRate);
      const effectiveSampleRate = context.sampleRate / factor;

      const source = context.createMediaStreamSource(stream);
      const analyser = context.createAnalyser();
      analyser.fftSize = fftSize;
      analyser.smoothingTimeConstant = 0;
      source.connect(analyser);

      streamRef.current = stream;
      contextRef.current = context;
      analyserRef.current = analyser;
      historyRef.current = [];
      lastPitchRef.current = performance.now();

      const buffer = new Float32Array(analyser.fftSize);
      const downsampled = new Float32Array(Math.floor(buffer.length / factor));

      const tick = () => {
        const currentAnalyser = analyserRef.current;
        const currentContext = contextRef.current;
        if (!currentAnalyser || !currentContext) return;

        currentAnalyser.getFloatTimeDomainData(buffer);
        const currentLevel = rms(buffer);
        setLevel(currentLevel);

        const { silenceRms, minClarity } = SENSITIVITY_CONFIG[sensitivityRef.current];

        // Només mantenim la nota si hi ha hagut una detecció vàlida recent.
        const clearIfStale = () => {
          if (performance.now() - lastPitchRef.current > SILENCE_TIMEOUT_MS) {
            if (historyRef.current.length > 0) {
              historyRef.current = [];
              setReading(null);
            }
          }
        };

        if (currentLevel < silenceRms) {
          clearIfStale();
          return;
        }

        const estimate = detectPitch(
          downsample(buffer, factor, downsampled),
          effectiveSampleRate,
        );
        if (!estimate || estimate.clarity < minClarity) {
          clearIfStale();
          return;
        }

        lastPitchRef.current = performance.now();

        const history = historyRef.current;
        history.push(estimate.frequency);
        if (history.length > HISTORY_SIZE) history.shift();

        const sorted = [...history].sort((a, b) => a - b);
        const median = sorted[Math.floor(sorted.length / 2)] ?? estimate.frequency;
        setReading(frequencyToNote(median, referenceRef.current));
      };

      timerRef.current = window.setInterval(tick, DETECTION_INTERVAL_MS);
      setStatus('listening');
    } catch (caught) {
      cleanup();
      runningRef.current = false;

      let message = 'No s’ha pogut accedir al micròfon.';
      if (caught instanceof Error) {
        message =
          caught.name === 'NotAllowedError' || caught.name === 'SecurityError'
            ? 'Permís del micròfon denegat. Activa’l a la configuració del navegador.'
            : caught.message;
      }

      setError(message);
      setStatus('error');
      setReading(null);
      setLevel(0);
    }
  }, [cleanup]);

  useEffect(
    () => () => {
      runningRef.current = false;
      cleanup();
    },
    [cleanup],
  );

  return { status, reading, level, error, start, stop };
}
