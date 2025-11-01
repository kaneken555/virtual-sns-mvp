# backend/app/workers/tasks.py
import os
from .celery_app import celery_app
from ..services.ai_client import generate_ai_reply
import random
import time
import requests

API_BASE = os.getenv("API_BASE", "http://localhost:8000")
INTERNAL_SECRET = os.getenv("INTERNAL_SECRET", "dev-secret")

@celery_app.task(name="generate_reply", bind=True)
def generate_reply(self, post_id: int, text: str):
    # 受け取り確認ログ（デバッグ用）
    print(f"[Worker] generate_reply args: post_id={post_id}, text='{text[:20]}'")

    time.sleep(random.randint(1, 10))  # 自然な間

    ai_reply = generate_ai_reply(text)

    payload = {"post_id": post_id, "text": ai_reply, "ai_user": "listener_bot"}
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
