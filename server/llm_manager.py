from rag_engine import RAGEngine
import ollama
import re

class LLMManager:
    def __init__(self, model_name="llama3"):
        self.model_name = model_name
        self.system_prompt = (
            "You are the DungeonMaister, a highly knowledgeable, somewhat grumpy but endearing "
            "old wizard who serves as the Game Master for a game of D&D. You tell engaging stories "
            "and adapt perfectly to the dice rolls. Speak clearly, concisely, and stay in character. "
            "Keep your responses relatively brief (1-3 sentences) so the game keeps moving."
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
