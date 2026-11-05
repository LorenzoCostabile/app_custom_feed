@echo off
setlocal
cd /d "%~dp0"
title Asistente de cookie de YouTube - Atencion

set "PY="

if exist ".venv\Scripts\python.exe" (
  ".venv\Scripts\python.exe" -c "import sys" >nul 2>nul
  if not errorlevel 1 set "PY=.venv\Scripts\python.exe"
)

if not defined PY (
  py -3 -c "import sys" >nul 2>nul
  if not errorlevel 1 set "PY=py -3"
)

if not defined PY (
  python -c "import sys" >nul 2>nul
  if not errorlevel 1 set "PY=python"
)

if not defined PY (
  echo.
  echo No se ha encontrado Python 3 en este equipo.
  echo.
  echo Instalalo desde https://www.python.org/downloads/windows/
  echo y marca "Add python.exe to PATH" durante la instalacion.
  echo.
  pause
  exit /b 1
)

echo Iniciando el asistente. Si el navegador no se abre solo,
echo copia la direccion que aparece en esta ventana.
echo.

%PY% wizard.py

if errorlevel 1 (
  echo.
  echo El asistente se cerro con un error. Revisa el mensaje de arriba.
  pause
)
