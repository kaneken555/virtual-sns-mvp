from pydantic import BaseModel
from typing import List
from .reply import ReplyOut

class PostCreate(BaseModel):
    text: str

class PostOut(BaseModel):
    id: int
    text: str
    created_at: str
    replies: List[ReplyOut] = []
