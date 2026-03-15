@echo off
echo Windows 시작프로그램에 Claude Bridge 등록 중...

set STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup
set TARGET=D:\Documents\Claudecode-telegram\telegram\start.bat

:: 바로가기 생성 (PowerShell 활용)
powershell -Command "$ws = New-Object -ComObject WScript.Shell; $sc = $ws.CreateShortcut('%STARTUP%\Claude Bridge.lnk'); $sc.TargetPath = '%TARGET%'; $sc.WorkingDirectory = 'D:\Documents\Claudecode-telegram'; $sc.Description = 'Telegram Claude Bridge Auto-Start'; $sc.Save()"

if exist "%STARTUP%\Claude Bridge.lnk" (
    echo.
    echo 등록 완료!
    echo 위치: %STARTUP%\Claude Bridge.lnk
    echo.
    echo PC 부팅 시 자동으로 bridge.js 가 시작됩니다.
    echo 해제하려면: remove-startup.bat 실행
) else (
    echo 등록 실패. 수동으로 등록하세요:
    echo 1. Win+R → shell:startup
    echo 2. start.bat 바로가기를 해당 폴더에 넣기
)
pause
