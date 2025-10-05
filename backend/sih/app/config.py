"""
Configuration settings for the application
"""
import os
import json
from typing import Optional
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # App Configuration
    APP_NAME: str = "Samudra Sahayak API"
    ENVIRONMENT: str = "development"
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # Database
    MONGODB_URI: str
    
    # JWT Configuration
    JWT_SECRET: str
    JWT_REFRESH_SECRET: str
    JWT_ACCESS_EXPIRES: int = 15  # minutes
    JWT_REFRESH_EXPIRES: int = 7  # days
    JWT_GUEST_EXPIRES: int = 10  # minutes
    JWT_ALGORITHM: str = "HS256"
    
    # Password Hashing
    BCRYPT_SALT_ROUNDS: int = 12
    
    # Email Configuration
    EMAIL_SERVICE: str = "gmail"
    EMAIL_USER: str
    EMAIL_PASS: str
    FRONTEND_URL: str
    
    # Rate Limiting
    RATE_LIMIT_WINDOW_MS: int = 900000
    RATE_LIMIT_MAX_REQUESTS: int = 5
    
    # Security
    SECURE_COOKIES: bool = False
    
    # Guest Mode
    GUEST_SESSION_DURATION: int = 600000
    
    # Google Cloud Storage
    GOOGLE_CLOUD_BUCKET_NAME: str
    GOOGLE_CLOUD_PROJECT_ID: str
    GOOGLE_CLOUD_KEYFILE: str
    
    # Gemini API (uses same service account as GCS)
    GEMINI_MODEL: str = "gemini-2.0-flash-lite"
    
    # Admin
    ADMIN_SECRET: str
    
    # CORS Origins (will be parsed from comma-separated string)
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000"
    
    def get_cors_origins(self) -> list:
        """Parse CORS origins from comma-separated string"""
        if isinstance(self.CORS_ORIGINS, str):
            return [origin.strip() for origin in self.CORS_ORIGINS.split(',')]
        return self.CORS_ORIGINS
    
    class Config:
        env_file = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env")
        env_file_encoding = "utf-8"
        case_sensitive = True
    
    def get_gcs_credentials(self) -> dict:
        """Parse and return GCS credentials as dictionary"""
        try:
            return json.loads(self.GOOGLE_CLOUD_KEYFILE)
        except json.JSONDecodeError:
            raise ValueError("Invalid GCS credentials format")


@lru_cache()
def get_settings() -> Settings:
    """
    Cache settings to avoid reading from environment multiple times
    """
    return Settings()
