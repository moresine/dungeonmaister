import asyncio
import logging
from typing import Optional
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel

# Initialize logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from llm_manager import LLMManager
from tts_manager import TTSManager
from campaign_manager import CampaignManager

app = FastAPI(title="DungeonMaister Backend")

# Allow requests from the React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

campaign_mgr = CampaignManager()


# ─── Campaign REST Endpoints ───────────────────────────────────────────

@app.get("/api/campaigns")
async def list_campaigns():
    """Return all available campaigns."""
    campaigns = campaign_mgr.list_campaigns()
    # Strip internal _dir field before sending to frontend
    safe = []
    for c in campaigns:
        entry = {k: v for k, v in c.items() if not k.startswith("_")}
        safe.append(entry)
    return safe


@app.get("/api/campaigns/{campaign_id}/cover")
async def get_campaign_cover(campaign_id: str):
    """Serve the cover image for a campaign."""
    path = campaign_mgr.get_cover_image_path(campaign_id)
    if path:
        return FileResponse(path)
    return JSONResponse({"error": "Cover not found"}, status_code=404)


# ─── WebSocket Chat Endpoint ───────────────────────────────────────────

@app.websocket("/api/chat/stream")
async def chat_endpoint(
    websocket: WebSocket,
    lang: str = Query(default="en"),
    campaign: str = Query(default=""),
):
    await websocket.accept()
    logger.info(f"Frontend connected. lang={lang}, campaign={campaign}")

    # Create per-session LLM and TTS with the requested language
    llm = LLMManager(language=lang)
    tts = TTSManager(language=lang)

    # If a campaign is selected, load its context
    if campaign:
        # Set up per-campaign RAG collection
        llm.rag.set_campaign(campaign)

        # Ingest campaign content if not already done
        if not llm.rag.is_collection_populated():
            content = campaign_mgr.get_campaign_content(campaign)
            if content:
                logger.info(f"Ingesting campaign '{campaign}' into RAG...")
                llm.rag.ingest_text(content, source=campaign)

        # Inject campaign summary into system prompt
        summary = campaign_mgr.get_campaign_summary(campaign)
        if summary:
            llm.set_campaign_context(summary)
            logger.info(f"Campaign context loaded for '{campaign}'")

    try:
        while True:
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
                async for sentence in llm.generate_sentences(context):
                    if not sentence.strip():
                        continue
                    await websocket.send_json({
                        "type": "transcript",
                        "speaker": "dm",
                        "content": sentence,
                    })
                    await sentence_queue.put(sentence)
                await sentence_queue.put(None)

            async def consumer():
                while True:
                    sentence = await sentence_queue.get()
                    if sentence is None:
                        break
                    audio_bytes = await tts.synthesize_audio_stream(sentence)
                    if audio_bytes:
                        await websocket.send_bytes(audio_bytes)

            await asyncio.gather(producer(), consumer())
            await websocket.send_json({"type": "turn_complete"})

    except WebSocketDisconnect:
        logger.info("Frontend disconnected.")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
