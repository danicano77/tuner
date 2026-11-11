# Afinador cromàtic

Afinador cromàtic instal·lable, amb micròfon i funcionament offline.

- **Una sola base de codi** per a mòbil, tauleta i escriptori.
- **PWA**: s'instal·la des del navegador, sense botigues.
- **Offline**: un cop carregada, funciona sense xarxa.
- **Sensibilitat alta fixa** per captar notes fluixes sense configurar res.
- **Referència A4 ajustable** d'1 en 1 Hz (415–445 Hz).
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

> Si després d'editar el codi el navegador mostra errors del tipus
> `X is not defined`, atura el servidor, esborra `node_modules/.vite` i torna'l
> a engegar. És una cau de transformació de Vite, no un error de l'aplicació.

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

## Publicació a GitHub Pages

El repositori inclou el workflow `.github/workflows/deploy.yml`, que compila i
publica l'app automàticament a cada push.

1. Al repositori de GitHub: **Settings → Pages → Build and deployment**.
2. A **Source**, tria **GitHub Actions** (no *Deploy from a branch*).
3. Fes push a `master` o `main`. El workflow passa els tests, compila i desplega.
4. L'app quedarà a `https://<usuari>.github.io/<repo>/`.

La ruta base (`/nom-del-repo/`) es calcula sola a `vite.config.ts` a partir de
`GITHUB_REPOSITORY`, i el manifest i el service worker n'hereten l'abast.
**No pugis el codi font amb *Deploy from a branch***: el navegador no pot
executar `index.html` + `src/main.tsx` directament i es veu una pàgina en blanc.
Tampoc no cal pujar `dist`: el genera GitHub Actions.

## Com funciona

0. En obrir l'app, el micròfon s'activa sol: es demana permís i comença
   l'escolta sense cap botó. Si el navegador exigeix un gest (per exemple
   Safari) o manté l'àudio suspès fins a la primera interacció, el primer toc
   o tecla el reprèn; a la barra inferior hi ha un enllaç compacte per aturar-lo
   o reintentar-ho.
1. `getUserMedia` demana el micròfon amb el processament del sistema desactivat
   (sense cancel·lació d'eco, supressió de soroll ni guany automàtic), perquè
   l'afinador rebi la senyal el més neta possible.
2. Un `AnalyserNode` llegeix el domini temporal cada 60 ms. La finestra
   s'adapta al maquinari (8192 mostres a 44,1/48 kHz, 16384 a 96 kHz…) per
   mantenir uns 170 ms d'àudio, i després es decima la senyal perquè la
   freqüència efectiva quedi vora 24 kHz. Així la finestra és prou llarga per
   resoldre el B0 (30,87 Hz) sense multiplicar el cost de càlcul de YIN.
3. L'algorisme **YIN** calcula la freqüència fonamental i una mesura de claredat.
4. Es filtra el silenci pel RMS (amb sensibilitat alta fixa) i es rebutgen les
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
