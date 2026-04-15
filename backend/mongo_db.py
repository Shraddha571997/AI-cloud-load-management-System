from pymongo import MongoClient
from datetime import datetime

import os
from dotenv import load_dotenv

load_dotenv()
# MongoDB Atlas connection
MONGO_URI = os.environ.get('MONGO_URI')
def get_database():
    """Connect to MongoDB Atlas"""
    try:
        client = MongoClient(MONGO_URI)
        return client['cloud_load_management']
    except Exception as e:
        print(f"Database connection error: {e}")
        return None

def save_prediction(time_slot, predicted_load, action):
    """Save prediction to MongoDB"""
    try:
        db = get_database()
        if db is not None:
            collection = db['load_predictions']
            
            document = {
                "time_slot": time_slot,
                "predicted_load": predicted_load,
                "action": action,
                "timestamp": datetime.now()
            }
            
            result = collection.insert_one(document)
            return str(result.inserted_id)
    except Exception as e:
        print(f"Error saving prediction: {e}")
        return None

def get_predictions():
    """Retrieve all predictions from MongoDB"""
    try:
        db = get_database()
        if db is not None:
            collection = db['load_predictions']
            predictions = list(collection.find({}, {"_id": 0}).sort("timestamp", -1).limit(10))
            return predictions
    except Exception as e:
        print(f"Error retrieving predictions: {e}")
        return []