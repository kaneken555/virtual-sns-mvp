from sqlalchemy.orm import Session
from sqlalchemy import select
from ..models import Post, Reply

def create_post(db: Session, text: str) -> Post:
    p = Post(text=text)
    db.add(p)
    db.commit()
    db.refresh(p)
    return p

def list_posts(db: Session) -> list[Post]:
    # 最新順で取得（replies は lazy でOK）
    stmt = select(Post).order_by(Post.created_at.desc())
    return list(db.execute(stmt).scalars().all())
