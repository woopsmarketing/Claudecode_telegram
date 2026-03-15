@echo off
title Claude Bridge (Auto-Restart)
cd /d D:\Documents\Claudecode-telegram

:loop
echo [%date% %time%] Bridge 시작...
node telegram\bridge.js
echo [%date% %time%] Bridge 종료됨. 5초 후 재시작...
timeout /t 5 /nobreak >nul
goto loop
