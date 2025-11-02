from pydantic import BaseModel

class ReplyOut(BaseModel):
    id: int
    post_id: int
    text: str
    ai_user: str
    created_at: str

class InternalReplyIn(BaseModel):
    post_id: int
    text: str
    ai_user: str = "listener_bot"
