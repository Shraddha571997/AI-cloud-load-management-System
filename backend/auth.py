from functools import wraps
from flask import request, jsonify, current_app
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity, get_jwt
from models import User
import time

def token_required(f):
    """Decorator to require valid JWT token"""
    @wraps(f)
    def decorated(*args, **kwargs):
        try:
            verify_jwt_in_request()
            current_user_id = get_jwt_identity()
            current_user = User.get_by_id(current_user_id)
        except Exception as e:
            return jsonify({'message': 'Token is invalid'}), 401
            
        if not current_user or not current_user.get('is_active'):
            return jsonify({'message': 'Invalid or inactive user'}), 401
            
        return f(current_user, *args, **kwargs)
    
    return decorated

def admin_required(f):
    """Decorator to require admin role"""
    @wraps(f)
    def decorated(*args, **kwargs):
        try:
            verify_jwt_in_request()
            current_user_id = get_jwt_identity()
            current_user = User.get_by_id(current_user_id)
        except Exception as e:
            return jsonify({'message': 'Token is invalid'}), 401
            
        if not current_user or current_user.get('role') != 'admin':
            return jsonify({'message': 'Admin access required'}), 403
            
        return f(current_user, *args, **kwargs)
    
    return decorated

def log_api_metrics(f):
    """Decorator to log API call metrics"""
    @wraps(f)
    def decorated(*args, **kwargs):
        start_time = time.time()
        
        try:
            # Try to get current user
            try:
                verify_jwt_in_request(optional=True)
                user_id = get_jwt_identity()
            except:
                user_id = None
            
            response = f(*args, **kwargs)
            response_time = time.time() - start_time
            
            # Log metrics
            from models import SystemMetrics
            status_code = response[1] if isinstance(response, tuple) else 200
            SystemMetrics.log_api_call(
                endpoint=request.endpoint,
                user_id=user_id,
                response_time=response_time,
                status_code=status_code
            )
            
            return response
            
        except Exception as e:
            response_time = time.time() - start_time
            # Log error metrics
            from models import SystemMetrics
            SystemMetrics.log_api_call(
                endpoint=request.endpoint,
                user_id=None,
                response_time=response_time,
                status_code=500
            )
            raise e
    
    return decorated