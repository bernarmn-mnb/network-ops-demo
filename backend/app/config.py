"""
Configuration management for the backend service.

Loads configuration from environment variables using python-dotenv.
All Elastic credentials should be stored in .env file.
"""

import os
from dotenv import load_dotenv

# Load environment variables from .env file
# override=True ensures local .env takes precedence
load_dotenv(override=True)


class Settings:
    """Application settings loaded from environment variables."""
    
    # Elastic Configuration
    KIBANA_URL: str = os.getenv("KIBANA_URL", "")
    ELASTICSEARCH_URL: str = os.getenv("ELASTICSEARCH_URL", "")
    ELASTIC_CLOUD_ID: str = os.getenv("ELASTIC_CLOUD_ID", "")
    ELASTIC_API_KEY: str = os.getenv("ELASTIC_API_KEY", "")
    AGENT_ID: str = os.getenv("AGENT_ID", "")
    
    # Search Configuration
    SEARCH_INDEX: str = os.getenv("SEARCH_INDEX", "products")
    
    # LLM Proxy Configuration (for A2A Multi-Agent)
    LLM_PROXY_URL: str = os.getenv("LLM_PROXY_URL", "")
    LLM_PROXY_API_KEY: str = os.getenv("LLM_PROXY_API_KEY", "")
    LLM_PROXY_MODEL: str = os.getenv("LLM_PROXY_MODEL", "gpt-4")
    
    # Server Configuration
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8001"))
    FRONTEND_PORT: int = int(os.getenv("FRONTEND_PORT", "3000"))
    
    # CORS Origins - dynamically include frontend port
    @property
    def CORS_ORIGINS(self) -> list[str]:
        custom = os.getenv("CORS_ORIGINS", "")
        origins = [
            f"http://localhost:{self.FRONTEND_PORT}",
            f"http://127.0.0.1:{self.FRONTEND_PORT}",
        ]
        if custom:
            origins.extend(custom.split(","))
        return origins
    
    def validate(self) -> None:
        """Validate required configuration is present."""
        required = ["KIBANA_URL", "ELASTIC_API_KEY", "AGENT_ID"]
        missing = [key for key in required if not getattr(self, key)]
        if missing:
            raise ValueError(f"Missing required configuration: {', '.join(missing)}")


# Global settings instance
settings = Settings()

