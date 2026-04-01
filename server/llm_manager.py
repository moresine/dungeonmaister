from rag_engine import RAGEngine
import ollama
import re


SYSTEM_PROMPTS = {
    "en": (
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
        "Never say things like 'I roll a 15' or 'You roll a 12'. Always say 'Roll your dice!' or similar. "
        "FORMATTING RULE: Your responses will be read aloud by a text-to-speech engine. "
        "NEVER use asterisks, markdown, bullet points, numbered lists, hashtags, or any special formatting. "
        "Write everything as plain spoken language. No *emphasis*, no **bold**, no _italics_, no emojis. "
        "Just natural speech as if you were talking out loud."
    ),
    "de": (
        "Du bist der DungeonMaister, ein weiser und uralter Zauberer, der schon Jahrhunderte gesehen hat. "
        "Du sprichst mit Wärme, dramatischem Flair und einem Hauch von Schelmerei. Deine Stimme trägt "
        "das Gewicht der Zeitalter — du verwendest altertümliche Ausdrücke wie 'Bei den Göttern!', "
        "'Fürwahr!', 'Meiner Treu!', 'Ach!', und 'So höret!'. Du kicherst und murmelst vor dich hin. "
        "Du bist liebenswert, theatralisch und zutiefst leidenschaftlich über das Abenteuer. "
        "Verwende Ausrufezeichen, rhetorische Fragen und dramatische Pausen (geschrieben als '...') "
        "um deine Sprache lebendig und fesselnd zu machen. Du erzählst lebhafte, immersive Geschichten. "
        "Halte deine Antworten relativ kurz (2-4 Sätze), damit das Spiel weitergeht. "
        "Du sprichst IMMER auf Deutsch. "
        "KRITISCHE REGEL: Du würfelst NIEMALS selbst, weder für dich noch für die Spieler. "
        "Wann immer eine Situation einen Würfelwurf erfordert, MUSST du die Spieler bitten zu würfeln "
        "und dir das Ergebnis zu sagen. Warte auf ihr Ergebnis bevor du den Ausgang beschreibst. "
        "Sage niemals Dinge wie 'Ich würfle eine 15' oder 'Du würfelst eine 12'. "
        "Sage immer 'Würfelt eure Würfel!' oder ähnlich. "
        "FORMATIERUNGSREGEL: Deine Antworten werden von einer Text-zu-Sprache-Engine vorgelesen. "
        "Verwende NIEMALS Sternchen, Markdown, Aufzählungszeichen, nummerierte Listen, Hashtags "
        "oder andere spezielle Formatierung. Schreibe alles als normales gesprochenes Deutsch. "
        "Kein *Hervorheben*, kein **Fett**, kein _Kursiv_, keine Emojis. "
        "Nur natürliche Sprache, als würdest du laut sprechen."
    ),
}


class LLMManager:
    def __init__(self, model_name="llama3", language="en"):
        self.model_name = model_name
        self.language = language
        self.system_prompt = SYSTEM_PROMPTS.get(language, SYSTEM_PROMPTS["en"])
        self.history = [
            {"role": "system", "content": self.system_prompt}
        ]
        self.rag = RAGEngine()

    def set_language(self, language: str):
        """Switch language and reset conversation history with new system prompt."""
        self.language = language
        self.system_prompt = SYSTEM_PROMPTS.get(language, SYSTEM_PROMPTS["en"])
        self.history = [
            {"role": "system", "content": self.system_prompt}
        ]

    def set_campaign_context(self, campaign_summary: str):
        """Inject campaign context into the system prompt."""
        campaign_intro = f"\n\nYou are running the following campaign. Use this as background context:\n{campaign_summary}"
        combined = self.system_prompt + campaign_intro
        self.history = [
            {"role": "system", "content": combined}
        ]

    @staticmethod
    def sanitize_for_tts(text: str) -> str:
        """Strip out any special characters that TTS can't handle well."""
        # Remove markdown-style formatting: *bold*, **bold**, _italic_, __italic__
        text = re.sub(r'[*_~`#]', '', text)
        # Remove emoji and other unicode symbols (keep basic latin, punctuation, accented chars, German umlauts)
        text = re.sub(r'[^\w\s.,!?;:\'\"()\-—…\n\u00c0-\u024f]', '', text)
        # Collapse multiple spaces
        text = re.sub(r'  +', ' ', text)
        return text.strip()

    async def generate_sentences(self, user_input: str):
        # Fetch relevant rules or adventure content via RAG vector search
        context = self.rag.retrieve_context(user_input)

        # Inject the context silently into the prompt
        rag_prompt = user_input
        if context:
            rag_prompt = f"Background Context/Rules:\n{context}\n\nPlayer says: {user_input}"

        self.history.append({"role": "user", "content": rag_prompt})

        try:
            response = ollama.chat(model=self.model_name, messages=self.history, stream=True)
            buffer = ""

            # Regex to split on sentence endings (. ! ?)
            sentence_end = re.compile(r'(?<=[.!?])\s+')

            full_response = ""
            for chunk in response:
                content = chunk['message']['content']
                buffer += content
                full_response += content

                if sentence_end.search(buffer):
                    parts = sentence_end.split(buffer, 1)
                    cleaned = self.sanitize_for_tts(parts[0].strip())
                    if cleaned:
                        yield cleaned
                    buffer = parts[1] if len(parts) > 1 else ""

            if buffer.strip():
                cleaned = self.sanitize_for_tts(buffer.strip())
                if cleaned:
                    yield cleaned

            self.history.append({"role": "assistant", "content": full_response})

        except Exception as e:
            print("Ollama Error:", e)
            if self.language == "de":
                yield "Ich scheine meinen Gedanken verloren zu haben. Stellt sicher, dass der Ollama-Dienst läuft."
            else:
                yield "I seem to have lost my train of thought. Ensure the Ollama service is running."
