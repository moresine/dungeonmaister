import os
import asyncio
import base64
from google import genai
from google.genai import types


class TTSManager:
    # Map language codes to their Piper voice models
    VOICE_CONFIGS = {
        "en": {
            "model": "en_GB-alan-medium.onnx",
        },
        "de": {
            "model": "de_DE-thorsten-high.onnx",
        },
    }

    def __init__(self, language: str = "en", provider: str = "piper", api_key: str = ""):
        self.language = language
        self.provider = provider
        self.api_key = api_key
        self.gemini_voice = "Aoede" if language == "en" else "Kore"

    def set_language(self, language: str):
        if language in self.VOICE_CONFIGS:
            self.language = language
            self.gemini_voice = "Aoede" if language == "en" else "Kore"

    def set_provider(self, provider: str, api_key: str):
        self.provider = provider
        self.api_key = api_key

    async def synthesize_audio_stream(self, text: str, emotion: str = "normal") -> bytes:
        if self.provider == "gemini":
            try:
                client = genai.Client(api_key=self.api_key)
                # Using run_in_executor to ensure synchronous network requests don't block asyncio event loop
                response = await asyncio.to_thread(
                    client.models.generate_content,
                    model='gemini-2.5-flash',
                    contents=f'Read this aloud exactly as written: {text}',
                    config=types.GenerateContentConfig(
                        response_modalities=["AUDIO"],
                        speech_config=types.SpeechConfig(
                            voice_config=types.VoiceConfig(
                                prebuilt_voice_config=types.PrebuiltVoiceConfig(
                                     voice_name=self.gemini_voice
                                )
                            )
                        )
                    )
                )
                if response.candidates and response.candidates[0].content.parts:
                    for part in response.candidates[0].content.parts:
                        if hasattr(part, 'inline_data') and part.inline_data and part.inline_data.data:
                             data = part.inline_data.data
                             if isinstance(data, str):
                                 return base64.b64decode(data)
                             return data
                return b""
            except Exception as e:
                print("Gemini TTS Error:", e)
                return b""

        config = self.VOICE_CONFIGS.get(self.language, self.VOICE_CONFIGS["en"])
        model_path = config["model"]

        if not os.path.exists(model_path):
            print(f"Warning: Model {model_path} not found.")
            return b""

        # Escape single quotes in text for bash
        safe_text = text.replace("'", "'\\''")

        piper_cmd = (
            f"echo '{safe_text}' | ./venv/bin/piper --model {model_path} --output_file -"
        )

        proc = await asyncio.create_subprocess_shell(
            piper_cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await proc.communicate()

        if proc.returncode != 0:
            print(f"Piper CLI error: {stderr.decode()}")
            return b""

        return stdout
