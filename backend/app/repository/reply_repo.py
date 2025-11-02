from sqlalchemy.orm import Session
from ..models import Reply

def create_reply(db: Session, post_id: int, text: str, ai_user: str) -> Reply:
    r = Reply(post_id=post_id, text=text, ai_user=ai_user)
    db.add(r)
    db.commit()
    db.refresh(r)
    return r
