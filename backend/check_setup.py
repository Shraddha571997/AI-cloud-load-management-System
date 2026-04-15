import os
import sys
from dotenv import load_dotenv

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Load env from parent if not found
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
load_dotenv(env_path)

print(f"Loading env from: {env_path}")
print(f"MONGO_URI: {os.environ.get('MONGO_URI')}")

try:
    from models import db, User
    print("Attempting MongoDB connection...")
    # Trigger a real connection
    count = User.collection.count_documents({})
    print(f"MongoDB Connected! User count: {count}")
except Exception as e:
    print(f"MongoDB Connection FAILED: {e}")

try:
    from ml_service import ml_service
    print("Testing ML Service...")
    pred = ml_service.predict_load(12)
    print(f"Prediction for hour 12: {pred}")
except Exception as e:
    print(f"ML Service FAILED: {e}")
