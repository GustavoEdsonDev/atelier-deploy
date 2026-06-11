@echo off
cd /d %~dp0

echo [1/2] Gerando build do Next.js...
call npm run build
if errorlevel 1 exit /b %errorlevel%

echo [2/2] Abrindo a demo local...
start http://localhost:3000
call npm run start
