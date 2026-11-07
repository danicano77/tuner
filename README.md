# Afinador cromàtic

Afinador cromàtic instal·lable, amb micròfon i funcionament offline.

- **Una sola base de codi** per a mòbil, tauleta i escriptori.
- **PWA**: s'instal·la des del navegador, sense botigues.
- **Offline**: un cop carregada, funciona sense xarxa.
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
2. Un `AnalyserNode` de 4096 mostres llegeix el domini temporal cada 60 ms.
3. L'algorisme **YIN** calcula la freqüència fonamental i una mesura de claredat.
4. Es filtra el silenci pel RMS i es rebutgen lectures poc clares.
5. Es pren la **mediana de les últimes 5** lectures per estabilitzar la agulla.
6. Es converteix la freqüència a nota, octava i **cents** respecte d'una referència
   A4 configurable (415–445 Hz).

## Estructura

```
src/
  audio/
    pitch.ts        YIN + RMS
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
- Calibratge de la sensibilitat i del llindar de silenci.
- Historial de notes i mode “hold”.
- Empaquetat amb Capacitor per a les botigues.
- Mode performance: pantalla gran, contrast alt, bloqueig de pantalla.
