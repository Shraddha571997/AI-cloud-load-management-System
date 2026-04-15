from pymongo import MongoClient # type: ignore
# MCA Viva Note: We use flask_bcrypt for strong cryptographic hashing of user passwords.
# Bcrypt incorporates an adaptive cost factor to protect against brute-force attacks.
from flask_bcrypt import generate_password_hash, check_password_hash # type: ignore
from datetime import datetime, timedelta
import os
from bson import ObjectId # type: ignore

class Database:
    def __init__(self):
        # Cloud-ready connection string via env, falls back to local for dev
        self.client = MongoClient(os.environ.get('MONGO_URI', 'mongodb://localhost:27017/'))
        self.db = self.client['cloud_load_management']
        # Verification
        try:
            self.client.admin.command('ping')
            print("\n" + "="*50)
            print("[OK] SUCCESS: CONNECTED TO MONGODB CLOUD!")
            print("="*50 + "\n")
        except Exception as e:
            print(f"[ERROR] DB Connection Error: {e}")
        
    def get_collection(self, name):
        return self.db[name]

# Initialize database
db = Database()

class User:
    collection = db.get_collection('users')
    
    @staticmethod
    def create_user(name, username, email, password, role='user'):
        """Create a new user"""
        # MCA Viva Note: We check if the email or username already exists in the MongoDB collection
        # to prevent duplicate registrations and maintain data integrity.
        if User.collection.find_one({'$or': [{'username': username}, {'email': email}]}):
            return None
        
        # MCA Viva Note: Passwords are never stored in plaintext. We hash them using bcrypt.
        # The .decode('utf-8') is necessary because flask_bcrypt returns a byte string.
        user_data = {
            'name': name,
            'username': username,
            'email': email,
            'password_hash': generate_password_hash(password).decode('utf-8'),
            'role': role,
            'created_at': datetime.utcnow(),
            'is_active': True,
            'last_login': None
        }
        
        result = User.collection.insert_one(user_data)
        return str(result.inserted_id)
    
    @staticmethod
    def get_by_id(user_id):
        """Get user by ID"""
        return User.collection.find_one({'_id': ObjectId(user_id)})
    
    @staticmethod
    def get_all_users():
        """Get all users (admin only)"""
        users = list(User.collection.find({}, {'password_hash': 0}))
        for user in users:
            user['_id'] = str(user['_id'])
        return users

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

    @staticmethod
    def delete_user(user_id):
        """Hard delete user from the system"""
        result = User.collection.delete_one({'_id': ObjectId(user_id)})
        return result.deleted_count > 0

    @staticmethod
    def set_otp(email, otp_code):
        """Securely hash and store a 6-digit OTP with a 5-minute expiry"""
        user = User.collection.find_one({'email': email})
        if not user:
            return False
            
        otp_hash = generate_password_hash(otp_code).decode('utf-8')
        expiry = datetime.utcnow() + timedelta(minutes=5)
        
        result = User.collection.update_one(
            {'_id': user['_id']},
            {'$set': {'otp_hash': otp_hash, 'otp_expiry': expiry}}
        )
        return result.modified_count > 0

    @staticmethod
    def verify_otp(email, otp_code):
        """Verify an OTP against the hash and enforce expiry"""
        user = User.collection.find_one({'email': email})
        if not user:
            return None
            
        # Check expiry constraint
        if not user.get('otp_expiry') or datetime.utcnow() > user['otp_expiry']:
            return None
            
        # Validate hash payload
        if user.get('otp_hash') and check_password_hash(user['otp_hash'], otp_code):
            # Clear the OTP fields and bump last login sequence
            User.collection.update_one(
                {'_id': user['_id']},
                {
                    '$unset': {'otp_hash': "", 'otp_expiry': ""},
                    '$set': {'last_login': datetime.utcnow()}
                }
            )
            return user
        return None

