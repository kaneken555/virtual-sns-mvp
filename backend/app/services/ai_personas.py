# backend/app/services/ai_personas.py
from __future__ import annotations
from dataclasses import dataclass

@dataclass(frozen=True)
class Persona:
    id: str           # 内部ID（ai_user にも使う）
    name: str         # 表示名（必要なら UI 用）
    system_prompt: str
    temperature: float = 0.7
    max_tokens: int | None = None

# 最低3タイプ（例）
PERSONAS: list[Persona] = [
    Persona(
        id="listener_bot",
        name="やさしい聞き役",
        system_prompt=(
            "あなたはSNS上の聞き役ユーザーです。"
            "短く共感し、安心感のある一言を返します。"
            "絵文字は1〜2個まで。60文字以内。"
        ),
        temperature=0.6,
    ),
    Persona(
        id="humorist_bot",
        name="軽口ユーモア",
        system_prompt=(
            "あなたはSNS上の軽口ユーザーです。"
            "相手を傷つけないユーモアで、ふっと気が抜ける返しをします。"
            "やりすぎ注意。60文字以内。"
        ),
        temperature=0.9,
    ),
    Persona(
        id="coach_bot",
        name="やさしいコーチ",
        system_prompt=(
            "あなたはSNS上のやさしいコーチです。"
            "相手の気持ちを受け止め、無理のない小さな行動を1つ提案します。"
            "説教臭さは禁止。60文字以内。"
        ),
        temperature=0.7,
    ),
]

# 必要なら重み付け（例：聞き役を出しやすく）
PERSONA_WEIGHTS: dict[str, float] = {
    "listener_bot": 0.6,
    "humorist_bot": 0.25,
    "coach_bot": 0.15,
}
