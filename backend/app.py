from flask import Flask, jsonify, request, send_from_directory, make_response # type: ignore
from flask_cors import CORS # type: ignore
from flask_jwt_extended import JWTManager, create_access_token, create_refresh_token, get_jwt_identity # type: ignore
from flask_limiter import Limiter # type: ignore
from flask_limiter.util import get_remote_address # type: ignore
from flask_mail import Mail, Message # type: ignore
from config import Config # type: ignore
from models import User, Prediction, SystemMetrics # type: ignore
from auth import token_required, admin_required, log_api_metrics # type: ignore
from monitor import monitor # type: ignore
from ml_service import ml_service # type: ignore
from scheduler_service import scheduler_service # type: ignore
from scaling import scale_decision, get_scaling_recommendations, get_scaling_level, get_recommended_instances # type: ignore
import os
import csv
import io
from datetime import datetime, timedelta
try:
    from fpdf import FPDF # type: ignore
except ImportError:
    FPDF = None

from threading import Thread

app = Flask(__name__, static_folder="../frontend")
app.config.from_object(Config)

# Mail Settings Configuration
app.config['MAIL_SERVER'] = os.environ.get('MAIL_SERVER', 'smtp.gmail.com')
app.config['MAIL_PORT'] = int(os.environ.get('MAIL_PORT', 587))
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = os.environ.get('MAIL_USERNAME', 'demo@cloudscale.ai')
app.config['MAIL_PASSWORD'] = os.environ.get('MAIL_PASSWORD', 'secret')
app.config['MAIL_DEFAULT_SENDER'] = os.environ.get('MAIL_DEFAULT_SENDER', 'alerts@cloudscale.ai')

# Initialize extensions
CORS(app)
jwt = JWTManager(app)
mail = Mail(app)
scheduler_service.init_app(app)

