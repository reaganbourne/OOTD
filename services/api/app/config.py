from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str
    secret_key: str
    environment: str = "development"
    debug: bool = False

    # S3 image storage
    s3_bucket: str = ""
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    aws_region: str = "us-east-1"

    # Claude AI (vibe check)
    anthropic_api_key: str = ""

    # Public frontend base URL — used for shareable links and OG tags
    public_base_url: str = "https://ootd.app"

    # Admin secret for internal maintenance endpoints (board cleanup, etc.)
    # Set this to a long random string in production. Empty = endpoint disabled.
    admin_secret: str = ""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
