#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

echo "Creating Python venv in ./venv …"
python3.11 -m venv venv || python3 -m venv venv

# shellcheck disable=SC1091
source venv/bin/activate

python -m pip install --upgrade pip

echo "Installing PyTorch (CUDA 12.1 wheels) …"
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121

echo "Installing Python dependencies …"
pip install -r requirements.txt

echo "Installing Node dependencies …"
npm install

cat <<'EOF'

TorchForge setup complete.

Next steps:
1) Install and run Ollama (https://ollama.com) and pull a model, e.g.:
     ollama pull codellama:13b-instruct
   For GGUF via llama.cpp, install compilers then: pip install -r requirements-llamacpp.txt

2) Ensure NVIDIA drivers + CUDA are available and `nvidia-smi` works.

3) Launch:
     ./start.sh

EOF
