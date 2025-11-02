# backend/app/main.py
from fastapi import FastAPI, Depends, HTTPException, Header, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import asyncio

from .core.config import settings
from .api.deps import get_db
from .schemas.post import PostCreate, PostOut
from .schemas.reply import ReplyOut, InternalReplyIn
from .repository.post_repo import create_post as repo_create_post, list_posts as repo_list_posts
from .repository.reply_repo import create_reply as repo_create_reply
from .workers.tasks import generate_reply
from .models import Post, Reply, Base
from .services.bus import publish_reply
from .db.session import engine

# ✅ まずアプリを作る
app = FastAPI(title="Virtual SNS API")

@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)  # ←暫定：テーブル自動作成

# ✅ 次にミドルウェア
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS.split(",") if settings.CORS_ORIGINS else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ 最後にルーター登録（app作成の後）
from .api.sse import router as sse_router
app.include_router(sse_router)

INTERNAL_SECRET = os.getenv("INTERNAL_SECRET", "dev-secret")


@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/posts", response_model=PostOut)
def create_post(req: PostCreate, db: Session = Depends(get_db)):
    post = repo_create_post(db, text=req.text)
    generate_reply.delay(post.id, req.text)
    return PostOut(
        id=post.id, text=post.text, created_at=str(post.created_at), replies=[]
    )

@app.get("/posts", response_model=List[PostOut])
def list_posts(db: Session = Depends(get_db)):
    posts: list[Post] = repo_list_posts(db)
    out: list[PostOut] = []
    for p in posts:
        replies = [
            ReplyOut(
                id=r.id, post_id=r.post_id, text=r.text, ai_user=r.ai_user, created_at=str(r.created_at)
            )
            for r in sorted(p.replies, key=lambda x: x.created_at)
        ]
        out.append(PostOut(id=p.id, text=p.text, created_at=str(p.created_at), replies=replies))
    return out

@app.post("/internal/replies", response_model=ReplyOut)
async def register_reply(
    body: InternalReplyIn,
    background_tasks: BackgroundTasks,
    x_internal_secret: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    if x_internal_secret != INTERNAL_SECRET:
        raise HTTPException(status_code=403, detail="Forbidden")

    # Post存在確認
    exists = db.get(Post, body.post_id)
    if not exists:
        raise HTTPException(status_code=404, detail="Post not found")

    r = repo_create_reply(db, post_id=body.post_id, text=body.text, ai_user=body.ai_user)

    # SSE へ通知（バックグラウンドタスクで投げる）
    message = {
        "type": "reply",
        "post_id": r.post_id,
        "reply": {
            "id": r.id, "post_id": r.post_id, "text": r.text,
            "ai_user": r.ai_user, "created_at": str(r.created_at)
        }
    }
    background_tasks.add_task(publish_reply, message)

    return ReplyOut(id=r.id, post_id=r.post_id, text=r.text, ai_user=r.ai_user, created_at=str(r.created_at))