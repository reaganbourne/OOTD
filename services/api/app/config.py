from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


_PLACEHOLDER_SECRET_KEYS = {
    "changeme",
    "change-me",
    "changeme-replace-with-a-secure-random-string",
    "secret",
    "dev-secret",
    "test-secret",
}


class Settings(BaseSettings):
    database_url: str
    secret_key: str
    environment: str = "development"
    debug: bool = False
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"

    # S3 image storage
    s3_bucket: str = ""
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    aws_region: str = "us-east-1"

    # Base URL for local-storage uploads (dev only, S3 is used in prod).
    # Change this if your API runs on a different port locally.
    api_local_base_url: str = "http://localhost:8000"

    # Claude AI (vibe check)
    anthropic_api_key: str = ""

    # Public frontend base URL — used for shareable links and OG tags
    public_base_url: str = "https://ootd.app"

    # Admin secret for internal maintenance endpoints (board cleanup, etc.)
    # Set this to a long random string in production. Empty = endpoint disabled.
    admin_secret: str = ""

    # CORS — comma-separated list of allowed origins.
    # Defaults to localhost:3000 for local dev. Set in production to your real domain.
    # Example: ALLOWED_ORIGINS=https://ootd.app,https://www.ootd.app
    allowed_origins: list[str] = []

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @model_validator(mode="after")
    def validate_public_launch_security(self) -> "Settings":
        if self.environment != "production":
            return self

        secret_key = self.secret_key.strip()
        if (
            len(secret_key) < 32
            or secret_key.lower() in _PLACEHOLDER_SECRET_KEYS
            or len(set(secret_key)) < 8
        ):
            raise ValueError("Production SECRET_KEY must be a unique random value with at least 32 characters.")

        origins = self.cors_origin_list
        if not origins:
            raise ValueError("Production CORS_ORIGINS must be set to the public frontend origin.")
        disallowed = {"*", "http://localhost:3000", "http://127.0.0.1:3000"}
        if any(origin in disallowed for origin in origins):
            raise ValueError("Production CORS_ORIGINS cannot include wildcards or localhost origins.")

        if self.admin_secret and len(self.admin_secret) < 32:
            raise ValueError("Production ADMIN_SECRET must be at least 32 characters when enabled.")

        if self.s3_bucket and (not self.aws_access_key_id or not self.aws_secret_access_key):
            raise ValueError("S3 uploads require AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY.")

        return self

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()
