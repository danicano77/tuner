#!/usr/bin/env bash
# Construeix Afinador.app i Afinador-macOS.dmg.
# Cal executar-lo en macOS (fa servir sips, iconutil, codesign i hdiutil).
#
#   installers/macos/build.sh
#
# L'app és un embolcall lleuger: obre la PWA en mode aplicació amb Chrome,
# Edge, Brave o Chromium; si no n'hi ha cap, amb el navegador predeterminat.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
APP_URL="${APP_URL:-https://danicano77.github.io/tuner/}"
VERSION="${VERSION:-0.1.0}"

BUILD="$ROOT/dist-installers/macos"
STAGE="$ROOT/dist-installers/macos-stage"
DMG="$ROOT/dist-installers/Afinador-macOS.dmg"
APP="$BUILD/Afinador.app"
ICONSET="$BUILD/AppIcon.iconset"
SRC_ICON="$ROOT/public/icons/icon-512.png"

rm -rf "$BUILD" "$STAGE" "$DMG"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources" "$ICONSET"

# --- Info.plist -------------------------------------------------------------
cat > "$APP/Contents/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleDevelopmentRegion</key>
  <string>ca</string>
  <key>CFBundleDisplayName</key>
  <string>Afinador</string>
  <key>CFBundleExecutable</key>
  <string>Afinador</string>
  <key>CFBundleIconFile</key>
  <string>AppIcon</string>
  <key>CFBundleIdentifier</key>
  <string>io.github.danicano77.afinador</string>
  <key>CFBundleInfoDictionaryVersion</key>
  <string>6.0</string>
  <key>CFBundleName</key>
  <string>Afinador</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>CFBundleShortVersionString</key>
  <string>${VERSION}</string>
  <key>CFBundleVersion</key>
  <string>${VERSION}</string>
  <key>LSApplicationCategoryType</key>
  <string>public.app-category.music</string>
  <key>LSMinimumSystemVersion</key>
  <string>11.0</string>
  <key>NSHighResolutionCapable</key>
  <true/>
  <key>NSPrincipalClass</key>
  <string>NSApplication</string>
</dict>
</plist>
PLIST

# --- Llançador --------------------------------------------------------------
cat > "$APP/Contents/MacOS/Afinador" <<'LAUNCHER'
#!/bin/bash
# Obre l'Afinador en una finestra d'aplicació, sense barra d'adreces.
URL="https://danicano77.github.io/tuner/"

CANDIDATES=(
  "/Applications/Google Chrome.app"
  "$HOME/Applications/Google Chrome.app"
  "/Applications/Microsoft Edge.app"
  "$HOME/Applications/Microsoft Edge.app"
  "/Applications/Brave Browser.app"
  "$HOME/Applications/Brave Browser.app"
  "/Applications/Chromium.app"
  "$HOME/Applications/Chromium.app"
  "/Applications/Vivaldi.app"
  "$HOME/Applications/Vivaldi.app"
)

for app in "${CANDIDATES[@]}"; do
  if [ -d "$app" ]; then
    open -n -a "$app" --args --app="$URL"
    exit 0
  fi
done

# Sense navegador compatible: obre'l al navegador predeterminat.
open "$URL"
LAUNCHER
chmod +x "$APP/Contents/MacOS/Afinador"

# --- Icona ------------------------------------------------------------------
for size in 16 32 128 256 512; do
  sips -z "$size" "$size" "$SRC_ICON" --out "$ICONSET/icon_${size}x${size}.png" >/dev/null
  double=$((size * 2))
  sips -z "$double" "$double" "$SRC_ICON" --out "$ICONSET/icon_${size}x${size}@2x.png" >/dev/null
done
iconutil -c icns "$ICONSET" -o "$APP/Contents/Resources/AppIcon.icns"
rm -rf "$ICONSET"

# Signatura ad-hoc: no elimina l'avís de Gatekeeper, però evita el missatge
# d'aplicació malmesa en alguns sistemes. Si falla, el paquet continua valent.
if codesign --force --deep --sign - "$APP" >/dev/null 2>&1; then
  echo "Signatura ad-hoc aplicada."
else
  echo "Avís: no s'ha pogut signar l'app (es pot fer servir igualment)."
fi

# --- DMG --------------------------------------------------------------------
mkdir -p "$STAGE"
cp -R "$APP" "$STAGE/"
ln -s /Applications "$STAGE/Applications"
cat > "$STAGE/Llegeix-me.txt" <<'TXT'
Afinador cromàtic per a macOS
=============================

1. Arrossega "Afinador" a la carpeta Aplicacions.
2. La primera vegada, fes clic dret (o Control + clic) sobre Afinador i tria
   "Obrir". Cal fer-ho perquè l'app no està signada amb un certificat d'Apple.

Si macOS diu que l'app està malmesa o no es pot obrir, obre Terminal i executa:

   xattr -dr com.apple.quarantine /Applications/Afinador.app

L'app obre l'afinador en una finestra pròpia amb Chrome, Edge, Brave o
Chromium. Si no en troba cap, l'obre amb el navegador predeterminat.

Adreça: https://danicano77.github.io/tuner/
L'aplicació s'actualitza sola des del web; no cal reinstal·lar-la.
TXT

hdiutil create -volname "Afinador" -srcfolder "$STAGE" -ov -format UDZO "$DMG" >/dev/null
rm -rf "$STAGE"

echo "Generat: $DMG"
