# TorchForge (Windows): backend FastAPI en segundo plano + npm run dev (Vite + Electron)
$ErrorActionPreference = "Stop"
$Root = $PSScriptRoot
Set-Location $Root

$py = Join-Path $Root "venv\Scripts\python.exe"
if (-not (Test-Path $py)) {
    Write-Host "No se encontró venv\Scripts\python.exe. Crea el venv y ejecuta: pip install -r requirements.txt" -ForegroundColor Red
    Write-Host "Ver WINDOWS.md" -ForegroundColor Yellow
    exit 1
}

# Comprueba que uvicorn esté instalado en ESTE venv
$null = & $py -c "import uvicorn" 2>&1
if (-not $?) {
    Write-Host "Falta uvicorn (u otras dependencias) en el venv." -ForegroundColor Red
    Write-Host "Ejecuta:" -ForegroundColor Yellow
    Write-Host "  .\venv\Scripts\Activate.ps1" -ForegroundColor Cyan
    Write-Host "  pip install -r requirements.txt" -ForegroundColor Cyan
    exit 1
}

$env:PYTHONPATH = $Root
$env:NODE_ENV = "development"

# Mismo intérprete del venv, sin ventana nueva (evita cmd.exe y PATH incorrecto)
$uvArgs = @(
    "-m", "uvicorn", "backend.main:app",
    "--host", "127.0.0.1", "--port", "7433", "--reload"
)
$uvicornProc = Start-Process -FilePath $py -ArgumentList $uvArgs -WorkingDirectory $Root `
    -PassThru -WindowStyle Hidden

if (-not $uvicornProc) {
    Write-Host "No se pudo iniciar uvicorn." -ForegroundColor Red
    exit 1
}

Write-Host "Backend: http://127.0.0.1:7433 (proceso $($uvicornProc.Id))" -ForegroundColor Green
Start-Sleep -Seconds 2

try {
    npm run dev
}
finally {
    if ($uvicornProc -and -not $uvicornProc.HasExited) {
        Stop-Process -Id $uvicornProc.Id -Force -ErrorAction SilentlyContinue
        Write-Host "Uvicorn detenido." -ForegroundColor DarkGray
    }
}
