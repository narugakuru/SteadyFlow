@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Starting InvestManage...
node.exe server.js
pause
