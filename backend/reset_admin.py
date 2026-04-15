"""
reset_admin.py — Run this once to reset the admin user in MongoDB.
Usage: python reset_admin.py

This is a utility script for development/recovery. Safe to run multiple times.
"""
from config import Config
from dotenv import load_dotenv
from flask_bcrypt import generate_password_hash
from pymongo import MongoClient
from datetime import datetime

load_dotenv()

client = MongoClient(Config.MONGO_URI)
db = client.get_database()
users_col = db['users']

admin_doc = {
    'name': 'Administrator',
    'username': 'admin',
    'email': 'shraddhagudasalamani.mca2024@adhiyamaan.in',
    'password_hash': generate_password_hash('admin123').decode('utf-8'),
    'role': 'admin',
    'created_at': datetime.utcnow(),
    'last_login': None,
}

result = users_col.update_one(
    {'username': 'admin'},
    {'$set': admin_doc},
    upsert=True
)

if result.upserted_id:
    print("[OK] Admin user created successfully.")
else:
    print("[OK] Admin user updated/reset successfully.")

print("Username: admin  |  Password: admin123")
