from fastapi import APIRouter
from sse_starlette.sse import EventSourceResponse
import asyncio, json
from ..services.bus import subscribe  # ← 既に作成済みの Redis Pub/Sub ラッパー

router = APIRouter()

@router.get("/stream")
async def stream():
    async def event_gen():
        # 初期ping
        yield {"event": "ping", "data": json.dumps({"t": asyncio.get_event_loop().time()})}
        # Redis Pub/Sub をそのままSSEで流す
        async for raw in subscribe():
            # raw は JSON bytes の想定（bus.publish_reply で json.dumps 済み）
            # bytes を str にデコード
            data_str = raw.decode('utf-8') if isinstance(raw, bytes) else raw
            yield {"event": "reply", "data": data_str}
    return EventSourceResponse(event_gen(), ping=15)
