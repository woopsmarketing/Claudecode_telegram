@echo off
set STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup

if exist "%STARTUP%\Claude Bridge.lnk" (
    del "%STARTUP%\Claude Bridge.lnk"
    echo Claude Bridge 시작프로그램 해제 완료.
) else (
    echo 등록된 시작프로그램이 없습니다.
)
pause
