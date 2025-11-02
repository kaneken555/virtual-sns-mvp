# app/models/__init__.py
from ..db.session import Base

# モデルをimportしてBaseに登録
from .post import Post
from .reply import Reply

__all__ = ["Base", "Post", "Reply"]
