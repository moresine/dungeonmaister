from rag_engine import RAGEngine
import ollama
from google import genai
from google.genai import types
import re


SYSTEM_PROMPTS = {
    "en": (
        "You are the DungeonMaister, a wise and ancient wizard who has seen centuries pass. "
        "You are a Dungeon Master for a Dungeons & Dragons 5th Edition game. Your primary goal is to create a fun and engaging experience for the players, while adhering to the rules of the game. You should be familiar with the Player's Handbook, the Dungeon Master's Guide, and the Monster Manual. You should use the rules for skill checks, saving throws, and combat as described in the 5th edition rules."
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
        "DICE TAG RULE: When you ask a player to roll dice, you MUST append a dice tag at the very end "
        "of the sentence in the format [ROLL:dX], where X is the die type. The standard dice are: "
        "d4, d6, d8, d10, d12, d20, and d100. Choose the correct die for the situation — for example: "
        "d20 for ability checks, attack rolls, and saving throws; d6 or d8 for weapon damage; "
        "d4 for small effects; d10 or d12 for heavy weapons; d100 for percentile rolls. "
        "You MUST integrate the request into your natural spoken sentence first, AND THEN append the tag at the end. "
        "Examples: 'Roll for initiative, adventurer! [ROLL:d20]' or "
        "'Now roll for damage! [ROLL:d8]'. Always include exactly one tag per roll request. "
        "EMOTION TAG RULE: You MUST tag every sentence you speak with an emotion intensity tag "
        "at the very end, in the format [EMOTION:X], where X is one of: calm, normal, dramatic, intense. "
        "Choose the right emotion for the moment: "
        "calm for narration, backstory, quiet descriptions, and exposition; "
        "normal for regular conversation and standard descriptions; "
        "dramatic for exciting reveals, plot twists, combat encounters starting, and tense moments; "
        "intense for battle cries, critical hits, life-or-death situations, and climactic moments. "
        "Examples: 'The tavern is warm and the fire crackles softly... [EMOTION:calm]' or "
        "'A dragon bursts through the castle wall! [EMOTION:intense]'. "
        "Always include exactly one emotion tag per sentence. If a sentence also has a dice tag, "
        "put the emotion tag first: 'Roll for your life, adventurer! [EMOTION:intense] [ROLL:d20]'. "
        "TARGET TAG RULE: You MUST append a target tag at the very end of the sentence to specify who you are speaking to, "
        "in the format [TARGET:X], where X is either a specific character name, or 'Group' if addressing everyone. "
        "Example: 'What say you to this, Thorian? [TARGET:Thorian]' or 'Brace yourselves, heroes! [TARGET:Group]'. "
        "Always include exactly one target tag per sentence. Place it after the emotion and roll tags. "
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
        "WÜRFEL-TAG REGEL: Wenn du einen Spieler bittest zu würfeln, MUSST du am Ende des Satzes "
        "einen Würfel-Tag im Format [ROLL:dX] anhängen, wobei X der Würfeltyp ist. Die Standardwürfel sind: "
        "d4, d6, d8, d10, d12, d20 und d100. Wähle den richtigen Würfel für die Situation — zum Beispiel: "
        "d20 für Fähigkeitsproben, Angriffswürfe und Rettungswürfe; d6 oder d8 für Waffenschaden; "
        "d4 für kleine Effekte; d10 oder d12 für schwere Waffen; d100 für Prozentwürfe. "
        "Du MUSST die Aufforderung zuerst in deinen natürlichen gesprochenen Satz integrieren und DANN den Tag am Ende anhängen. "
        "Beispiele: 'Würfelt für Initiative, Abenteurer! [ROLL:d20]' oder "
        "'Nun würfelt für Schaden! [ROLL:d8]'. Füge immer genau einen Tag pro Würfelanfrage hinzu. "
        "EMOTIONS-TAG REGEL: Du MUSST jeden Satz den du sprichst mit einem Emotions-Intensitäts-Tag "
        "am Ende versehen, im Format [EMOTION:X], wobei X eines von: calm, normal, dramatic, intense ist. "
        "Wähle die richtige Emotion für den Moment: "
        "calm für Erzählung, Hintergrundgeschichte, ruhige Beschreibungen und Exposition; "
        "normal für gewöhnliche Konversation und Standardbeschreibungen; "
        "dramatic für spannende Enthüllungen, Wendepunkte, Kampfbeginn und angespannte Momente; "
        "intense für Schlachtrufe, kritische Treffer, Leben-oder-Tod-Situationen und Höhepunkte. "
        "Beispiele: 'Die Taverne ist warm und das Feuer knistert leise... [EMOTION:calm]' oder "
        "'Ein Drache bricht durch die Burgmauer! [EMOTION:intense]'. "
        "Füge immer genau einen Emotions-Tag pro Satz hinzu. Wenn ein Satz auch einen Würfel-Tag hat, "
        "setze den Emotions-Tag zuerst: 'Würfelt um euer Leben! [EMOTION:intense] [ROLL:d20]'. "
        "ZIEL-TAG REGEL: Du MUSST am Ende des Satzes einen Ziel-Tag anhängen, um festzulegen, zu wem du sprichst, "
        "im Format [TARGET:X], wobei X entweder ein spezifischer Charaktername ist, oder 'Group' wenn du alle ansprichst. "
        "Beispiel: 'Was sagst du dazu, Thorian? [TARGET:Thorian]' oder 'Macht euch bereit, Helden! [TARGET:Group]'. "
        "Füge immer genau einen Ziel-Tag pro Satz hinzu. Setze ihn hinter die Emotions- und Würfel-Tags. "
        "FORMATIERUNGSREGEL: Deine Antworten werden von einer Text-zu-Sprache-Engine vorgelesen. "
        "Verwende NIEMALS Sternchen, Markdown, Aufzählungszeichen, nummerierte Listen, Hashtags "
        "oder andere spezielle Formatierung. Schreibe alles als normales gesprochenes Deutsch. "
        "Kein *Hervorheben*, kein **Fett**, kein _Kursiv_, keine Emojis. "
        "Nur natürliche Sprache, als würdest du laut sprechen."
    ),
}