class Prediction:
    collection = db.get_collection('load_predictions')
    
    @staticmethod
    def save_prediction(user_id, time_slot, predicted_load, action, confidence=None, recommendation_message=None, confidence_score=None):
        """Save a prediction result to MongoDB."""
        prediction_data = {
            'user_id': ObjectId(user_id) if user_id else None,
            'time_slot': time_slot,
            'predicted_load': predicted_load,
            'action': action,
            'confidence': confidence,
            'recommendation_message': recommendation_message,
            'confidence_score': confidence_score,
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
            {'$facet': {
                'total_predictions': [{'$count': 'count'}],
                'avg_load': [{'$group': {'_id': None, 'avg': {'$avg': '$predicted_load'}}}],
                'action_counts': [{'$group': {'_id': '$action', 'count': {'$sum': 1}}}, {'$project': {'action': '$_id', 'count': 1, '_id': 0}}],
                'daily_trend': [{'$group': {'_id': {'$dateToString': {'format': '%Y-%m-%d', 'date': '$timestamp'}}, 'avg_load': {'$avg': '$predicted_load'}}}, {'$sort': {'_id': 1}}, {'$project': {'date': '$_id', 'avg_load': 1, '_id': 0}}]
            }},
            {'$project': {
                'total_predictions': {'$arrayElemAt': ['$total_predictions.count', 0]},
                'avg_load': {'$arrayElemAt': ['$avg_load.avg', 0]},
                'action_counts': '$action_counts',
                'daily_trend': '$daily_trend'
            }}
        ]
        
        result = list(Prediction.collection.aggregate(pipeline))
        
        # Format the output
        stats = {
            'total_predictions': 0,
            'avg_load': 0,
            'action_counts': {},
            'daily_trend': []
        }
        
        if result:
            data = result[0]
            stats['total_predictions'] = data.get('total_predictions', 0)
            stats['avg_load'] = data.get('avg_load', 0)
            
            # Rebuilt specifically to satisfy Pyre typing on the nested dict
            ac_map = {}
            for action in data.get('action_counts', []):
                ac_map[action['action']] = action['count']
            stats['action_counts'] = ac_map
            
            stats['daily_trend'] = data.get('daily_trend', [])
            
        return stats

    @classmethod
    def get_smart_insights(cls, user_id=None, days=30):
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
        mid_date = end_date - timedelta(days=days/2)
        
        match_query = {'timestamp': {'$gte': start_date}}
        if user_id:
            match_query['user_id'] = ObjectId(user_id)
            
        # Peak Usage Time
        peak_time_pipeline = [
            {'$match': match_query},
            {'$group': {'_id': '$time_slot', 'avg_load': {'$avg': '$predicted_load'}}},
            {'$sort': {'avg_load': -1}},
            {'$limit': 1}
        ]
        peak_result = list(cls.collection.aggregate(peak_time_pipeline))
        peak_time = f"{int(peak_result[0]['_id']):02d}:00" if peak_result and peak_result[0]['_id'] is not None else "N/A"
        
        # Most Frequent Action
        action_pipeline = [
            {'$match': match_query},
            {'$group': {'_id': '$action', 'count': {'$sum': 1}}},
            {'$sort': {'count': -1}},
            {'$limit': 1}
        ]
        action_result = list(cls.collection.aggregate(action_pipeline))
        frequent_action = action_result[0]['_id'] if action_result else "N/A"
        
        # Trend comparison
        recent_match = match_query.copy()
        recent_match['timestamp'] = {'$gte': mid_date}
        recent_avg = list(cls.collection.aggregate([{'$match': recent_match}, {'$group': {'_id': None, 'avg': {'$avg': '$predicted_load'}}}] ))
        
        older_match = match_query.copy()
        older_match['timestamp'] = {'$gte': start_date, '$lt': mid_date}
        older_avg = list(cls.collection.aggregate([{'$match': older_match}, {'$group': {'_id': None, 'avg': {'$avg': '$predicted_load'}}}] ))
        
        r_avg = recent_avg[0]['avg'] if recent_avg else 0
        o_avg = older_avg[0]['avg'] if older_avg else 0
        
        trend = "Stable"
        if r_avg > o_avg * 1.05:
            trend = "Increasing"
        elif r_avg < o_avg * 0.95:
            trend = "Decreasing"
            
        return {
            'peak_time': peak_time,
            'frequent_action': frequent_action,
            'trend': trend
        }

    @classmethod
    def get_latest_prediction(cls, user_id=None):
        match_query = {}
        if user_id:
            from bson import ObjectId # type: ignore
            match_query['user_id'] = ObjectId(user_id)
        
        # Optimize by just pulling the very latest document
        pipeline = [
            {'$match': match_query},
            {'$sort': {'timestamp': -1}},
            {'$limit': 1},
            {'$project': {'_id': 0, 'user_id': 0}}
        ]
        
        result = list(cls.collection.aggregate(pipeline))
        if result:
            latest = result[0]
            if isinstance(latest.get('timestamp'), str) == False and latest.get('timestamp') is not None:
                latest['timestamp'] = latest['timestamp'].isoformat()
            return latest
        return None

    @staticmethod
    def fetch_all_predictions(limit=100, skip=0, user_id=None, filters=None):
        """Fetch predictions for history table with advanced filtering and pagination."""
        query = {}
        if user_id:
            query['user_id'] = ObjectId(user_id)
            
        if filters:
            if filters.get('action') and filters['action'] != 'ALL':
                query['action'] = filters['action']
                
            if filters.get('start_date') or filters.get('end_date'):
                date_q = {}
                if filters.get('start_date'):
                    try: date_q['$gte'] = datetime.fromisoformat(filters['start_date'].replace('Z', '+00:00'))
                    except ValueError: pass
                if filters.get('end_date'):
                    try: date_q['$lte'] = datetime.fromisoformat(filters['end_date'].replace('Z', '+00:00'))
                    except ValueError: pass
                if date_q:
                    query['timestamp'] = date_q
                    
            if filters.get('min_load') is not None or filters.get('max_load') is not None:
                load_q = {}
                if filters.get('min_load') not in [None, '']:
                    try: load_q['$gte'] = float(filters['min_load'])
                    except ValueError: pass
                if filters.get('max_load') not in [None, '']:
                    try: load_q['$lte'] = float(filters['max_load'])
                    except ValueError: pass
                if load_q:
                    query['predicted_load'] = load_q
                    
            if filters.get('search'):
                search_term = filters['search']
                query['$or'] = [
                    {'action': {'$regex': search_term, '$options': 'i'}},
                    {'recommendation_message': {'$regex': search_term, '$options': 'i'}}
                ]
                
        total_count = Prediction.collection.count_documents(query)
        cursor = Prediction.collection.find(query, {'user_id': 0}).sort('timestamp', -1).skip(skip).limit(limit)
        
        return {
            'items': Prediction._serialize_many(cursor),
            'total_count': total_count
        }

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
            {'$group': {
                '_id': None, 
                'avg_load': {'$avg': '$predicted_load'}, 
                'avg_confidence': {'$avg': '$confidence'},
                'count': {'$sum': 1}
            }}
        ])
        avg_stats = next(avg_doc, {'avg_load': 0, 'avg_confidence': 0, 'count': 0})

        # Advanced peak load detection using native sorting
        peak_doc = Prediction.collection.find_one(match, sort=[('predicted_load', -1)])
        peak_load = peak_doc['predicted_load'] if peak_doc else 0
        peak_time = peak_doc['timestamp'].isoformat() if peak_doc else None

        from ml_service import ml_service # type: ignore
        active_model = ml_service.model_metrics.get('active', {})

        return {
            'action_counts': actions,
            'trend': trend,
            'avg_load': avg_stats.get('avg_load', 0),
            'avg_confidence': avg_stats.get('avg_confidence', 0),
            'total_predictions': avg_stats.get('count', 0),
            'peak_load': peak_load,
            'peak_time': peak_time,
            'model_name': active_model.get('name', 'linear_regression').replace('_', ' ').title(),
            'model_accuracy': round(active_model.get('r2_score', 0.85) * 100, 2)
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

class AuditLog:
    collection = db.get_collection('audit_logs')
    
    @staticmethod
    def log_action(user_id, username, action, details=None):
        log_entry = {
            'user_id': ObjectId(user_id) if user_id and user_id != 'system' else None,
            'username': username,
            'action': action,
            'details': details or {},
            'timestamp': datetime.utcnow()
        }
        AuditLog.collection.insert_one(log_entry)
        
    @staticmethod
    def get_logs(limit=100, action_filter=None):
        query = {}
        if action_filter and action_filter != 'All':
            query['action'] = action_filter
            
        logs = list(AuditLog.collection.find(query).sort('timestamp', -1).limit(limit))
        for log in logs:
            log['_id'] = str(log['_id'])
            if log.get('user_id'):
                log['user_id'] = str(log['user_id'])
            if isinstance(log.get('timestamp'), datetime):
                log['timestamp'] = log['timestamp'].isoformat()
        return logs

class AutoPredictionConfig:
    collection = db.get_collection('scheduler_config')
    
    @staticmethod
    def get_config():
        config = AutoPredictionConfig.collection.find_one({'_id': 'unique_scheduler_config'})
        if not config:
            config = {
                '_id': 'unique_scheduler_config',
                'is_enabled': False,
                'interval_minutes': 15,
                'last_run': None,
                'next_run': None
            }
            AutoPredictionConfig.collection.insert_one(config)
        return config
        
    @staticmethod
    def update_config(data):
        AutoPredictionConfig.collection.update_one(
            {'_id': 'unique_scheduler_config'},
            {'$set': data},
            upsert=True
        )
        return AutoPredictionConfig.get_config()

# Create default admin user
def create_default_admin():
    """Create default admin user if not exists"""
    if not User.collection.find_one({'role': 'admin'}):
        User.create_user('admin', 'admin@cloudload.com', 'admin123', 'admin')
        print("Default admin user created: admin/admin123")

# Initialize default data
create_default_admin()