from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, create_refresh_token, get_jwt_identity
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_mail import Mail, Message
from config import Config
from models import User, Prediction, SystemMetrics
from auth import token_required, admin_required, log_api_metrics
from monitor import monitor
from ml_service import ml_service
from scaling import scale_decision, get_scaling_recommendations
import os
from datetime import datetime, timedelta

app = Flask(__name__, static_folder="../frontend")
app.config.from_object(Config)

# Initialize extensions
CORS(app)
jwt = JWTManager(app)
mail = Mail(app)
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["2000 per day", "500 per hour"]
)
limiter.init_app(app)

# Routes
@app.route("/")
def home():
    return send_from_directory(app.static_folder, "index.html")

# Authentication Routes
@app.route("/api/auth/register", methods=["POST"])
@limiter.limit("5 per minute")
@log_api_metrics
def register():
    data = request.get_json()
    
    if not data or not all(k in data for k in ('username', 'email', 'password')):
        return jsonify({'message': 'Missing required fields'}), 400
    
    user_id = User.create_user(
        username=data['username'],
        email=data['email'],
        password=data['password']
    )
    
    if user_id:
        return jsonify({
            'message': 'User created successfully',
            'user_id': user_id
        }), 201
    else:
        return jsonify({'message': 'Username or email already exists'}), 409

@app.route("/api/auth/login", methods=["POST"])
@limiter.limit("10 per minute")
@log_api_metrics
def login():
    data = request.get_json()
    
    if not data or not all(k in data for k in ('username', 'password')):
        return jsonify({'message': 'Missing username or password'}), 400
    
    user = User.authenticate(data['username'], data['password'])
    
    if user:
        access_token = create_access_token(identity=str(user['_id']))
        refresh_token = create_refresh_token(identity=str(user['_id']))
        
        return jsonify({
            'access_token': access_token,
            'refresh_token': refresh_token,
            'user': {
                'id': str(user['_id']),
                'username': user['username'],
                'email': user['email'],
                'role': user['role'],
                'phone': user.get('phone'),
                'preferences': user.get('preferences')
            }
        }), 200
    else:
        return jsonify({'message': 'Invalid credentials'}), 401

@app.route("/api/auth/refresh", methods=["POST"])
@token_required
@log_api_metrics
def refresh(current_user):
    access_token = create_access_token(identity=str(current_user['_id']))
    return jsonify({'access_token': access_token}), 200

# User Profile Route
@app.route("/api/user/profile", methods=["PUT"])
@token_required
@log_api_metrics
def update_profile(current_user):
    data = request.get_json()
    success = User.update_user(str(current_user['_id']), data)
    
    if success:
        user = User.get_by_id(str(current_user['_id']))
        return jsonify({
            'message': 'Profile updated',
            'user': {
                'id': str(user['_id']),
                'username': user['username'],
                'email': user['email'],
                'role': user['role'],
                'phone': user.get('phone'),
                'preferences': user.get('preferences')
            }
        }), 200
    else:
        return jsonify({'message': 'Failed to update profile'}), 400

# System Realtime Route
@app.route("/api/system/realtime", methods=["GET"])
@token_required
def system_realtime(current_user):
    health_data = monitor.get_system_health()
    network = monitor.get_network_stats()
    
    return jsonify({
        'memory_percent': health_data['memory_usage'],
        'cpu_percent': health_data['cpu_load'],
        'status': health_data['status'],
        'is_real_data': health_data['is_real_data'],
        'bytes_sent': network['bytes_sent'],
        'bytes_recv': network['bytes_recv']
    }), 200

