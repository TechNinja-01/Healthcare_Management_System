from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DB_HOST: str
    DB_PORT: int
    DB_NAME: str
    DB_USER: str
    DB_PASSWORD: str
    

    SECRET_KEY: str

    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    RAZORPAY_KEY_ID: str
    RAZORPAY_KEY_SECRET:str
    # RAZORPAY_WEBHOOK_SECRET: str

    # WebRTC ICE (STUN is free/public; TURN is optional but recommended).
    STUN_URL: str = "stun:stun.l.google.com:19302"
    TURN_URL: str | None = None
    TURN_USERNAME: str | None = None
    TURN_CREDENTIAL: str | None = None

    # MinIO / S3-compatible object storage for call recordings.
    MINIO_ENDPOINT: str | None = None          # e.g. "localhost:9000"
    MINIO_ACCESS_KEY: str | None = None
    MINIO_SECRET_KEY: str | None = None
    MINIO_BUCKET: str = "consultation-recordings"
    MINIO_SECURE: bool = False                 # True if MinIO is behind https
    RECORDING_URL_TTL_SECONDS: int = 3600


    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
    )

    @property
    def DATABASE_URL(self) -> str:
        return (
            f"postgresql://{self.DB_USER}:{self.DB_PASSWORD}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
        )


settings = Settings()
