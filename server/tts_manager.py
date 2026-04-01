import os
import asyncio


class TTSManager:
    # Map language codes to their Piper voice models and tuning params
    VOICE_CONFIGS = {
        "en": {
            "model": "en_GB-alan-medium.onnx",
            "length_scale": 1.0,
            "noise_scale": 0.667,
            "noise_w": 0.8,
            "sentence_silence": 0.2,
        },
        "de": {
            "model": "de_DE-thorsten-high.onnx",
            "length_scale": 1.0,
            "noise_scale": 0.667,
            "noise_w": 0.8,
            "sentence_silence": 0.2,
        },
    }

    def __init__(self, language: str = "en"):
        self.language = language

    def set_language(self, language: str):
        if language in self.VOICE_CONFIGS:
            self.language = language

    async def synthesize_audio_stream(self, text: str) -> bytes:
        config = self.VOICE_CONFIGS.get(self.language, self.VOICE_CONFIGS["en"])
        model_path = config["model"]

        if not os.path.exists(model_path):
            print(f"Warning: Model {model_path} not found.")
            return b""

        # Escape single quotes in text for bash
        safe_text = text.replace("'", "'\\''")

        piper_cmd = (
            f"echo '{safe_text}' | ./venv/bin/piper --model {model_path} --output_file - "
            f"--length-scale {config['length_scale']} "
            f"--noise-scale {config['noise_scale']} "
            f"--noise-w {config['noise_w']} "
            f"--sentence-silence {config['sentence_silence']}"
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
