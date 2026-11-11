; Instal.lador de l'Afinador per a Windows.
; Crea dreceres a l'escriptori i al menu Inici que obren la PWA en mode
; aplicacio (sense barra d'adreces) amb Edge, Chrome o Brave.
;
; Compilacio:  makensis /DAPP_VERSION=0.1.0 afinador.nsi
;
; Nota: el fitxer es mante en ASCII a proposit. NSIS nomes interpreta UTF-8 si
; el script porta BOM; aixi evitem accents trencats.

Unicode true

!ifndef APP_URL
  !define APP_URL "https://danicano77.github.io/tuner/"
!endif
!ifndef APP_VERSION
  !define APP_VERSION "0.1.0"
!endif

Name "Afinador"
BrandingText "Afinador cromatic"
OutFile "../../dist-installers/Afinador-Setup.exe"
InstallDir "$LOCALAPPDATA\Afinador"
InstallDirRegKey HKCU "Software\Afinador" "InstallDir"
RequestExecutionLevel user
SetCompressor /SOLID lzma
ShowInstDetails show

Icon "afinador.ico"
UninstallIcon "afinador.ico"

!include "MUI2.nsh"
!include "LogicLib.nsh"

!define MUI_ICON "afinador.ico"
!define MUI_UNICON "afinador.ico"
!define MUI_ABORTWARNING
!define MUI_FINISHPAGE_RUN
!define MUI_FINISHPAGE_RUN_FUNCTION "LaunchApp"
!define MUI_FINISHPAGE_RUN_TEXT "Obre l'Afinador ara"

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "Catalan"

Var BrowserPath

; Detecta el primer navegador compatible disponible.
Function .onInit
  StrCpy $BrowserPath ""

  ${If} ${FileExists} "$PROGRAMFILES\Microsoft\Edge\Application\msedge.exe"
    StrCpy $BrowserPath "$PROGRAMFILES\Microsoft\Edge\Application\msedge.exe"
  ${ElseIf} ${FileExists} "$PROGRAMFILES64\Microsoft\Edge\Application\msedge.exe"
    StrCpy $BrowserPath "$PROGRAMFILES64\Microsoft\Edge\Application\msedge.exe"
  ${ElseIf} ${FileExists} "$LOCALAPPDATA\Microsoft\Edge\Application\msedge.exe"
    StrCpy $BrowserPath "$LOCALAPPDATA\Microsoft\Edge\Application\msedge.exe"
  ${ElseIf} ${FileExists} "$PROGRAMFILES\Google\Chrome\Application\chrome.exe"
    StrCpy $BrowserPath "$PROGRAMFILES\Google\Chrome\Application\chrome.exe"
  ${ElseIf} ${FileExists} "$PROGRAMFILES64\Google\Chrome\Application\chrome.exe"
    StrCpy $BrowserPath "$PROGRAMFILES64\Google\Chrome\Application\chrome.exe"
  ${ElseIf} ${FileExists} "$LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
    StrCpy $BrowserPath "$LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
  ${ElseIf} ${FileExists} "$PROGRAMFILES\BraveSoftware\Brave-Browser\Application\brave.exe"
    StrCpy $BrowserPath "$PROGRAMFILES\BraveSoftware\Brave-Browser\Application\brave.exe"
  ${ElseIf} ${FileExists} "$PROGRAMFILES64\BraveSoftware\Brave-Browser\Application\brave.exe"
    StrCpy $BrowserPath "$PROGRAMFILES64\BraveSoftware\Brave-Browser\Application\brave.exe"
  ${ElseIf} ${FileExists} "$LOCALAPPDATA\BraveSoftware\Brave-Browser\Application\brave.exe"
    StrCpy $BrowserPath "$LOCALAPPDATA\BraveSoftware\Brave-Browser\Application\brave.exe"
  ${EndIf}
FunctionEnd

; $0 = cami de la drecera. Si no hi ha cap navegador compatible, obre l'adreca
; amb el navegador predeterminat (amb barra d'adreces, com a mal recanvi).
Function CreateAppShortcut
  ${If} $BrowserPath != ""
    CreateShortCut "$0" "$BrowserPath" "--app=${APP_URL}" "$INSTDIR\afinador.ico" 0 SW_SHOWNORMAL "" "Afinador cromatic"
  ${Else}
    CreateShortCut "$0" "$WINDIR\explorer.exe" '"${APP_URL}"' "$INSTDIR\afinador.ico" 0 SW_SHOWNORMAL "" "Afinador cromatic"
  ${EndIf}
FunctionEnd

Function LaunchApp
  ${If} $BrowserPath != ""
    Exec '"$BrowserPath" --app=${APP_URL}'
  ${Else}
    ExecShell "open" "${APP_URL}"
  ${EndIf}
FunctionEnd

Section "Afinador" SecMain
  SetOutPath "$INSTDIR"
  File "afinador.ico"
  File "Llegeix-me.txt"
  WriteUninstaller "$INSTDIR\Uninstall.exe"

  StrCpy $0 "$DESKTOP\Afinador.lnk"
  Call CreateAppShortcut

  CreateDirectory "$SMPROGRAMS\Afinador"
  StrCpy $0 "$SMPROGRAMS\Afinador\Afinador.lnk"
  Call CreateAppShortcut
  CreateShortCut "$SMPROGRAMS\Afinador\Desinstal.la.lnk" "$INSTDIR\Uninstall.exe"

  WriteRegStr HKCU "Software\Afinador" "InstallDir" "$INSTDIR"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Afinador" "DisplayName" "Afinador"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Afinador" "DisplayIcon" "$INSTDIR\afinador.ico"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Afinador" "DisplayVersion" "${APP_VERSION}"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Afinador" "Publisher" "danicano77"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Afinador" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Afinador" "UninstallString" '"$INSTDIR\Uninstall.exe"'
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Afinador" "NoModify" 1
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Afinador" "NoRepair" 1
SectionEnd

Section "Uninstall"
  Delete "$DESKTOP\Afinador.lnk"
  Delete "$SMPROGRAMS\Afinador\Afinador.lnk"
  Delete "$SMPROGRAMS\Afinador\Desinstal.la.lnk"
  RMDir "$SMPROGRAMS\Afinador"

  Delete "$INSTDIR\afinador.ico"
  Delete "$INSTDIR\Llegeix-me.txt"
  Delete "$INSTDIR\Uninstall.exe"
  RMDir "$INSTDIR"

  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Afinador"
  DeleteRegKey HKCU "Software\Afinador"
SectionEnd
