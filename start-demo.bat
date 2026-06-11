@echo off
cd /d %~dp0

echo [1/3] Gerando build do frontend...
call npm run build
if errorlevel 1 exit /b %errorlevel%

echo [2/3] Abrindo a demo local...
start http://localhost:3333

echo [3/3] Iniciando o servidor offline...
call npm run start:api
