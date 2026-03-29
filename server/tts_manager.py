import os
import io
import wave
import asyncio

class TTSManager:
    def __init__(self):
        self.model = None
        self.is_ready = False
        
    def _init_model(self):
        try:
            from piper import PiperVoice
            print("Loading Piper TTS Model...")
            model_path = "en_GB-alan-medium.onnx"
            if not os.path.exists(model_path):
                print(f"Warning: Piper model {model_path} not found!")
                return
                
            self.model = PiperVoice.load(model_path)
            self.is_ready = True
            print("Piper TTS Loaded Successfully!")
        except ImportError:
            print("piper-tts package not installed. Skipping initialization.")

    async def _lazy_init(self):
        if self.is_ready: return
        await asyncio.to_thread(self._init_model)

    async def synthesize_audio_stream(self, text: str) -> bytes:
        import asyncio
        import os
        import subprocess
        
        model_path = "en_GB-alan-medium.onnx"
        if not os.path.exists(model_path):
            print(f"Warning: Model {model_path} not found.")
            return b""
            
        # Escape single quotes in text for bash
        safe_text = text.replace("'", "'\\''")
        piper_cmd = f"echo '{safe_text}' | ./venv/bin/piper --model {model_path} --output_file -"
        
        proc = await asyncio.create_subprocess_shell(
            piper_cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        stdout, stderr = await proc.communicate()
        
        if proc.returncode != 0:
            print(f"Piper CLI error: {stderr.decode()}")
            return b""
            
        return stdout
