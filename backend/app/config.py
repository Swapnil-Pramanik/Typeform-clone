"""Application settings, read once from the environment."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration.

    A single ``DATABASE_URL`` drives both environments: a local SQLite file in
    development and a hosted libSQL (Turso) database in production. Because both
    are the same SQLite dialect family, the models, migrations and seed script
    are identical on either side.
    """

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite:///./typeform.db"
    cors_origins: str = "http://localhost:3000"
    creator_name: str = "Swapnil"

    @property
    def allowed_origins(self) -> list[str]:
        """CORS origins as a list. ``*`` is passed through untouched."""
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
