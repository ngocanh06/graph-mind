"""
Application settings — loaded from .env via pydantic-settings
"""
from pathlib import Path
import hashlib
from typing import Set
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
ROOT_DIR = BACKEND_DIR.parent

# SHA-256 hashes of forbidden historical secrets (never store raw keys in source code)
FORBIDDEN_SECRET_HASHES: Set[str] = {
    # Hash of historical leaked key
    "812d7f875b44a17f4f20381b9b006ee030db80a0a5cd29af3d262517b16137c7",
}


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(
            str(ROOT_DIR / ".env"),
            str(BACKEND_DIR / ".env"),
            ".env",
        ),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Application
    APP_ENV: str = "development"
    PORT: int = 5000
    FRONTEND_PORT: int = 5173

    # Feature Flags
    PB56_WORKSTATIONS_ENABLED: bool = True

    # Security & Authentication — Read strictly from environment (.env), never hardcoded
    SECRET_KEY: str = ""
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    AEGIS_AGENT_API_KEY: str = ""

    @field_validator("SECRET_KEY", mode="after")
    @classmethod
    def validate_secret_key(cls, v: str) -> str:
        clean = (v or "").strip()
        if not clean or "change-me" in clean.lower() or len(clean) < 32:
            raise ValueError(
                "CRITICAL SECURITY CONFIGURATION ERROR: SECRET_KEY is missing, insecure, contains 'change-me', "
                "or is shorter than 32 characters. Backend refuses to start. Configure a strong random key in .env."
            )
        h = hashlib.sha256(clean.encode("utf-8")).hexdigest()
        if h in FORBIDDEN_SECRET_HASHES:
            raise ValueError(
                "CRITICAL SECURITY CONFIGURATION ERROR: SECRET_KEY matches a forbidden/leaked historical key hash. "
                "Backend refuses to start. You MUST rotate to a brand new random key."
            )
        return clean

    @field_validator("AEGIS_AGENT_API_KEY", mode="after")
    @classmethod
    def validate_aegis_agent_api_key(cls, v: str) -> str:
        clean = (v or "").strip()
        import os
        if os.getenv("APP_ENV") == "testing":
            return clean or "test-agent-key"
        if not clean or "change-me" in clean.lower() or clean == "dev-agent-key" or len(clean) < 16:
            raise ValueError(
                "CRITICAL SECURITY CONFIGURATION ERROR: AEGIS_AGENT_API_KEY must not be empty, 'dev-agent-key', "
                "or contain 'change-me', and must be at least 16 characters long. Set a secure key in .env."
            )
        return clean

    # PostgreSQL
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "12345678"
    POSTGRES_DB: str = "graph_mind"

    @field_validator("POSTGRES_PASSWORD", mode="after")
    @classmethod
    def validate_postgres_password(cls, v: str) -> str:
        clean = (v or "").strip()
        import os
        if os.getenv("APP_ENV") == "testing":
            return clean or "test_pass"
        forbidden_pw = {"change-me", "password", "postgres", "123456"}
        if not clean or clean.lower() in forbidden_pw or "change-me" in clean.lower():
            raise ValueError(
                "CRITICAL SECURITY CONFIGURATION ERROR: POSTGRES_PASSWORD must not be empty or use a weak default. "
                "Set a secure password in .env."
            )
        return clean

    @property
    def async_database_url(self) -> str:
        """URL dùng cho SQLAlchemy async (asyncpg driver)"""
        return (
            f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    @property
    def sync_database_url(self) -> str:
        """URL dùng cho Alembic (psycopg2 driver, sync)"""
        return (
            f"postgresql+psycopg2://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    # Neo4j
    NEO4J_URI: str = "bolt://localhost:7687"
    NEO4J_USER: str = "neo4j"
    NEO4J_PASSWORD: str = "graphmind_secret"

    # Qdrant
    QDRANT_HOST: str = "localhost"
    QDRANT_PORT: int = 6333
    QDRANT_COLLECTION_NAME: str = "cuad_contracts"

    # Self-Hosted LLM Inference (Ollama)
    INFERENCE_ENGINE_URL: str = "http://localhost:11434"
    MODEL_NAME: str = "qwen2.5-7b-graphmind"

    # SMTP Email
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = ""
    SMTP_FROM_NAME: str = "Admin Công Ty"


# Singleton instance — import và dùng ở mọi nơi
settings = Settings()

