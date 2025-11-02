import os, json, asyncio
from redis import asyncio as aioredis

REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")
CHANNEL = "sns-replies"

async def publish_reply(message: dict):
    r = aioredis.from_url(REDIS_URL)
    try:
        await r.publish(CHANNEL, json.dumps(message))
    finally:
        await r.close()

async def subscribe():
    r = aioredis.from_url(REDIS_URL)
    psub = r.pubsub()
    await psub.subscribe(CHANNEL)
    try:
        async for msg in psub.listen():
            if msg and msg["type"] == "message":
                yield msg["data"]
    finally:
        await psub.unsubscribe(CHANNEL)
        await psub.close()
        await r.close()
