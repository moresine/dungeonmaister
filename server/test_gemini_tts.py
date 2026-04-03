import sys
from google import genai
from google.genai import types

def test():
    client = genai.Client()
    try:
        response = client.models.generate_content(
            model='gemini-2.0-flash',
            contents='Repeat exactly this text out loud and say nothing else: Welcome to the tavern!',
            config=types.GenerateContentConfig(
                response_modalities=["AUDIO"]
            )
        )
        print("Success! output contains inline_data:", hasattr(response.candidates[0].content.parts[0], 'inline_data'))
    except Exception as e:
        print("Error:", e)

test()
