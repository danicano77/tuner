// Genera un perfil de configuració de iOS amb un "Web Clip": un accés directe
// a l'afinador a la pantalla d'inici, amb icona i pantalla completa.
//
//   node installers/ios/build.mjs
//
// El perfil no està signat amb un certificat d'Apple; iOS l'accepta igualment
// (mostra un avís) i es pot instal·lar des de Ajustos > Perfil baixat.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const outDir = join(root, 'dist-installers');
const outFile = join(outDir, 'Afinador-iOS.mobileconfig');

const APP_URL = 'https://danicano77.github.io/tuner/';
const icon = readFileSync(join(root, 'public', 'apple-touch-icon.png')).toString(
  'base64',
);
const wrappedIcon = icon.match(/.{1,64}/g).join('\n');
const webClipUuid = randomUUID().toUpperCase();
const profileUuid = randomUUID().toUpperCase();

const profile = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>PayloadContent</key>
  <array>
    <dict>
      <key>FullScreen</key>
      <true/>
      <key>Icon</key>
      <data>
${wrappedIcon}
      </data>
      <key>IgnoreManifest</key>
      <true/>
      <key>IsRemovable</key>
      <true/>
      <key>Label</key>
      <string>Afinador</string>
      <key>PayloadDescription</key>
      <string>Afegeix l'Afinador a la pantalla d'inici.</string>
      <key>PayloadDisplayName</key>
      <string>Afinador</string>
      <key>PayloadIdentifier</key>
      <string>io.github.danicano77.afinador.webclip</string>
      <key>PayloadType</key>
      <string>com.apple.webClip.managed</string>
      <key>PayloadUUID</key>
      <string>${webClipUuid}</string>
      <key>PayloadVersion</key>
      <integer>1</integer>
      <key>Precomposed</key>
      <true/>
      <key>URL</key>
      <string>${APP_URL}</string>
    </dict>
  </array>
  <key>PayloadDescription</key>
  <string>Accés directe a l'Afinador cromàtic.</string>
  <key>PayloadDisplayName</key>
  <string>Afinador</string>
  <key>PayloadIdentifier</key>
  <string>io.github.danicano77.afinador.profile</string>
  <key>PayloadOrganization</key>
  <string>danicano77</string>
  <key>PayloadRemovalDisallowed</key>
  <false/>
  <key>PayloadType</key>
  <string>Configuration</string>
  <key>PayloadUUID</key>
  <string>${profileUuid}</string>
  <key>PayloadVersion</key>
  <integer>1</integer>
</dict>
</plist>
`;

mkdirSync(outDir, { recursive: true });
writeFileSync(outFile, profile, 'utf8');
console.log(`Generat: ${outFile}`);
