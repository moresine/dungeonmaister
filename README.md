# 🧙‍♂️ DungeonMaister

**A fully local, AI-powered Dungeons & Dragons Game Master with real-time voice interaction.**

DungeonMaister is a self-hosted AI dungeon master that runs entirely on your machine — no cloud APIs, no subscriptions, no data leaving your network. Talk to it with your voice, type in the chat, roll dice, and get narrated responses with text-to-speech, all in real time.

## ✨ Features

- **AI Game Master** — Powered by [Ollama](https://ollama.com/) (Llama 3) with a custom D&D persona that stays in character, adapts to dice rolls, and tells engaging stories
- **Voice Interaction** — Speak to the DM through your microphone using browser-based speech-to-text (Opus recording), and hear responses narrated back via Piper TTS
- **Real-time Streaming** — WebSocket-based pipeline that streams LLM responses sentence-by-sentence, with TTS audio generated and played as each sentence arrives
- **RAG Knowledge Base** — Ingest D&D rulebooks, adventure modules, or homebrew content (PDF/TXT) into a ChromaDB vector store for context-aware responses
- **Dice Roller** — Built-in animated dice roller that feeds results directly into the AI's narrative
- **Character Creation** — Create and manage D&D characters with a persistent local database (Dexie/IndexedDB)
- **100% Local** — Everything runs on your hardware. No OpenAI, no cloud dependencies

## 🏗️ Architecture

```
┌─────────────────────────────┐     WebSocket      ┌──────────────────────────────┐
│      React Frontend         │◄──────────────────►│      FastAPI Backend          │
│  (Vite + TypeScript)        │   text + audio      │      (Python)                │
│                             │                     │                              │
│  • Game Master Chat UI      │                     │  • LLM Manager (Ollama)      │
│  • Voice Recording (Opus)   │                     │  • TTS Manager (Piper)       │
│  • Dice Roller              │                     │  • RAG Engine (ChromaDB)     │
│  • Character Hub (Dexie)    │                     │                              │
└─────────────────────────────┘                     └──────────────────────────────┘
```

## 🚀 Getting Started

### Prerequisites

- **Python 3.12+**
- **Node.js 18+** and npm
- **[Ollama](https://ollama.com/)** installed and running with a model pulled (e.g. `ollama pull llama3`)

### Backend Setup

```bash
# Create and activate a Python virtual environment
cd server
python3 -m venv venv
source venv/bin/activate   # On Windows: .\venv\Scripts\activate

# Install Python dependencies
pip install fastapi uvicorn ollama piper-tts langchain-community chromadb sentence-transformers

# Download the Piper TTS voice model
# Place en_GB-alan-medium.onnx and en_GB-alan-medium.onnx.json in the server/ directory
# Models: https://github.com/rhasspy/piper/blob/master/VOICES.md

# Start the backend
./start_backend.sh
```

The backend server will start on `http://localhost:8001`.

### Frontend Setup

```bash
# From the project root
npm install
npm run dev
```

The frontend will start on `https://localhost:5173` (with self-signed SSL for microphone access).

### Usage

1. Open the frontend in your browser
2. Click **Start Tutorial** to enter the game master interface
3. **Type** a message or click the **microphone button** to speak
4. Roll dice using the built-in dice roller — results are sent to the AI automatically
5. The DungeonMaister will respond with text and voice narration

## 📁 Project Structure

```
dungeonmaister/
├── src/                          # React frontend
│   ├── components/ui/
│   │   ├── GameMasterInterface.tsx  # Main chat + voice UI
│   │   ├── DiceRoller.tsx           # Animated dice roller
│   │   ├── CharacterCreator.tsx     # D&D character creation
│   │   └── CharacterHub.tsx         # Character management
│   ├── services/
│   │   ├── AiDungeonMaster.ts       # Offline fallback DM
│   │   ├── SpeechClient.ts          # WebSocket + audio client
│   │   └── PersonaPlexClient.ts     # Service client
│   └── db/db.ts                     # Dexie IndexedDB schema
├── server/                       # Python backend
│   ├── main.py                      # FastAPI WebSocket server
│   ├── llm_manager.py              # Ollama LLM with streaming
│   ├── tts_manager.py              # Piper TTS synthesis
│   ├── rag_engine.py               # ChromaDB RAG pipeline
│   └── start_backend.sh            # Backend startup script
├── public/                       # Static assets (Opus workers)
└── package.json
```

## 🛠️ Tech Stack

| Layer     | Technology                                      |
|-----------|--------------------------------------------------|
| Frontend  | React 19, TypeScript, Vite, React Router, Dexie |
| Backend   | Python, FastAPI, WebSockets, Uvicorn             |
| LLM       | Ollama (Llama 3)                                 |
| TTS       | Piper TTS (ONNX, en_GB-alan-medium voice)        |
| RAG       | LangChain, ChromaDB, HuggingFace Embeddings      |
| Audio     | Opus Recorder (browser), Web Audio API            |

## 📄 License

This project is for personal/educational use.
