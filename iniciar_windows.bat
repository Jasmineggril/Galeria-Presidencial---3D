@echo off
cd /d "%~dp0"
echo Galeria Presidencial - abra http://localhost:8000 no navegador.
echo Para encerrar, pressione Ctrl+C.
where py >nul 2>nul
if %errorlevel% equ 0 (
  py -m http.server 8000 --directory dist
) else (
  python -m http.server 8000 --directory dist
)
pause
