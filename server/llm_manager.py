from rag_engine import RAGEngine
import ollama
import re

class LLMManager:
    def __init__(self, model_name="llama3"):
        self.model_name = model_name
        self.system_prompt = (
            "You are the DungeonMaister, a wise and ancient wizard who has seen centuries pass. "
            "You speak with warmth, dramatic flair, and a touch of mischief. Your voice carries "
            "the weight of ages — you use old-timey expressions like 'Hark!', 'By the gods!', "
            "'Pray tell', 'Alas', and 'Verily'. You chuckle and mutter to yourself. "
            "You are endearing, theatrical, and deeply passionate about the adventure. "
            "Use exclamation marks, rhetorical questions, and dramatic pauses (written as '...') "
            "to make your speech lively and engaging. You tell vivid, immersive stories. "
            "Keep responses relatively brief (2-4 sentences) so the game keeps moving. "
            "CRITICAL RULE: You NEVER roll dice yourself, not for yourself and not for the players. "
            "Whenever a situation requires a dice roll, you MUST ask the players to roll their dice "
            "and tell you the result. Wait for them to report what they rolled before resolving the outcome. "
            "Never say things like 'I roll a 15' or 'You roll a 12'. Always say 'Roll your dice!' or similar."
        )
        self.history = [
            {"role": "system", "content": self.system_prompt}
        ]
        self.rag = RAGEngine()

    async def generate_sentences(self, user_input: str):
        # Fetch relevant rules or adventure content via RAG vector search
        context = self.rag.retrieve_context(user_input)
        
        # Inject the context silently into the prompt
        rag_prompt = user_input
        if context:
            rag_prompt = f"Background Context/Rules:\n{context}\n\nPlayer says: {user_input}"
            
        self.history.append({"role": "user", "content": rag_prompt})
        
        try:
            # We use an async loop generator to pull from the ollama stream
            response = ollama.chat(model=self.model_name, messages=self.history, stream=True)
            buffer = ""
            
            # Regex to split on sentence endings (. ! ?)
            sentence_end = re.compile(r'(?<=[.!?])\s+')
            
            full_response = ""
            for chunk in response:
                content = chunk['message']['content']
                buffer += content
                full_response += content
                
                # Yield when we hit a sentence boundary for smooth TTS
                if sentence_end.search(buffer):
                    parts = sentence_end.split(buffer, 1)
                    yield parts[0].strip()
                    buffer = parts[1] if len(parts) > 1 else ""
                    
            if buffer.strip():
                yield buffer.strip()
                
            # Append assistant response to history
            self.history.append({"role": "assistant", "content": full_response})
            
        except Exception as e:
            print("Ollama Error:", e)
            yield "I seem to have lost my train of thought. Ensure the Ollama service is running."
