; Kissa NSIS Custom Include
; Handles safe, conditional cleanup of screensaver registration during uninstall.

!macro customUnInstall
  ; Read current SCRNSAVE.EXE from HKCU\Control Panel\Desktop
  ClearErrors
  ReadRegStr $0 HKCU "Control Panel\Desktop" "SCRNSAVE.EXE"
  ${Unless} ${Errors}
    ; Only remove SCRNSAVE.EXE if it points specifically to this Kissa installation
    ${If} $0 == "$INSTDIR\Kissa.scr"
    ${OrIf} $0 == '"$INSTDIR\Kissa.scr"'
      DeleteRegValue HKCU "Control Panel\Desktop" "SCRNSAVE.EXE"
    ${EndIf}
  ${EndUnless}
!macroend
