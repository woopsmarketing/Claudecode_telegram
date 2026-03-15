@echo off
title Claude Bridge (Auto-Restart)
cd /d D:\Documents\Claudecode-telegram

echo ============================================
echo   Claude Telegram Bridge - Auto Restart
echo   종료: 이 창을 닫거나 Ctrl+C
echo ============================================
echo.

:loop
echo [%date% %time%] Bridge 시작...
echo [%date% %time%] Bridge 시작 >> telegram\bridge.log
node telegram\bridge.js 2>> telegram\bridge.log
echo.
echo [%date% %time%] Bridge 종료됨. 5초 후 자동 재시작...
echo [%date% %time%] Bridge 종료 - 재시작 대기 >> telegram\bridge.log
timeout /t 5 /nobreak >nul
goto loop