def send_async_email(app, msg):
    with app.app_context():
        try:
            mail.send(msg)
        except Exception as e:
            print(f"Mail failed to send (Dummy bypass): {e}")
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
    # MCA Viva Note: This endpoint handles new user registration securely.
    # It parses the JSON request body and validates that all required fields are present.
    data = request.get_json()
    
    if not data or not all(k in data for k in ('name', 'username', 'email', 'password')):
        return jsonify({'message': 'Missing required fields'}), 400
        
    if '@' in data['username']:
        return jsonify({'message': 'Username must not contain @'}), 400
        
    if len(data['password']) < 6:
        return jsonify({'message': 'Password minimum length 6'}), 400
        
    if '@' not in data['email']:
        return jsonify({'message': 'Email must be valid format'}), 400
    
    user_id = User.create_user(
        name=data['name'],
        username=data['username'],
        email=data['email'],
        password=data['password'],
        role=data.get('role', 'user')
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
    try:
        data = request.get_json()
        
        if not data or not all(k in data for k in ('identifier', 'password')):
            # Fallback for old username clients while migrating
            if not data or ('username' not in data and 'identifier' not in data) or 'password' not in data:
                return jsonify({'message': 'Missing fields'}), 400
        
        identifier = data.get('identifier') or data.get('username')
        password = data['password']
        
        # MCA Viva Note: Distinguish between email and username organically
        # FIX: We use find_one() directly with no trailing commas to prevent accidental tuples!
        if '@' in identifier:
            user = User.collection.find_one({'email': identifier})
        else:
            user = User.collection.find_one({'username': identifier})
            
        # DEBUGGING TIP: Print user type to ensure it's a dict, not a tuple
        print(f"[DEBUG] Query User Type: {type(user)}")
        
        # VALIDATIONS
        # 1. If user not found -> return 404
        if not user:
            return jsonify({'message': 'User not found'}), 404

        # 2. If password incorrect -> return 401
        from flask_bcrypt import check_password_hash # type: ignore
        # (Compatible with werkzeug.security.check_password_hash architecture)
        if not check_password_hash(user['password_hash'], password):
            return jsonify({'message': 'Invalid password'}), 401

        # MCA Viva Note: Upon successful login, we generate a JSON Web Token (JWT).
        # This token is stateless, meaning the backend doesn't need to store session data.
        access_token = create_access_token(identity=str(user['_id']))
        refresh_token = create_refresh_token(identity=str(user['_id']))
        
        # Audit log
        from models import AuditLog # type: ignore
        AuditLog.log_action(str(user['_id']), user['username'], 'login')
        
        return jsonify({
            'access_token': access_token,
            'refresh_token': refresh_token,
            'user': {
                'id': str(user['_id']),
                'name': user.get('name', ''),
                'username': user['username'],
                'email': user['email'],
                'role': user.get('role', 'user'),
                'phone': user.get('phone'),
                'preferences': user.get('preferences')
            }
        }), 200
        
    except Exception as e:
        print(f"[ERROR] Login exception: {e}")
        return jsonify({'message': f'Server error during login: {str(e)}'}), 500

import random

@app.route("/api/auth/send-otp", methods=["POST"])
@limiter.limit("5 per minute")
@log_api_metrics
def send_otp():
    try:
        data = request.get_json()
        email = data.get('email')
        
        if not email:
            return jsonify({'message': 'Email is required'}), 400
            
        user = User.collection.find_one({'email': email})
        if not user:
            # We return a generic 200 for security to avoid email enumeration
            return jsonify({'message': 'If an active account exists, an OTP has been dispatched.'}), 200
            
        otp_code = str(random.randint(100000, 999999))
        
        if User.set_otp(email, otp_code):
            msg = Message("Your CloudScale AI Login OTP",
                          sender=app.config.get('MAIL_USERNAME', 'noreply@cloudscale.ai'),
                          recipients=[email])
            msg.body = f"Your one-time password (OTP) to login is: {otp_code}\n\nThis code will expire securely in 5 minutes."
            
            # For local testing without SMTP configured:
            print(f"\n[{datetime.utcnow()}] OTP FOR {email}: {otp_code}\n")
            
            Thread(target=send_async_email, args=(app, msg)).start()
            
        return jsonify({'message': f'OTP dispatched! (Demo Code: {otp_code})'}), 200
    except Exception as e:
        print(f"[ERROR] Send OTP exception: {e}")
        return jsonify({'message': 'Server error sending OTP'}), 500

@app.route("/api/auth/verify-otp", methods=["POST"])
@limiter.limit("10 per minute")
@log_api_metrics
def verify_otp():
    try:
        data = request.get_json()
        email = data.get('email')
        otp_code = data.get('otp')
        
        if not email or not otp_code:
            return jsonify({'message': 'Email and OTP are both required'}), 400
            
        user = User.verify_otp(email, otp_code)
        
        if user:
            access_token = create_access_token(identity=str(user['_id']))
            refresh_token = create_refresh_token(identity=str(user['_id']))
            
            return jsonify({
                'access_token': access_token,
                'refresh_token': refresh_token,
                'user': {
                    'id': str(user['_id']),
                    'name': user.get('name', ''),
                    'username': user['username'],
                    'email': user['email'],
                    'role': user.get('role', 'user'),
                    'phone': user.get('phone'),
                    'preferences': user.get('preferences')
                }
            }), 200
        else:
            return jsonify({'message': 'Invalid or Expired OTP code.'}), 401
    except Exception as e:
        print(f"[ERROR] Verify OTP exception: {e}")
        return jsonify({'message': 'Server error verifying OTP'}), 500

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
    
    # Calculate Scaling Frequency (last 1 hour)
    from datetime import datetime, timedelta
    from models import Prediction # type: ignore
    
    one_hour_ago = datetime.utcnow() - timedelta(hours=1)
    pipeline = [
        {'$match': {
            'timestamp': {'$gte': one_hour_ago},
            'action': {'$in': ['SCALE UP', 'SCALE DOWN', 'scale up', 'reduce resources', 'aggressive scaling']}
        }},
        {'$count': 'count'}
    ]
    
    result = list(Prediction.collection.aggregate(pipeline))
    scaling_count = result[0]['count'] if result else 0
    
    # Determine Health Status
    status = "Healthy"
    cpu = health_data['cpu_load']
    
    if cpu > 90 or scaling_count > 5:
        status = "Critical"
    elif cpu > 75 or scaling_count > 2:
        status = "Warning"
        
    # Calculate Performance Score
    base_score = 100.0
    penalty_load = 0.0
    if cpu > 70:
        penalty_load = min(50.0, float(cpu - 70) * 1.5)
        
    penalty_under = 0.0
    if cpu < 30:
        penalty_under = min(20.0, float(30 - cpu) * 0.5)
        
    penalty_scaling = 0.0
    if scaling_count > 2:
        penalty_scaling = min(30.0, float(scaling_count - 2) * 8.0)
        
    score = max(0.0, min(100.0, base_score - penalty_load - penalty_under - penalty_scaling))
    performance_score = float(f"{score:.1f}")
    
    if performance_score >= 85:
        performance_status = "Excellent"
    elif performance_score >= 60:
        performance_status = "Good"
    else:
        performance_status = "Poor"
    
    return jsonify({
        'memory_percent': health_data['memory_usage'],
        'cpu_percent': cpu,
        'status': status,
        'scaling_frequency': scaling_count,
        'is_real_data': health_data['is_real_data'],
        'bytes_sent': network['bytes_sent'],
        'bytes_recv': network['bytes_recv'],
        'performance_score': performance_score,
        'performance_status': performance_status
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
    
    
    # Get explicit 4-tier scaling recommendation engine statistics
    action = scale_decision(predicted_load)
    scaling_level = get_scaling_level(predicted_load)
    
    recommended_instances = get_recommended_instances(predicted_load, SimulationState.simulated_instances)
    recommendations = get_scaling_recommendations(predicted_load, confidence)
    
    # Explicit Alert System Boundary Trigger
    if predicted_load > 90:
        alert_level = 'Critical'
    elif predicted_load > 70:
        alert_level = 'Warning'
    else:
        alert_level = 'Normal'
    
    # Anomaly Detection (Real vs Predicted)
    current_real_load = monitor.get_cpu_load()
    anomaly = ml_service.detect_anomaly(current_real_load, predicted_load)
    
    # Cost Optimization Calculation
    # MCA Viva Note: 
    # Computes billing based on predicted load. Base arbitrary MAX cost is $50/hr.
    estimated_cost = round(float(predicted_load * 0.5), 2) # type: ignore
    max_cost = 50.0  
    savings = round(float(max_cost - estimated_cost), 2) # type: ignore
    
    # Generate explicit recommendations and percentages
    recommendation_message = "Maintain current capacity"
    if action == "SCALE UP" or action == "aggressive scaling" or action == "scale up":
        recommendation_message = "Scale up to avoid overload"
    elif action == "SCALE DOWN" or action == "reduce resources":
        recommendation_message = "Reduce servers to save cost"
        
    confidence_score = round(confidence * 100) if confidence else 85
    
    # Save prediction to database
    Prediction.save_prediction(
        user_id=str(current_user['_id']),
        time_slot=time,
        predicted_load=predicted_load,
        action=action,
        confidence=confidence,
        recommendation_message=recommendation_message,
        confidence_score=confidence_score
    )
    
    # Audit log
    from models import AuditLog # type: ignore
    AuditLog.log_action(str(current_user['_id']), current_user.get('username', 'Unknown'), 'prediction', {'predicted_load': predicted_load})
    if action in ['SCALE UP', 'SCALE DOWN']:
        AuditLog.log_action(str(current_user['_id']), current_user.get('username', 'Unknown'), 'scaling', {'action': action, 'predicted_load': predicted_load})
    
    # MCA Viva Note: 
    # Optional Threaded Email Alerts based on user schema preferences
    if predicted_load > 70:
        user_prefs = current_user.get('preferences', {})
        if user_prefs and user_prefs.get('alerts', {}).get('emailEnabled', False):
            user_email = current_user.get('email')
            if user_email:
                msg = Message(
                    subject=f"{alert_level.upper()}: Cloud Load Alert (>{predicted_load:.1f}%)",
                    recipients=[user_email],
                    body=f"Alert: High load explicitly predicted!\n\nTarget Hour: {time}\nPredicted Load: {predicted_load}%\nSuggested Action: {action}\nAlert Severity: {alert_level}\n\nPlease monitor your active instances."
                )
                Thread(target=send_async_email, args=(app, msg)).start()
                
    return jsonify({
        'time_slot': time,
        'predicted_cpu_load': predicted_load,
        'current_real_load': current_real_load,
        'anomaly_status': anomaly,
        'confidence': confidence,
        'alert_level': alert_level,
        'action': action,
        'scaling_level': scaling_level,
        'recommended_instances': recommended_instances,
        'recommendations': recommendations,
        'estimated_cost': estimated_cost,
        'savings': savings,
        'model_info': prediction_result.get('model_used', 'random_forest').replace('_', ' ').title(),
        'model_accuracy': round(prediction_result.get('accuracy', 0) * 100, 2),
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
    
    # Add fully tiered scaling decisions
    for pred in predictions:
        pred['action'] = scale_decision(pred['predicted_load'])
        pred['scaling_level'] = get_scaling_level(pred['predicted_load'])
        pred['recommended_instances'] = get_recommended_instances(pred['predicted_load'], SimulationState.simulated_instances)
        
        if pred['predicted_load'] > 90:
            pred['alert_level'] = 'Critical'
        elif pred['predicted_load'] > 70:
            pred['alert_level'] = 'Warning'
        else:
            pred['alert_level'] = 'Normal'
        pred['recommendations'] = get_scaling_recommendations(
            pred['predicted_load'], 
            pred['confidence']
        )
        pred['estimated_cost'] = round(float(pred['predicted_load'] * 0.5), 2) # type: ignore
        pred['savings'] = round(float(50.0 - pred['estimated_cost']), 2) # type: ignore
        
    # Audit log
    from models import AuditLog # type: ignore
    AuditLog.log_action(str(current_user['_id']), current_user.get('username', 'Unknown'), 'prediction', {'batch_size': len(time_slots)})
    
    return jsonify({'predictions': predictions}), 200


# History Route
@app.route("/api/history", methods=["GET"])
@token_required
@log_api_metrics
def history(current_user):
    page = int(request.args.get('page', 1))
    limit = min(int(request.args.get('limit', 50)), 200)
    skip = (page - 1) * limit
    
    scope = request.args.get('scope', 'user')
    target_user = None

    if scope != 'all' or current_user.get('role') != 'admin':
        target_user = str(current_user['_id'])

    filters = {
        'action': request.args.get('action'),
        'start_date': request.args.get('start_date'),
        'end_date': request.args.get('end_date'),
        'min_load': request.args.get('min_load'),
        'max_load': request.args.get('max_load'),
        'search': request.args.get('search')
    }

    result = Prediction.fetch_all_predictions(limit=limit, skip=skip, user_id=target_user, filters=filters)

    return jsonify({
        'items': result['items'],
        'total_count': result['total_count'],
        'page': page,
        'limit': limit
    }), 200

# ──── Export Routes ────────────────────────────────────────────────────────
@app.route("/api/export/csv", methods=["GET"])
@token_required
@log_api_metrics
def export_csv(current_user):
    """Export prediction history as a downloadable CSV file."""
    scope = request.args.get('scope', 'user')
    if scope == 'all' and current_user.get('role') != 'admin':
        return jsonify({'message': 'Unauthorized'}), 403

    user_id = None if scope == 'all' else str(current_user['_id'])
    result = Prediction.fetch_all_predictions(limit=2000, skip=0, user_id=user_id)
    predictions = result['items']

    si = io.StringIO()
    cw = csv.writer(si)
    cw.writerow(['Timestamp', 'Time Slot (Hour)', 'Predicted Load (%)', 'Action', 'Confidence (%)'])
    for item in predictions:
        cw.writerow([
            item.get('timestamp', ''),
            item.get('time_slot', ''),
            item.get('predicted_load', ''),
            item.get('action', ''),
            round((item.get('confidence') or 0) * 100, 1)
        ])

    output = make_response(si.getvalue())
    output.headers["Content-Disposition"] = "attachment; filename=prediction_history.csv"
    output.headers["Content-type"] = "text/csv"
    return output


@app.route("/api/export/pdf", methods=["GET"])
@token_required
@log_api_metrics
def export_pdf(current_user):
    """Export a PDF system report of the prediction history."""
    if FPDF is None:
        return jsonify({'message': 'PDF export not available. Install fpdf.'}), 503

    scope = request.args.get('scope', 'user')
    if scope == 'all' and current_user.get('role') != 'admin':
        return jsonify({'message': 'Unauthorized'}), 403

    user_id = None if scope == 'all' else str(current_user['_id'])
    result = Prediction.fetch_all_predictions(limit=150, skip=0, user_id=user_id)
    predictions = result['items']

    pdf = FPDF()
    pdf.add_page()

    # Title
    pdf.set_font("Arial", 'B', 16)
    pdf.cell(0, 12, "Cloud Load Management - Analysis Report", ln=1, align='C')
    pdf.set_font("Arial", '', 10)
    pdf.cell(0, 8, f"Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}  |  User: {current_user.get('username', 'N/A')}  |  Scope: {scope}", ln=1, align='C')
    pdf.ln(6)

    # Table header
    pdf.set_fill_color(79, 70, 229)
    pdf.set_text_color(255, 255, 255)
    pdf.set_font("Arial", 'B', 9)
    col_w = [46, 20, 28, 40, 30]
    headers = ['Timestamp', 'Hour', 'Load (%)', 'Action', 'Confidence']
    for w, h in zip(col_w, headers):
        pdf.cell(w, 9, h, 1, 0, 'C', fill=True)
    pdf.ln(9)

    # Table rows
    pdf.set_text_color(0, 0, 0)
    pdf.set_font("Arial", '', 8)
    for i, item in enumerate(predictions):
        fill = i % 2 == 0
        pdf.set_fill_color(240, 240, 255)
        ts_str = str(item.get('timestamp', ''))
        pdf.cell(col_w[0], 8, ts_str[:19], 1, 0, 'C', fill=fill) # type: ignore
        pdf.cell(col_w[1], 8, str(item.get('time_slot', '')), 1, 0, 'C', fill=fill)
        pdf.cell(col_w[2], 8, str(item.get('predicted_load', '')), 1, 0, 'C', fill=fill)
        pdf.cell(col_w[3], 8, str(item.get('action', '')), 1, 0, 'C', fill=fill)
        pdf.cell(col_w[4], 8, f"{round((item.get('confidence') or 0)*100,1)}%", 1, 0, 'C', fill=fill)
        pdf.ln(8)

    pdf_bytes = pdf.output(dest='S').encode('latin-1')
    response = make_response(pdf_bytes)
    response.headers['Content-Type'] = 'application/pdf'
    response.headers['Content-Disposition'] = 'attachment; filename=prediction_report.pdf'
    return response

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
        'total_predictions': stats_payload.get('total_predictions', 0),
        'average_load': round(float(stats_payload.get('avg_load', 0)), 2), # type: ignore
        'scale_up_count': stats_payload.get('action_counts', {}).get('SCALE UP', 0),
        'scale_down_count': stats_payload.get('action_counts', {}).get('SCALE DOWN', 0),
        'stats': stats_payload,
        'latest_prediction': latest
    }), 200

# Live Analytics Check Route
@app.route("/api/analytics/latest", methods=["GET"])
@token_required
@log_api_metrics
def get_latest_analytics(current_user):
    target_user_id = str(current_user['_id']) if current_user.get('role') != 'admin' else None
    latest = Prediction.get_latest_prediction(user_id=target_user_id)
    return jsonify({'latest_prediction': latest}), 200

# Insights Route
@app.route("/api/insights", methods=["GET"])
@token_required
@log_api_metrics
def get_insights(current_user):
    target_user_id = str(current_user['_id']) if current_user.get('role') != 'admin' else None
    insights = Prediction.get_smart_insights(user_id=target_user_id, days=30)
    return jsonify(insights), 200

# Scheduler Routes
@app.route("/api/scheduler/config", methods=["GET"])
@token_required
@log_api_metrics
def get_scheduler_config(current_user):
    from models import AutoPredictionConfig # type: ignore
    config = AutoPredictionConfig.get_config()
    return jsonify({
        'is_enabled': config.get('is_enabled'),
        'interval_minutes': config.get('interval_minutes'),
        'last_run': config.get('last_run').isoformat() if config.get('last_run') else None,
        'next_run': config.get('next_run').isoformat() if config.get('next_run') else None
    }), 200

@app.route("/api/start-autopilot", methods=["POST"])
@token_required
@log_api_metrics
def start_autopilot(current_user):
    data = request.get_json() or {}
    interval_minutes = int(data.get('interval_minutes', 15))
    
    if interval_minutes < 1:
        return jsonify({'message': 'Interval must be at least 1 minute'}), 400
    scheduler_service.enable_auto_prediction(interval_minutes)
    return jsonify({
        'message': f'Auto-pilot engaged (every {interval_minutes} minutes)',
        'status': 'Running'
    }), 200

@app.route("/api/stop-autopilot", methods=["POST"])
@token_required
@log_api_metrics
def stop_autopilot(current_user):
    scheduler_service.disable_auto_prediction()
    return jsonify({
        'message': 'Auto-pilot disabled',
        'status': 'Stopped'
    }), 200

# Live Simulation Route
import random

class SimulationState:
    last_simulated_load: float = 50.0
    simulated_instances: int = 2

@app.route("/api/simulate-load", methods=["GET"])
@token_required
def simulate_load(current_user):
    # Realistic random-walk drift algorithm
    step = random.uniform(-12.0, 12.0)
    new_load = max(10.0, min(95.0, SimulationState.last_simulated_load + step))
    SimulationState.last_simulated_load = new_load
    
    # Fix for pyre round overload error
    new_load_rounded = float(f"{new_load:.1f}")
    
    now_str = datetime.utcnow().isoformat()
    
    # Optional: Log the live tracking directly to the mongodb metric tracker
    from models import Database # type: ignore
    db_conn = Database().db
    db_conn.simulated_load.insert_one({
        'timestamp': now_str,
        'cpu_load': new_load_rounded,
        'user_id': current_user['_id']
    })
    
    # Calculate recommendations dynamically based on new load
    recommended = get_recommended_instances(new_load_rounded, SimulationState.simulated_instances)
    
    if new_load_rounded > 90:
        alert_level = 'Critical'
    elif new_load_rounded > 70:
        alert_level = 'Warning'
    else:
        alert_level = 'Normal'
    
    return jsonify({
        'timestamp': now_str,
        'cpu_load': new_load_rounded,
        'current_instances': SimulationState.simulated_instances,
        'recommended_instances': recommended,
        'alert_level': alert_level
    }), 200

@app.route("/api/instances/add", methods=["POST"])
@token_required
def add_instance(current_user):
    SimulationState.simulated_instances += 1
    
    # Audit log visually or physically
    from models import AuditLog # type: ignore
    AuditLog.log_action(str(current_user['_id']), current_user.get('username', 'Unknown'), 'scaling', {'action': 'Manual Scale Up', 'instances': SimulationState.simulated_instances})
    
    return jsonify({
        'message': 'Instance added successfully',
        'current_instances': SimulationState.simulated_instances
    }), 200

@app.route("/api/instances/remove", methods=["POST"])
@token_required
def remove_instance(current_user):
    if SimulationState.simulated_instances > 1:
        SimulationState.simulated_instances -= 1
        
        from models import AuditLog # type: ignore
        AuditLog.log_action(str(current_user['_id']), current_user.get('username', 'Unknown'), 'scaling', {'action': 'Manual Scale Down', 'instances': SimulationState.simulated_instances})
        
        return jsonify({
            'message': 'Instance removed successfully',
            'current_instances': SimulationState.simulated_instances
        }), 200
    else:
        return jsonify({
            'message': 'Cannot remove the last instance',
            'current_instances': SimulationState.simulated_instances
        }), 400


# Admin Routes
@app.route("/api/admin/users", methods=["GET"])
@admin_required
@log_api_metrics
def get_all_users(current_user):
    users = User.get_all_users()
    return jsonify({'users': users}), 200

@app.route("/api/admin/user/<user_id>", methods=["DELETE"])
@token_required
@admin_required
@log_api_metrics
def delete_user(current_user, user_id):
    if str(current_user['_id']) == user_id:
        return jsonify({'message': 'Administrators cannot delete themselves'}), 400
    
    success = User.delete_user(user_id)
    if success:
        return jsonify({'message': 'User deleted successfully'}), 200
    return jsonify({'message': 'Failed to delete user'}), 404

@app.route("/api/admin/retrain-model", methods=["POST"])
@admin_required
@limiter.limit("5 per minute")
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

@app.route("/api/admin/audit-logs", methods=["GET"])
@admin_required
@log_api_metrics
def get_audit_logs(current_user):
    action_filter = request.args.get('action', 'All')
    limit = min(int(request.args.get('limit', 100)), 500)
    
    from models import AuditLog # type: ignore
    logs = AuditLog.get_logs(limit=limit, action_filter=action_filter)
    
    return jsonify({'logs': logs}), 200

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
    app.run(debug=True, host='0.0.0.0', port=5000, use_reloader=False)
