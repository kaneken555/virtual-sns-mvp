from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Integer, Text, DateTime, ForeignKey, String, func
from datetime import datetime
from typing import TYPE_CHECKING
from ..db.session import Base

if TYPE_CHECKING:
    from .post import Post

class Reply(Base):
    __tablename__ = "replies"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    post_id: Mapped[int] = mapped_column(ForeignKey("posts.id", ondelete="CASCADE"), index=True, nullable=False)
    ai_user: Mapped[str] = mapped_column(String(64), default="listener_bot")
    text: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    post: Mapped["Post"] = relationship(back_populates="replies")