# Prediction Routes
@app.route("/api/predict/<int:time>", methods=["GET"])
@token_required
@limiter.limit("30 per minute")
@log_api_metrics
def predict(current_user, time):
    if time < 0 or time > 23:
        return jsonify({'message': 'Time slot must be between 0 and 23'}), 400

    prediction_result = ml_service.predict_load(time)
    
    if not prediction_result:
        return jsonify({'message': 'Prediction service unavailable'}), 503
    
    predicted_load = prediction_result['predicted_load']
    confidence = prediction_result['confidence']
    
    
    # Get scaling decision
    action = scale_decision(predicted_load)
    recommendations = get_scaling_recommendations(predicted_load, confidence)
    
    # Anomaly Detection (Real vs Predicted)
    current_real_load = monitor.get_cpu_load()
    anomaly = ml_service.detect_anomaly(current_real_load, predicted_load)
    
    # Save prediction to database
    Prediction.save_prediction(
        user_id=str(current_user['_id']),
        time_slot=time,
        predicted_load=predicted_load,
        action=action,
        confidence=confidence
    )
    
    return jsonify({
        'time_slot': time,
        'predicted_cpu_load': predicted_load,
        'current_real_load': current_real_load,
        'anomaly_status': anomaly,
        'confidence': confidence,
        'action': action,
        'recommendations': recommendations,
        'model_info': prediction_result.get('model_used', 'random_forest'),
        'timestamp': prediction_result.get('timestamp')
    }), 200

@app.route("/api/predict/batch", methods=["POST"])
@token_required
@limiter.limit("10 per minute")
@log_api_metrics
def batch_predict(current_user):
    data = request.get_json()
    
    if not data or 'time_slots' not in data:
        return jsonify({'message': 'Missing time_slots array'}), 400
    
    time_slots = data['time_slots']
    if len(time_slots) > 24:  # Limit batch size
        return jsonify({'message': 'Maximum 24 time slots allowed'}), 400
    if any(slot < 0 or slot > 23 for slot in time_slots):
        return jsonify({'message': 'Time slots must be between 0 and 23'}), 400
    
    predictions = ml_service.batch_predict(time_slots)
    
    # Add scaling decisions
    for pred in predictions:
        pred['action'] = scale_decision(pred['predicted_load'])
        pred['recommendations'] = get_scaling_recommendations(
            pred['predicted_load'], 
            pred['confidence']
        )
    
    return jsonify({'predictions': predictions}), 200


# History Route
@app.route("/api/history", methods=["GET"])
@token_required
@log_api_metrics
def history(current_user):
    limit = min(int(request.args.get('limit', 50)), 200)
    scope = request.args.get('scope', 'user')
    target_user = None

    if scope != 'all' or current_user.get('role') != 'admin':
        target_user = str(current_user['_id'])

    predictions = Prediction.fetch_all_predictions(limit=limit, user_id=target_user)

    return jsonify({
        'items': predictions,
        'count': len(predictions)
    }), 200

# Stats Routes
@app.route("/api/stats", methods=["GET"])
@token_required
@log_api_metrics
def stats(current_user):
    days = int(request.args.get('days', 30))
    scope = request.args.get('scope', 'user')
    target_user = None

    if scope != 'all' or current_user.get('role') != 'admin':
        target_user = str(current_user['_id'])

    stats_payload = Prediction.get_stats(days=days, user_id=target_user)
    latest = Prediction.fetch_latest_prediction(user_id=target_user)

    return jsonify({
        'stats': stats_payload,
        'latest_prediction': latest
    }), 200

# Admin Routes
@app.route("/api/admin/users", methods=["GET"])
@admin_required
@log_api_metrics
def get_all_users(current_user):
    users = User.get_all_users()
    return jsonify({'users': users}), 200

@app.route("/api/admin/retrain-model", methods=["POST"])
@admin_required
@limiter.limit("1 per hour")
@log_api_metrics
def retrain_model(current_user):
    result = ml_service.retrain_model()
    return jsonify(result), 200 if result['success'] else 500

@app.route("/api/admin/system-stats", methods=["GET"])
@admin_required
@log_api_metrics
def system_statistics(current_user):
    stats = SystemMetrics.get_system_stats()
    model_info = ml_service.get_model_info()
    
    return jsonify({
        'system_performance': stats,
        'model_information': model_info,
        'server_time': datetime.utcnow().isoformat()
    }), 200

# Health Check
@app.route("/api/health", methods=["GET"])
@log_api_metrics
def health_check():
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.utcnow().isoformat(),
        'version': '1.0.0'
    }), 200

# Error Handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({'message': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'message': 'Internal server error'}), 500

@app.errorhandler(429)
def ratelimit_handler(e):
    return jsonify({'message': 'Rate limit exceeded', 'retry_after': str(e.retry_after)}), 429

if __name__ == "__main__":
    app.run(debug=True, host='0.0.0.0', port=5000)
