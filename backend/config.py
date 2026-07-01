from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    MONGO_URI: str = "mongodb://localhost:27017"
    DB_NAME: str = "scanai"
    DB_BACKEND: str = "local"
    JWT_SECRET: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    MAX_UPLOAD_MB: int = 10
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"
    LOCAL_DB_PATH: str = "local_data/scanai.json"

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    class Config:
        env_file = ".env"

settings = Settings()
