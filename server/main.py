import asyncio
import logging
from typing import List, Optional
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Initialize logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from llm_manager import LLMManager
from tts_manager import TTSManager

app = FastAPI(title="DungeonMaister Backend")

# Allow requests from the React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

llm = LLMManager()
tts = TTSManager()

class ChatRequest(BaseModel):
    text: str
    dice_roll: Optional[int] = None

@app.on_event("startup")
async def startup_event():
    logger.info("Initializing models on startup...")
    # Optional: prewarm models here
    pass

@app.websocket("/api/chat/stream")
async def chat_endpoint(websocket: WebSocket):
    await websocket.accept()
    logger.info("Frontend connected to /api/chat/stream websocket.")
    try:
        while True:
            # Receive STT string from frontend
            data = await websocket.receive_json()
            user_text = data.get("text", "")
            dice_roll = data.get("dice_roll")
            
            if not user_text:
                continue
                
            logger.info(f"User: {user_text} | Roll: {dice_roll}")
            context = f"User says: {user_text}"
            if dice_roll is not None:
                context += f" | They rolled a {dice_roll}."

            sentence_queue = asyncio.Queue()
            
            async def producer():
                # Stream sentences into the queue instantly as Ollama finishes them
                async for sentence in llm.generate_sentences(context):
                    if not sentence.strip():
                        continue
                    # Send text transcript immediately to UI
                    await websocket.send_json({"type": "transcript", "speaker": "dm", "content": sentence})
                    await sentence_queue.put(sentence)
                # Signal end of stream
                await sentence_queue.put(None)
                
            async def consumer():
                # Continuously render TTS in the background as fast as sentences arrive
                while True:
                    sentence = await sentence_queue.get()
                    if sentence is None:
                        break
                    audio_bytes = await tts.synthesize_audio_stream(sentence)
                    if audio_bytes:
                        await websocket.send_bytes(audio_bytes)
            
            # Unleash both workers concurrently
            await asyncio.gather(producer(), consumer())
            
            # Signal end of turn
            await websocket.send_json({"type": "turn_complete"})

    except WebSocketDisconnect:
        logger.info("Frontend disconnected.")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
