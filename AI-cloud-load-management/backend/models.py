from pymongo import MongoClient
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
import os
from bson import ObjectId

class Database:
    def __init__(self):
        # Cloud-ready connection string via env, falls back to local for dev
        self.client = MongoClient(os.environ.get('MONGO_URI', 'mongodb://localhost:27017/'))
        self.db = self.client['cloud_load_management']
        # Verification
        try:
            self.client.admin.command('ping')
            print("\n" + "="*50)
            print("✅  SUCCESS: CONNECTED TO MONGODB CLOUD!")
            print("="*50 + "\n")
        except Exception as e:
            print(f"❌ DB Connection Error: {e}")
        
    def get_collection(self, name):
        return self.db[name]

# Initialize database
db = Database()

class User:
    collection = db.get_collection('users')
    
    @staticmethod
    def create_user(username, email, password, role='user'):
        """Create a new user"""
        if User.collection.find_one({'$or': [{'username': username}, {'email': email}]}):
            return None
        
        user_data = {
            'username': username,
            'email': email,
            'password_hash': generate_password_hash(password),
            'role': role,
            'created_at': datetime.utcnow(),
            'is_active': True,
            'last_login': None
        }
        
        result = User.collection.insert_one(user_data)
        return str(result.inserted_id)
    
    @staticmethod
    def authenticate(username, password):
        """Authenticate user"""
        user = User.collection.find_one({'username': username})
        if user and check_password_hash(user['password_hash'], password):
            # Update last login
            User.collection.update_one(
                {'_id': user['_id']},
                {'$set': {'last_login': datetime.utcnow()}}
            )
            return user
        return None
    
    @staticmethod
    def get_by_id(user_id):
        """Get user by ID"""
        return User.collection.find_one({'_id': ObjectId(user_id)})
    
    @staticmethod
    def get_all_users():
        """Get all users (admin only)"""
        return list(User.collection.find({}, {'password_hash': 0}))

    @staticmethod
    def update_user(user_id, data):
        """Update user profile"""
        # Filter allowed fields
        allowed_fields = ['phone', 'preferences', 'email']
        update_data = {k: v for k, v in data.items() if k in allowed_fields}
        
        if not update_data:
            return False
            
        result = User.collection.update_one(
            {'_id': ObjectId(user_id)},
            {'$set': update_data}
        )
        return result.modified_count > 0

