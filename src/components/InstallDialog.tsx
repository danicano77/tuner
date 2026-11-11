import { useEffect, useMemo, useRef } from 'react';

type Platform = 'android' | 'ios' | 'windows' | 'macos' | 'other';

const RELEASES_URL = 'https://github.com/danicano77/tuner/releases/latest';
const DOWNLOADS_URL = `${RELEASES_URL}/download`;

const INSTALLERS = [
  {
    platform: 'windows',
    os: 'Windows',
    file: 'Afinador-Setup.exe',
    detail: 'Dreceres al menú Inici i a l’escriptori',
  },
  {
    platform: 'macos',
    os: 'macOS',
    file: 'Afinador-macOS.dmg',
    detail: 'App per arrossegar a Aplicacions',
  },
  {
    platform: 'android',
    os: 'Android',
    file: 'Afinador-Android.apk',
    detail: 'APK per instal·lar al mòbil o la tauleta',
  },
  {
    platform: 'ios',
    os: 'iOS / iPadOS',
    file: 'Afinador-iOS.mobileconfig',
    detail: 'Perfil amb icona a la pantalla d’inici',
  },
] as const;

function detectPlatform(): Platform {
  const userAgent = navigator.userAgent;

  if (/Android/i.test(userAgent)) return 'android';
  if (
    /iPad|iPhone|iPod/i.test(userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  ) {
    return 'ios';
  }
  if (/Win/i.test(navigator.platform) || /Windows/i.test(userAgent)) return 'windows';
  if (/Mac/i.test(navigator.platform)) return 'macos';
  return 'other';
}

interface PlatformHelp {
  title: string;
  steps: string[];
  note?: string;
}

function getPlatformHelp(platform: Platform): PlatformHelp {
  switch (platform) {
    case 'ios':
      return {
        title: 'iPhone o iPad',
        steps: [
          'Obre aquesta pàgina amb Safari.',
          'Toca Comparteix (el quadrat amb la fletxa) i tria «Afegeix a la pantalla d’inici».',
          'O baixa el perfil i instal·la’l des de Ajustos → General → VPN i gestió de dispositius → Perfil baixat.',
        ],
        note: 'El perfil no està signat amb un certificat d’Apple: iOS en mostra un avís, però només crea la icona de l’afinador.',
      };
    case 'android':
      return {
        title: 'Android',
        steps: [
          'Baixa l’APK i obre’l.',
          'Si Android ho demana, permet instal·lar aplicacions d’aquesta font.',
          'També pots fer servir Chrome: menú ⋮ → «Instal·la l’aplicació».',
        ],
        note: 'L’APK està signat amb una clau de prova: serveix per instal·lar-lo manualment, no per publicar-lo a Google Play.',
      };
    case 'windows':
      return {
        title: 'Windows',
        steps: [
          'Baixa Afinador-Setup.exe i executa’l.',
          'Crea una drecera a l’escriptori i una al menú Inici.',
          'Si SmartScreen avisa, tria «Més informació» → «Executa de totes maneres».',
        ],
        note: 'L’instal·lador no està signat amb un certificat comercial.',
      };
    case 'macos':
      return {
        title: 'Mac',
        steps: [
          'Baixa Afinador-macOS.dmg i obre’l.',
          'Arrossega Afinador a la carpeta Aplicacions.',
          'Al primer inici, fes clic dret sobre Afinador → «Obrir».',
        ],
        note: 'Si macOS diu que l’app està malmesa, executa al Terminal: xattr -dr com.apple.quarantine /Applications/Afinador.app',
      };
    default:
      return {
        title: 'Ordinador',
        steps: [
          'Si el navegador ho permet, instal·la l’app des de la icona de la barra d’adreces.',
          'També pots baixar l’instal·lador de la plataforma corresponent.',
        ],
      };
  }
}

interface InstallDialogProps {
  onClose: () => void;
  onNativeInstall?: () => void;
}

export function InstallDialog({ onClose, onNativeInstall }: InstallDialogProps) {
  const dialogRef = useRef<HTMLElement | null>(null);
  const platform = useMemo(detectPlatform, []);
  const help = getPlatformHelp(platform);

  useEffect(() => {
    const previous =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      previous?.focus();
    };
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section
        ref={dialogRef}
        className="install modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="install-title"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="install-title" className="install-title">
          Instal·la l’Afinador
        </h2>
        <p className="install-lead">
          Tria la teva plataforma. Les apps obren la versió publicada, així que
          s’actualitzen soles i continuen funcionant offline.
        </p>

        <div className="install-grid">
          {INSTALLERS.map((installer) => (
            <a
              key={installer.platform}
              className={`install-card${
                installer.platform === platform ? ' recommended' : ''
              }`}
              href={`${DOWNLOADS_URL}/${installer.file}`}
              download
            >
              <span className="install-os">{installer.os}</span>
              <span className="install-file">{installer.file}</span>
              <span className="install-detail">{installer.detail}</span>
              {installer.platform === platform && (
                <span className="install-badge">El teu dispositiu</span>
              )}
            </a>
          ))}
        </div>

        <div className="install-help">
          <h3>{help.title}</h3>
          <ol>
            {help.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          {help.note && <p className="hint">{help.note}</p>}
        </div>

        {onNativeInstall && (
          <button className="secondary install-native" onClick={onNativeInstall}>
            Instal·la directament amb el navegador
          </button>
        )}

        <a
          className="install-releases"
          href={RELEASES_URL}
          target="_blank"
          rel="noreferrer"
        >
          Totes les versions i notes
        </a>

        <button className="secondary modal-close" onClick={onClose}>
          Tanca
        </button>
      </section>
    </div>
  );
}
