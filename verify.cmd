@echo off
setlocal
cd /d "%~dp0"
node tools\verify.mjs
if errorlevel 1 exit /b 1
node tools\build.mjs