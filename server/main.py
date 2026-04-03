import asyncio
import logging
import re
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
from character_manager import character_mgr
from typing import Any, Dict

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

# Regex to detect [ROLL:dX] and [EMOTION:X] tags in LLM output
# Loose regexes to catch AI drift where it forgets brackets (e.g., 'Roll: d20' instead of '[ROLL:d20]')
ROLL_TAG_RE = re.compile(r'[\[\(]?\s*ROLL\s*[:]\s*(d\d+)\s*[\]\)]?', re.IGNORECASE)
EMOTION_TAG_RE = re.compile(
    r'[\[\(]?\s*EMOTION\s*[:]\s*(calm|normal|dramatic|intense)\s*[\]\)]?',
    re.IGNORECASE
)
TARGET_TAG_RE = re.compile(r'[\[\(]?\s*TARGET\s*[:]\s*([a-zA-Z0-9_\-\s]+?)(?:[\]\)]|$)', re.IGNORECASE)


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
    path = campaign_mgr.get_campaign_cover_image_path(campaign_id) if hasattr(campaign_mgr, "get_campaign_cover_image_path") else campaign_mgr.get_cover_image_path(campaign_id)
    if path:
        return FileResponse(path)
    return JSONResponse({"error": "Cover not found"}, status_code=404)


# ─── Character REST Endpoints ───────────────────────────────────────────

@app.get("/api/characters")
async def get_characters():
    chars = character_mgr.get_all_characters()
    return chars

@app.post("/api/characters")
async def create_character(char_data: Dict[str, Any]):
    try:
        new_char = character_mgr.create_character(char_data)
        return new_char
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=400)

@app.delete("/api/characters/{char_id}")
async def delete_character(char_id: int):
    success = character_mgr.delete_character(char_id)
    if success:
        return {"status": "ok"}
    return JSONResponse({"error": "Character not found"}, status_code=404)

@app.put("/api/characters/{char_id}")
async def update_character(char_id: int, char_data: Dict[str, Any]):
    success = character_mgr.update_character(char_id, char_data)
    if success:
        return {"status": "ok"}
    return JSONResponse({"error": "Character not found"}, status_code=404)


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
        llm.rag.set_campaign(campaign)
        if not llm.rag.is_collection_populated():
            content = campaign_mgr.get_campaign_content(campaign)
            if content:
                logger.info(f"Ingesting campaign '{campaign}' into RAG...")
                llm.rag.ingest_text(content, source=campaign)

        summary = campaign_mgr.get_campaign_summary(campaign)
        if summary:
            llm.set_campaign_context(summary)
            logger.info(f"Campaign context loaded for '{campaign}'")

    try:
        while True:
            data = await websocket.receive_json()
            user_text = data.get("text", "")
            dice_roll = data.get("dice_roll")
            party_info = data.get("party")
            speaker = data.get("speaker", "Player")

            if party_info:
                llm.set_party_context(party_info)
                logger.info(f"Party context loaded with {len(party_info)} characters.")

            if "llm_provider" in data:
                llm.set_provider(
                    provider=data.get("llm_provider"), 
                    api_key=data.get("api_key", ""),
                    model_name=data.get("model_name")
                )
                
            if "tts_provider" in data:
                tts.set_provider(
                    provider=data.get("tts_provider"),
                    api_key=data.get("api_key", "")
                )

            if not user_text:
                continue

            logger.info(f"[{speaker}]: {user_text} | Roll: {dice_roll} | Provider: {llm.provider}")
            context = f"{speaker} says: {user_text}"
            if dice_roll is not None:
                context += f" | They rolled a {dice_roll}."

            sentence_queue = asyncio.Queue()

            async def producer():
                async for sentence in llm.generate_sentences(context):
                    if not sentence.strip():
                        continue

                    # Emulate emotion tag formatting
                    emotion = "normal"
                    emotion_match = EMOTION_TAG_RE.search(sentence)
                    if emotion_match:
                        emotion = emotion_match.group(1).lower()
                        sentence = EMOTION_TAG_RE.sub('', sentence).strip()

                    # Emulate dice tag formatting
                    die_type = None
                    roll_match = ROLL_TAG_RE.search(sentence)
                    if roll_match:
                        die_type = roll_match.group(1).lower()
                        sentence = ROLL_TAG_RE.sub('', sentence).strip()

                    # Process target tags
                    target = None
                    target_match = TARGET_TAG_RE.search(sentence)
                    if target_match:
                        target = target_match.group(1).strip()
                        sentence = TARGET_TAG_RE.sub('', sentence).strip()

                    if not sentence.strip():
                         continue

                    await websocket.send_json({
                        "type": "transcript",
                        "speaker": "dm",
                        "content": sentence,
                    })

                    if target:
                        await websocket.send_json({
                            "type": "target",
                            "target": target,
                        })
                        logger.info(f"Targeting: {target}")

                    await sentence_queue.put((sentence, emotion))

                    if die_type:
                        await websocket.send_json({
                            "type": "dice_request",
                            "die": die_type,
                        })
                        logger.info(f"Dice request sent: {die_type}")

                await sentence_queue.put(None)

            async def consumer():
                while True:
                    item = await sentence_queue.get()
                    if item is None:
                        break
                    sentence, emotion = item
                    audio_bytes = await tts.synthesize_audio_stream(sentence, emotion=emotion)
                    if audio_bytes:
                        await websocket.send_bytes(audio_bytes)

            await asyncio.gather(producer(), consumer())
            await websocket.send_json({"type": "turn_complete"})

    except WebSocketDisconnect:
        logger.info("Frontend disconnected.")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)

