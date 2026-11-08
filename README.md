# Afinador cromàtic

Afinador cromàtic instal·lable, amb micròfon i funcionament offline.

- **Una sola base de codi** per a mòbil, tauleta i escriptori.
- **PWA**: s'instal·la des del navegador, sense botigues.
- **Offline**: un cop carregada, funciona sense xarxa.
- **Sensibilitat ajustable** (Baixa / Normal / Alta) per captar notes fluixes.
- **Rang ampli**: d'uns 18 Hz a 4,5 kHz; cobreix el B0 d'un baix de 5 cordes i
  afinacions drop/down (A0, G#0, F#0…).
- **Privacitat**: l'àudio es processa al dispositiu; no s'envia enlloc.

## Stack

| Peça | Tecnologia | Per què |
| --- | --- | --- |
| UI | React + TypeScript | Estat senzill, fàcil d'estendre |
| Build | Vite | Ràpid i amb suport PWA |
| Àudio | Web Audio API | `getUserMedia` + `AnalyserNode` |
| Detecció de to | YIN | Robust per a corda i veu |
| Offline | `vite-plugin-pwa` (Workbox) | Service worker i manifest |

Més endavant, la mateixa app es pot empaquetar per a l'App Store i Google Play
amb **Capacitor**, sense reescriure el codi.

## Requisits

- Node.js 20.12 o superior.
- El micròfon només funciona en **context segur**: `localhost` o HTTPS.
- Permís de micròfon concedit al navegador.

## Desenvolupament

```bash
cd tuner
npm install
npm run dev
```

Obre `http://localhost:5173`.

```bash
npm test        # proves de detecció de to i de notes
npm run build   # build de producció + service worker
npm run preview # serveix el build
npm run icons   # regenera les icones PNG
```

## Instal·lació

- **Android (Chrome/Edge)**: menú → *Instal·la l'aplicació*.
- **iOS (Safari)**: *Comparteix* → *Afegeix a la pantalla d'inici* (iOS 14.5+ per al micròfon).
- **Escriptori (Chrome/Edge)**: icona d'instal·lar a la barra d'adreces.
- **macOS (Safari 17+)**: *Arxiu* → *Afegeix al Dock*.

## Com funciona

1. `getUserMedia` demana el micròfon amb el processament del sistema desactivat
   (sense cancel·lació d'eco, supressió de soroll ni guany automàtic), perquè
   l'afinador rebi la senyal el més neta possible.
2. Un `AnalyserNode` llegeix el domini temporal cada 60 ms. La finestra
   s'adapta al maquinari (8192 mostres a 44,1/48 kHz, 16384 a 96 kHz…) per
   mantenir uns 170 ms d'àudio, i després es decima la senyal perquè la
   freqüència efectiva quedi vora 24 kHz. Així la finestra és prou llarga per
   resoldre el B0 (30,87 Hz) sense multiplicar el cost de càlcul de YIN.
3. L'algorisme **YIN** calcula la freqüència fonamental i una mesura de claredat.
4. Es filtra el silenci pel RMS (segons la sensibilitat triada) i es rebutgen les
   lectures poc clares.
5. Es pren la **mediana de les últimes 5** lectures per estabilitzar la agulla.
6. Es converteix la freqüència a nota, octava i **cents** respecte d'una referència
   A4 configurable (415–445 Hz).

## Estructura

```
src/
  audio/
    pitch.ts        YIN + RMS + decimació
    analysis.ts     finestra i decimació segons el maquinari
    notes.ts        freqüència ↔ nota/MIDI/cents
    useTuner.ts     micròfon, bucle de detecció i estat
    *.test.ts       proves
  components/
    Gauge.tsx       indicador de cents
    LevelMeter.tsx  nivell d'entrada
  App.tsx           pantalla principal
  styles.css
scripts/
  generate-icons.mjs
```

## Properes passes

- Presets d'instrument (guitarra, baix, ukelele, violí…).
- Calibratge automàtic del llindar de soroll de fons.
- Historial de notes i mode “hold”.
- Empaquetat amb Capacitor per a les botigues.
- Mode performance: pantalla gran, contrast alt, bloqueig de pantalla.
