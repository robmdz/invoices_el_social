"""
Application configuration loaded from environment variables.
"""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime settings for the Invoice API."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    cors_origins: str = "http://localhost:5173"
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.0-flash"

    # Supabase (for server-side DB operations)
    supabase_url: str = ""
    supabase_service_key: str = ""

    # Toteat API defaults (can be overridden per-user via settings page)
    toteat_api_url: str = ""
    toteat_xir: str = ""
    toteat_xil: str = ""
    toteat_xiu: str = ""
    toteat_api_token: str = ""

    # Product catalog CSV path (loaded at startup)
    product_catalog_csv: str = ""

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
