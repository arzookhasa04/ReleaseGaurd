from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import List, Union
import os
import json

class Settings(BaseSettings):
    PROJECT_NAME: str = "ReleaseGuard AI"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "production")
    PORT: int = int(os.getenv("PORT", "8000"))
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./releaseguard.db")
    
    # Infrastructure mode
    KUBERNETES_ENABLED: bool = os.getenv("KUBERNETES_ENABLED", "false").lower() in ("true", "1", "yes")
    SIMULATOR_MODE: bool = not os.getenv("KUBERNETES_ENABLED", "false").lower() in ("true", "1", "yes")
    
    # AI Analysis
    OPENAI_API_KEY: str | None = os.getenv("OPENAI_API_KEY", None)
    LLM_MODEL: str = os.getenv("LLM_MODEL", "gpt-4o-mini")
    
    # CORS
    CORS_ORIGINS: Union[List[str], str] = os.getenv("CORS_ORIGINS", "*")

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            if v.startswith("[") and v.endswith("]"):
                try:
                    return json.loads(v)
                except Exception:
                    pass
            # Split comma separated origins
            return [i.strip() for i in v.split(",") if i.strip()]
        return v

    @property
    def normalized_database_url(self) -> str:
        url = self.DATABASE_URL.strip()
        # Handle Render/Neon/Heroku style postgres:// URL
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql://", 1)
        return url

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
