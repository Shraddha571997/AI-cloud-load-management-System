from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, create_refresh_token, jwt_required, get_jwt_identity
from flask_mail import Mail, Message
from ml_service import ml_service
from models import User
from config import Config
import os, random, string

app = Flask(__name__, static_folder="../frontend")
app.config.from_object(Config)
CORS(app, origins=["https://main.d3oggv2kwo5mv2.amplifyapp.com"])

jwt = JWTManager(app)
mail = Mail(app)

# ── OTP store (in-memory; fine for single-instance) ──
_otp_store = {}

@app.route("/api/auth/send-otp", methods=["POST"])
def send_otp():
    data = request.get_json()
    email = data.get("email")
    if not email:
        return jsonify({"message": "Email required"}), 400

    user = User.get_by_email(email)
    if not user:
        return jsonify({"message": "No account with that email"}), 404

    otp = "".join(random.choices(string.digits, k=6))
    _otp_store[email] = otp

    try:
        msg = Message("Your Login OTP", recipients=[email])
        msg.body = f"Your OTP is: {otp}  (expires in 10 minutes)"
        mail.send(msg)
    except Exception as e:
        print(f"Mail error: {e}")
        return jsonify({"message": "Failed to send OTP email"}), 500

    return jsonify({"message": "OTP sent"}), 200


@app.route("/api/auth/verify-otp", methods=["POST"])
def verify_otp():
    data = request.get_json()
    email = data.get("email")
    otp   = data.get("otp")

    if _otp_store.get(email) != otp:
        return jsonify({"message": "Invalid or expired OTP"}), 401

    _otp_store.pop(email, None)
    user = User.get_by_email(email)
    access_token  = create_access_token(identity=str(user["_id"]))
    refresh_token = create_refresh_token(identity=str(user["_id"]))

    return jsonify({
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": {"email": email, "role": user.get("role", "user")}
    }), 200
