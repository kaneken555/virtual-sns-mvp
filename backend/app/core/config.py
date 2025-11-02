import os
from pydantic import BaseModel

class Settings(BaseModel):
    DB_URL: str = os.getenv("DB_URL", "sqlite:///./app.db")
    CORS_ORIGINS: str = os.getenv("CORS_ORIGINS", "*")

settings = Settings()
