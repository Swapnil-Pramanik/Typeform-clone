"""Application settings, read once from the environment."""

from functools import lru_cache

from pydantic import field_validator
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
    #: Hosted libSQL (Turso) credential, kept out of the URL. Turso issues the
    #: host and the token as two separate values, so they stay two settings —
    #: a secret embedded in a connection string is easy to leak and easy to
    #: mangle. Ignored for local SQLite.
    database_auth_token: str | None = None
    cors_origins: str = "http://localhost:3000"
    creator_name: str = "Swapnil"

    @field_validator("database_url", "database_auth_token", "cors_origins", mode="before")
    @classmethod
    def _tidy(cls, value: object) -> object:
        """Trim whitespace and matching quotes from values set in a host's UI.

        Pasting a credential into a deployment dashboard reliably picks up a
        trailing newline or a pair of quotes. The value then looks configured
        while the driver rejects it — here, a 349-character token that should be
        348, surfacing only as an opaque 401. Cheap to tolerate, expensive to
        diagnose.
        """
        if not isinstance(value, str):
            return value
        trimmed = value.strip()
        if len(trimmed) >= 2 and trimmed[0] == trimmed[-1] and trimmed[0] in "\"'":
            trimmed = trimmed[1:-1].strip()
        return trimmed

    @property
    def allowed_origins(self) -> list[str]:
        """CORS origins as a list. ``*`` is passed through untouched."""
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