class LLMManager:
    def __init__(self, model_name="llama3", language="en", provider="ollama", api_key=""):
        self.model_name = model_name
        self.language = language
        self.provider = provider
        self.api_key = api_key
        self.system_prompt = SYSTEM_PROMPTS.get(language, SYSTEM_PROMPTS["en"])
        self.campaign_intro = ""
        self.party_intro = ""
        self.history = []
        self._update_system_history()
        self.rag = RAGEngine()

    def _update_system_history(self):
        combined = self.system_prompt + self.campaign_intro + self.party_intro
        if not self.history or self.history[0]["role"] != "system":
            self.history.insert(0, {"role": "system", "content": combined})
        else:
            self.history[0]["content"] = combined

    def set_provider(self, provider: str, api_key: str, model_name: str = None):
        self.provider = provider
        self.api_key = api_key
        if model_name:
            self.model_name = model_name
        elif provider == "gemini":
            self.model_name = "gemini-2.5-flash"
        elif provider == "ollama" and self.model_name.startswith("gemini"):
            self.model_name = "llama3"

    def set_language(self, language: str):
        """Switch language and reset conversation history with new system prompt."""
        self.language = language
        self.system_prompt = SYSTEM_PROMPTS.get(language, SYSTEM_PROMPTS["en"])
        self.history = []  # clear history on language switch
        self._update_system_history()

    def set_campaign_context(self, campaign_summary: str):
        """Inject campaign context into the system prompt."""
        self.campaign_intro = f"\n\nYou are running the following campaign. Use this as background context:\n{campaign_summary}"
        self._update_system_history()

    def set_party_context(self, party_list: list):
        if not party_list:
            return
        roster = "\n".join([f"- {c.get('name', 'Unknown')} (Level {c.get('level', 1)} {c.get('race', '')} {c.get('charClass', '')})" for c in party_list])
        self.party_intro = f"\n\nThe following characters are in the player party:\n{roster}"
        self._update_system_history()

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
            sentence_end = re.compile(r'(?<=[.!?])\s+')
            full_response = ""
            buffer = ""

            if self.provider == "gemini":
                gemini_contents = []
                system_instruction = ""
                for msg in self.history:
                    if msg["role"] == "system":
                        system_instruction = msg["content"]
                    elif msg["role"] == "user":
                        gemini_contents.append({"role": "user", "parts": [{"text": msg["content"]}]})
                    elif msg["role"] == "assistant":
                        gemini_contents.append({"role": "model", "parts": [{"text": msg["content"]}]})
                
                client = genai.Client(api_key=self.api_key)
                config = types.GenerateContentConfig(system_instruction=system_instruction)
                response_stream = client.models.generate_content_stream(model=self.model_name, contents=gemini_contents, config=config)
                
                for chunk in response_stream:
                    content = chunk.text
                    if content:
                        buffer += content
                        full_response += content

                        if sentence_end.search(buffer):
                            parts = sentence_end.split(buffer, 1)
                            cleaned = self.sanitize_for_tts(parts[0].strip())
                            if cleaned:
                                yield cleaned
                            buffer = parts[1] if len(parts) > 1 else ""
            else:
                response = ollama.chat(model=self.model_name, messages=self.history, stream=True)
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
            print(f"{self.provider.capitalize()} Error:", e)
            if self.language == "de":
                yield "Ich scheine meinen Gedanken verloren zu haben. Stellt sicher, dass das System richtig konfiguriert ist."
            else:
                yield "I seem to have lost my train of thought. Ensure the service is properly configured."
