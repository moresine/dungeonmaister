#!/bin/bash

# Ensure Ollama is installed
if ! command -v ollama &> /dev/null
then
    echo "Ollama is not installed. Installing..."
    curl -fsSL https://ollama.com/install.sh | sh
fi

echo "Pulling llama3 logic model..."
ollama pull llama3

echo "Starting Ollama server in background..."
nohup ollama serve > ollama.log 2>&1 &

echo "Starting FastAPI DungeonMaister Backend..."
source venv/bin/activate
python3 main.py
