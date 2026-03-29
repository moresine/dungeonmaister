#!/bin/bash

# DungeonMaister - PersonaPlex Server Installer (WSL/Linux)

set -e

# Default directory for Linux native performance (better than /mnt/c/ for I/O speed)
PERSONAPLEX_DIR="$HOME/personaplex"

echo "==============================================="
echo " DungeonMaister - PersonaPlex Server Installer "
echo "==============================================="

if [ -z "$1" ]; then
    echo "Error: Please provide your Hugging Face API Token (must have Read permissions)."
    echo "Usage: ./setup_personaplex_wsl.sh <HF_TOKEN>"
    exit 1
fi

export HF_TOKEN=$1

# 1. System Dependencies (Assuming Ubuntu/Debian on WSL)
echo -e "\n[1/4] Checking system dependencies..."
if ! command -v python3 &> /dev/null || ! command -v gcc &> /dev/null; then
    echo "Dependencies missing! Please run: sudo apt update && sudo apt install -y python3 python3-venv build-essential"
    exit 1
fi

# 2. Clone the repository
if [ ! -d "$PERSONAPLEX_DIR" ]; then
    echo -e "\n[2/4] Cloning NVIDIA PersonaPlex repository to $PERSONAPLEX_DIR..."
    git clone https://github.com/NVIDIA/personaplex.git "$PERSONAPLEX_DIR"
else
    echo -e "\n[2/4] Repository already exists at $PERSONAPLEX_DIR"
fi

cd "$PERSONAPLEX_DIR"

# 3. Create Virtual Environment
echo -e "\n[3/4] Setting up Python virtual environment..."
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi
source venv/bin/activate

# 4. Install Moshi / PersonaPlex Requirements
echo -e "\n[4/4] Installing dependencies from source (this might take a few minutes)..."
python3 -m pip install --upgrade pip
pip install moshi/

echo -e "\n==============================================="
echo " Installation Complete! "
echo "==============================================="
echo "To launch the PersonaPlex server, run the following commands in a new WSL terminal:"
echo "  export HF_TOKEN=\"$HF_TOKEN\""
echo "  cd $PERSONAPLEX_DIR"
echo "  source venv/bin/activate"
echo "  python3 -m moshi.server --host 127.0.0.1 --port 8998"
echo -e "\nNote: The first time you run this, it will download ~20GB of model weights."