class Prediction:
    collection = db.get_collection('load_predictions')
    
    @staticmethod
    def save_prediction(user_id, time_slot, predicted_load, action, confidence=None):
        """Save a prediction result to MongoDB."""
        prediction_data = {
            'user_id': ObjectId(user_id) if user_id else None,
            'time_slot': time_slot,
            'predicted_load': predicted_load,
            'action': action,
            'confidence': confidence,
            'timestamp': datetime.utcnow(),
            'status': 'active'
        }
        result = Prediction.collection.insert_one(prediction_data)
        prediction_data['_id'] = str(result.inserted_id)
        return prediction_data
    
    @staticmethod
    def get_user_predictions(user_id, limit=50):
        """Get a user's prediction history (most recent first)."""
        return Prediction._serialize_many(Prediction.collection.find(
            {'user_id': ObjectId(user_id)},
            {'user_id': 0}
        ).sort('timestamp', -1).limit(limit))
    
    @staticmethod
    def get_analytics_data(days=30):
        """Get analytics data for dashboard"""
        start_date = datetime.utcnow() - timedelta(days=days)
        
        pipeline = [
            {'$match': {'timestamp': {'$gte': start_date}}},
            {'$group': {
                '_id': {
                    'date': {'$dateToString': {'format': '%Y-%m-%d', 'date': '$timestamp'}},
                    'action': '$action'
                },
                'count': {'$sum': 1},
                'avg_load': {'$avg': '$predicted_load'}
            }},
            {'$sort': {'_id.date': 1}}
        ]
        
        return list(Prediction.collection.aggregate(pipeline))

    @staticmethod
    def fetch_all_predictions(limit=100, user_id=None):
        """Fetch predictions for history table (optionally user-scoped)."""
        query = {}
        if user_id:
            query['user_id'] = ObjectId(user_id)
        cursor = Prediction.collection.find(query, {'user_id': 0}).sort('timestamp', -1).limit(limit)
        return Prediction._serialize_many(cursor)

    @staticmethod
    def fetch_latest_prediction(user_id=None):
        """Return the latest prediction document."""
        query = {}
        if user_id:
            query['user_id'] = ObjectId(user_id)
        doc = Prediction.collection.find_one(query, sort=[('timestamp', -1)], projection={'user_id': 0})
        return Prediction._serialize(doc)

    @staticmethod
    def get_stats(days=30, user_id=None):
        """Aggregate stats for charts and KPI cards."""
        start_date = datetime.utcnow() - timedelta(days=days)
        match = {'timestamp': {'$gte': start_date}}
        if user_id:
            match['user_id'] = ObjectId(user_id)

        action_pipeline = [
            {'$match': match},
            {'$group': {'_id': '$action', 'count': {'$sum': 1}}}
        ]

        trend_pipeline = [
            {'$match': match},
            {'$group': {
                '_id': {'$dateToString': {'format': '%Y-%m-%d', 'date': '$timestamp'}},
                'avg_load': {'$avg': '$predicted_load'}
            }},
            {'$sort': {'_id': 1}}
        ]

        actions = {item['_id']: item['count'] for item in Prediction.collection.aggregate(action_pipeline)}
        trend = list(Prediction.collection.aggregate(trend_pipeline))

        avg_doc = Prediction.collection.aggregate([
            {'$match': match},
            {'$group': {'_id': None, 'avg_load': {'$avg': '$predicted_load'}, 'count': {'$sum': 1}}}
        ])
        avg_stats = next(avg_doc, {'avg_load': 0, 'count': 0})

        return {
            'action_counts': actions,
            'trend': trend,
            'avg_load': avg_stats.get('avg_load', 0),
            'total_predictions': avg_stats.get('count', 0)
        }

    @staticmethod
    def _serialize(doc):
        if not doc:
            return None
        doc['_id'] = str(doc.get('_id')) if doc.get('_id') else None
        if isinstance(doc.get('timestamp'), datetime):
            doc['timestamp'] = doc['timestamp'].isoformat()
        return doc

    @staticmethod
    def _serialize_many(cursor):
        return [Prediction._serialize(doc) for doc in cursor]

class SystemMetrics:
    collection = db.get_collection('system_metrics')
    
    @staticmethod
    def log_api_call(endpoint, user_id, response_time, status_code):
        """Log API call metrics"""
        metric_data = {
            'endpoint': endpoint,
            'user_id': ObjectId(user_id) if user_id else None,
            'response_time': response_time,
            'status_code': status_code,
            'timestamp': datetime.utcnow()
        }
        
        SystemMetrics.collection.insert_one(metric_data)
    
    @staticmethod
    def get_system_stats():
        """Get system performance statistics"""
        pipeline = [
            {'$group': {
                '_id': None,
                'total_requests': {'$sum': 1},
                'avg_response_time': {'$avg': '$response_time'},
                'success_rate': {
                    '$avg': {'$cond': [{'$lt': ['$status_code', 400]}, 1, 0]}
                }
            }}
        ]
        
        result = list(SystemMetrics.collection.aggregate(pipeline))
        return result[0] if result else {}

# Create default admin user
def create_default_admin():
    """Create default admin user if not exists"""
    if not User.collection.find_one({'role': 'admin'}):
        User.create_user('admin', 'admin@cloudload.com', 'admin123', 'admin')
        print("Default admin user created: admin/admin123")

# Initialize default data
create_default_admin()