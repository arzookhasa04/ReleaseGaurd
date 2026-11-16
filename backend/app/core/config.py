from pydantic_settings import BaseSettings
from typing import List
import os

class Settings(BaseSettings):
    PROJECT_NAME: str = "ReleaseGuard AI"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./releaseguard.db")
    
    # Infrastructure mode
    KUBERNETES_ENABLED: bool = os.getenv("KUBERNETES_ENABLED", "false").lower() in ("true", "1", "yes")
    SIMULATOR_MODE: bool = not os.getenv("KUBERNETES_ENABLED", "false").lower() in ("true", "1", "yes")
    
    # AI Analysis
    OPENAI_API_KEY: str | None = os.getenv("OPENAI_API_KEY", None)
    LLM_MODEL: str = os.getenv("LLM_MODEL", "gpt-4o-mini")
    
    # CORS
    CORS_ORIGINS: List[str] = ["*"]

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
