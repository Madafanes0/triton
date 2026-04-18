# TorchForge en Windows (GPU NVIDIA)

## Requisitos

- **Windows 10/11**
- **Python 3.11+** ([python.org](https://www.python.org/downloads/) o `winget install Python.Python.3.11`)
- **Node.js 18+** ([nodejs.org](https://nodejs.org/) o `winget install OpenJS.NodeJS.LTS`)
- **Git** (opcional, para clonar)
- **GPU NVIDIA** con drivers actualizados; comprobar en PowerShell: `nvidia-smi`
- Opcional: **Ollama** para el agente ([ollama.com](https://ollama.com))

## 1) Clonar e ir a la carpeta

```powershell
cd C:\ruta\a\torchforge
```

(El repo debe ser la carpeta que contiene `package.json`, `backend\`, etc.)

## 2) Entorno Python (venv)

En **PowerShell** (o **cmd**):

```powershell
py -3.11 -m venv venv
# si py no existe:
# python -m venv venv

.\venv\Scripts\Activate.ps1
```

Si PowerShell bloquea scripts:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

## 3) Instalar PyTorch (CUDA 12.1) y dependencias

Con el venv activado:

```powershell
python -m pip install --upgrade pip
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
pip install -r requirements.txt
```

**Sobre `triton` y el error “No matching distribution”:** no tiene que ver con uvicorn. **Triton** en PyPI solo trae ruedas oficiales para **Linux**; en **Windows** `pip` no encuentra `triton` y antes fallaba **todo** el `install -r`. El `requirements.txt` del repo marca `triton` solo para Linux, así que en Windows el resto (FastAPI, uvicorn, etc.) **sí** se instala.

Para **ejecutar** kernels Triton en `project/main.py` en Windows necesitas un entorno **Linux** (p. ej. **WSL2** con CUDA) o seguir la guía actual de PyTorch para tu sistema; la IDE **sí puede abrirse y usar el backend** sin Triton instalado en el venv de Windows.

### `llama-cpp-python` (error CMake / nmake / compiler)

Ese paquete **no** va en `requirements.txt` por defecto: en Windows suele **compilarse** y exige **Visual Studio Build Tools** (carga de trabajo “Desarrollo de escritorio con C++”), **CMake** y a veces pasos extra.

- Si usas el agente con **Ollama** (recomendado en Windows), **no instales** `llama-cpp-python`.
- Solo si quieres **llama.cpp + GGUF** en TorchForge: instala las herramientas de compilación y luego `pip install -r requirements-llamacpp.txt`.

**Si ves `No module named uvicorn`:** ejecuta `pip install -r requirements.txt` de nuevo (o `pip install "uvicorn[standard]" fastapi pydantic watchdog`).

Comprueba:

```powershell
.\venv\Scripts\python.exe -c "import uvicorn; print('ok')"
```

## 4) Node

```powershell
npm install
```

## 5) Arrancar la aplicación

**Opción A — PowerShell (recomendado en Windows)**

Desde la raíz del proyecto, con venv **activado**:

```powershell
$env:PYTHONPATH = (Get-Location).Path
Start-Process python -ArgumentList "-m","uvicorn","backend.main:app","--host","127.0.0.1","--port","7433","--reload" -WindowStyle Normal
```

Abre **otra** ventana de PowerShell en la misma carpeta:

```powershell
$env:NODE_ENV = "development"
npm run dev
```

Debe abrirse la ventana de **Electron**. La UI sale de Vite (`http://127.0.0.1:5173`).

**Opción B — Script incluido**

```powershell
.\start.ps1
```

Arranca **uvicorn** en segundo plano (sin ventana extra) y luego **Vite + Electron**. Cierra con **Ctrl+C** (también detiene uvicorn).

Si aparece error de política de ejecución: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` o `powershell -ExecutionPolicy Bypass -File .\start.ps1`.

**Opción C — Git Bash** (si instalaste Git for Windows)

```bash
./start.sh
```

## 6) Probar ejecución GPU

Con el backend en marcha, en el IDE usa **Run** sobre `project/main.py` o prueba en el navegador / otra terminal:

```powershell
Invoke-RestMethod http://127.0.0.1:7433/gpu/status
```

`cuda_available` debería ser `true` si PyTorch ve la GPU.

## Problemas frecuentes

| Síntoma | Qué hacer |
|--------|-----------|
| `python` no encontrado | Usa `py -3.11` o instala Python y marca “Add to PATH”. |
| Ventana Electron vacía | Asegúrate de que `npm run dev` está corriendo (Vite en 5173). |
| CUDA no disponible | Reinstala drivers NVIDIA; instala el wheel `cu121` de PyTorch que coincida con tu CUDA. |
| Puerto 7433 ocupado | Cierra otras instancias de uvicorn o cambia el puerto en el comando. |
