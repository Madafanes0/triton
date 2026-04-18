# TorchForge: abre backend en otra ventana y ejecuta Vite + Electron en esta.
$ErrorActionPreference = "Stop"
$Root = $PSScriptRoot
Set-Location $Root

if (-not (Test-Path "venv\Scripts\Activate.ps1")) {
    Write-Host "No se encontró venv. Sigue WINDOWS.md para crear el entorno." -ForegroundColor Red
    exit 1
}

$activate = Join-Path $Root "venv\Scripts\Activate.ps1"
$uvicornCmd = "& '$activate'; `$env:PYTHONPATH='$Root'; python -m uvicorn backend.main:app --host 127.0.0.1 --port 7433 --reload"

Start-Process powershell -WorkingDirectory $Root -ArgumentList "-NoExit", "-Command", $uvicornCmd
Start-Sleep -Seconds 2

& $activate
$env:PYTHONPATH = $Root
$env:NODE_ENV = "development"
npm run dev
