from fastapi import APIRouter
from sse_starlette.sse import EventSourceResponse
import asyncio, json
from ..services.bus import subscribe

router = APIRouter()

@router.get("/stream")
async def stream():
    async def event_gen():
        # 心拍（30秒ごと）
        heartbeat = 30
        last = 0
        async for raw in subscribe():
            # メッセージ送信
            yield {"event": "reply", "data": raw}
            # 心拍管理
            now = asyncio.get_event_loop().time()
            if now - last > heartbeat:
                last = now
                yield {"event": "ping", "data": json.dumps({"t": now})}
    return EventSourceResponse(event_gen(), ping=15)
