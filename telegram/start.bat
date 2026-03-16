@echo off
chcp 65001 >nul
title Claude Bridge (Auto-Restart)
cd /d D:\Documents\Claudecode-telegram

echo ============================================
echo   Claude Telegram Bridge - Auto Restart
echo   Stop: Close this window or Ctrl+C
echo ============================================
echo.

:loop
echo [%date% %time%] Bridge starting...
echo [%date% %time%] Bridge start >> telegram\bridge.log
node telegram\bridge.js 2>> telegram\bridge.log
echo.
echo [%date% %time%] Bridge stopped. Restarting in 5 seconds...
echo [%date% %time%] Bridge stopped - waiting restart >> telegram\bridge.log
timeout /t 5 /nobreak >nul
goto loop
