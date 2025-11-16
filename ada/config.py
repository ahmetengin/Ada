"""Application configuration."""

from functools import lru_cache
from typing import Optional

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Application
    app_name: str = "Ada"
    app_version: str = "0.1.0"
    debug: bool = False
    log_level: str = "INFO"

    # CORS Configuration
    cors_allowed_origins: str = "http://localhost:3000,http://localhost:5173"

    # Database
    database_url: str
    database_pool_size: int = 10
    database_max_overflow: int = 20

    # Redis
    redis_url: str
    redis_max_connections: int = 50

    # Qdrant
    qdrant_host: str = "localhost"
    qdrant_port: int = 6333
    qdrant_api_key: Optional[str] = None

    # Neo4j
    neo4j_uri: str = "bolt://localhost:7687"
    neo4j_user: str = "neo4j"
    neo4j_password: str = Field(default="password")

    # FAISS
    faiss_index_path: str = "./data/faiss_indices"

    # Security
    secret_key: str = Field(..., min_length=32, description="Secret key for JWT signing (minimum 32 characters)")
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    # Claude AI
    anthropic_api_key: str = Field(default="")

    # SEAL Agent
    seal_model: str = "claude-sonnet-4-5-20250929"
    seal_max_iterations: int = 10

    def get_cors_origins(self) -> list[str]:
        """Parse CORS allowed origins from comma-separated string."""
        return [origin.strip() for origin in self.cors_allowed_origins.split(",")]


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
