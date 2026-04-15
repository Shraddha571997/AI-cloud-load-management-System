import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()

class Config:
    # Flask Configuration
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key'
    
    # JWT Configuration
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY') or 'jwt-secret-key'
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)
    
    # MongoDB Configuration
    MONGO_URI = os.environ.get('MONGO_URI') or 'mongodb://localhost:27017/cloud_load_management'
    
    # Email Configuration
    MAIL_SERVER = os.environ.get('MAIL_SERVER') or 'smtp.gmail.com'
    MAIL_PORT = int(os.environ.get('MAIL_PORT') or 587)
    MAIL_USE_TLS = os.environ.get('MAIL_USE_TLS', 'true').lower() in ['true', 'on', '1']
    MAIL_USERNAME = os.environ.get('MAIL_USERNAME')
    MAIL_PASSWORD = os.environ.get('MAIL_PASSWORD')
    
    # Redis Configuration
    REDIS_URL = os.environ.get('REDIS_URL') or 'redis://localhost:6379/0'
    
    # Rate Limiting
    RATELIMIT_STORAGE_URL = os.environ.get('RATELIMIT_STORAGE_URL') or 'redis://localhost:6379/1'

    # Scaling thresholds (configurable for tuning)
    SCALE_UP_THRESHOLD = float(os.environ.get('SCALE_UP_THRESHOLD', 75))
    SCALE_DOWN_THRESHOLD = float(os.environ.get('SCALE_DOWN_THRESHOLD', 40))