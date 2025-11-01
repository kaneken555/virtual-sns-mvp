# backend/app/main.py
from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import os
from .workers.tasks import generate_reply

app = FastAPI(title="Virtual SNS API")

# ---- CORS設定 ----
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # MVP段階では全許可でOK
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---- メモリ上の簡易データストア ----
POSTS = []
REPLIES = []
POST_ID_SEQ = 1
REPLY_ID_SEQ = 1
INTERNAL_SECRET = os.getenv("INTERNAL_SECRET", "dev-secret")

# ---- スキーマ ----
class PostRequest(BaseModel):
    text: str

class ReplyOut(BaseModel):
    id: int
    post_id: int
    text: str
    ai_user: str
    created_at: str

class PostOut(BaseModel):
    id: int
    text: str
    created_at: str
    replies: List[ReplyOut] = []

class InternalReplyIn(BaseModel):
    post_id: int
    text: str
    ai_user: str = "ai_user"

# ---- ヘルスチェック ----
@app.get("/health")
def health_check():
    return {"status": "ok"}

# ---- 投稿作成 ----
@app.post("/posts", response_model=PostOut)
def create_post(req: PostRequest):
    global POST_ID_SEQ
    post = {
        "id": POST_ID_SEQ,
        "text": req.text,
        "created_at": datetime.utcnow().isoformat(),
    }
    POSTS.append(post)
    POST_ID_SEQ += 1

    # Celeryに非同期で返信生成タスクを投げる
    generate_reply.delay(post["id"], req.text)

    return {**post, "replies": []}

# ---- 投稿一覧 ----
@app.get("/posts", response_model=List[PostOut])
def list_posts():
    def to_out(p):
        rs = [r for r in REPLIES if r["post_id"] == p["id"]]
        rs = sorted(rs, key=lambda r: r["created_at"])
        return {**p, "replies": rs}
    return [
        to_out(p)
        for p in sorted(POSTS, key=lambda x: x["created_at"], reverse=True)
    ]

# ---- Workerからの内部返信登録 ----
@app.post("/internal/replies", response_model=ReplyOut)
def register_reply(
    body: InternalReplyIn,
    x_internal_secret: Optional[str] = Header(None)
):
    if x_internal_secret != INTERNAL_SECRET:
        raise HTTPException(status_code=403, detail="Forbidden")

    target = next((p for p in POSTS if p["id"] == body.post_id), None)
    if not target:
        raise HTTPException(status_code=404, detail="Post not found")

    global REPLY_ID_SEQ
    reply = {
        "id": REPLY_ID_SEQ,
        "post_id": body.post_id,
        "text": body.text,
        "ai_user": body.ai_user,
        "created_at": datetime.utcnow().isoformat(),
    }
    REPLIES.append(reply)
    REPLY_ID_SEQ += 1
    return reply
