# backend/app/workers/tasks.py
from .celery_app import celery_app
from ..services.ai_client import generate_ai_reply
from ..services.ai_personas import PERSONAS, PERSONA_WEIGHTS
import os, time, random, requests

API_BASE = os.getenv("API_BASE", "http://backend:8000")
INTERNAL_SECRET = os.getenv("INTERNAL_SECRET", "dev-secret")

REPLY_DELAY_MIN = int(os.getenv("REPLY_DELAY_MIN", "1"))
REPLY_DELAY_MAX = int(os.getenv("REPLY_DELAY_MAX", "10"))
MAX_REPLIES = int(os.getenv("MAX_REPLIES_PER_POST", "2"))  # 投稿あたり最大返信数（1〜2が推奨）

def _weighted_choice_k(k: int) -> list[str]:
    # 重みに従ってペルソナIDを重複なしで k 件選ぶ
    ids = [p.id for p in PERSONAS]
    weights = [PERSONA_WEIGHTS.get(p.id, 1.0) for p in PERSONAS]
    # 簡易：重みに比例したリストからシャッフル→ユニーク取り
    bag = []
    for pid, w in zip(ids, weights):
        bag += [pid] * max(1, int(w * 100))
    random.shuffle(bag)
    seen, out = set(), []
    for pid in bag:
        if pid not in seen:
            out.append(pid)
            seen.add(pid)
            if len(out) >= k:
                break
    return out

@celery_app.task(name="generate_reply", bind=True)
def generate_reply(self, post_id: int, text: str):
    print(f"[Worker] generate_reply args: post_id={post_id}, text='{text[:20]}'")

    # 返信数を1〜MAX_REPLIESで決定
    k = random.randint(1, max(1, MAX_REPLIES))
    persona_ids = _weighted_choice_k(k)

    for idx, persona_id in enumerate(persona_ids):
        # それぞれ少しずつディレイをずらして“自然な間”
        delay = random.randint(REPLY_DELAY_MIN, REPLY_DELAY_MAX) + idx * 2
        time.sleep(delay)

        reply_text, ai_user_id = generate_ai_reply(text, persona_id=persona_id)

        payload = {"post_id": post_id, "text": reply_text, "ai_user": ai_user_id}
        try:
            r = requests.post(
                f"{API_BASE}/internal/replies",
                headers={"X-Internal-Secret": INTERNAL_SECRET, "Content-Type": "application/json"},
                json=payload,
                timeout=10,
            )
            print(f"[Worker] register_reply {r.status_code} -> {r.text[:120]}")
            r.raise_for_status()
        except Exception as e:
            print(f"[Worker] failed to register reply: {e}")
