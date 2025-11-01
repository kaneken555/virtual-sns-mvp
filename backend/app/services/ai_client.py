# backend/app/services/ai_client.py
import os
from openai import OpenAI

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
client = OpenAI(api_key=OPENAI_API_KEY)

SYSTEM_PROMPT = """
あなたはSNS上の普通のユーザーの一人です。
軽い共感・雑談・ユーモアを交えて自然に返信してください。
返答は60文字以内で。
"""

def generate_ai_reply(text: str) -> str:
    """
    投稿内容に対してAI返信を生成
    """
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"投稿: {text}"},
        ],
        temperature=0.8,
    )

    reply = response.choices[0].message.content.strip()
    return reply
