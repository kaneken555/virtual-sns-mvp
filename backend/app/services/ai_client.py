# backend/app/services/ai_client.py
import os
from openai import OpenAI
from .ai_personas import PERSONAS, Persona

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
client = OpenAI(api_key=OPENAI_API_KEY)

def resolve_persona(persona_id: str | None) -> Persona:
    if persona_id:
        for p in PERSONAS:
            if p.id == persona_id:
                return p
    # デフォルトは聞き役
    return next(p for p in PERSONAS if p.id == "listener_bot")

def generate_ai_reply(text: str, persona_id: str | None = None) -> tuple[str, str]:
    """
    AI返信を生成
    Returns: (reply_text, ai_user_id)
    """
    persona = resolve_persona(persona_id)

    response = client.chat.completions.create(
        model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
        messages=[
            {"role": "system", "content": persona.system_prompt},
            {"role": "user", "content": f"投稿: {text}"},
        ],
        temperature=persona.temperature,
        max_tokens=persona.max_tokens,
    )
    reply = (response.choices[0].message.content or "").strip()
    return reply, persona.id
