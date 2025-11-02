# app/models/post.py
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import text as sql_text, Integer, String, DateTime
from typing import List, TYPE_CHECKING
from datetime import datetime
from ..db.session import Base

if TYPE_CHECKING:
    from .reply import Reply

class Post(Base):
    __tablename__ = "posts"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    text: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=sql_text("NOW()"), nullable=False
    )

    replies: Mapped[List["Reply"]] = relationship("Reply", back_populates="post")
