from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from ml_service import ml_service
import os

app = Flask(__name__, static_folder="../frontend")
CORS(app)

# -----------------------------
# FRONTEND SERVING
# -----------------------------
@app.route("/")
def home():
    return send_from_directory(app.static_folder, "index.html")

# -----------------------------
# HEALTH CHECK
# -----------------------------
@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "status": "running"
    }), 200

# -----------------------------
# PREDICT API (FINAL FIX)
# -----------------------------
@app.route("/api/predict", methods=["POST"])
def predict():
    try:
        data = request.get_json()
        time = data.get("time")

        if time is None:
            return jsonify({"message": "Time is required"}), 400

        if int(time) < 0 or int(time) > 23:
            return jsonify({"message": "Time must be between 0 and 23"}), 400

        # Call ML service
        result = ml_service.predict_load(int(time))

        if not result:
            return jsonify({"message": "Prediction failed"}), 500

        return jsonify({
            "time_slot": int(time),
            "predicted_cpu_load": result.get("predicted_load"),
            "confidence": result.get("confidence")
        }), 200

    except Exception as e:
        print(f"[ERROR] {e}")
        return jsonify({"message": "Server error"}), 500

# -----------------------------
# ERROR HANDLERS
# -----------------------------
@app.errorhandler(404)
def not_found(e):
    return jsonify({"message": "Endpoint not found"}), 404

@app.errorhandler(500)
def server_error(e):
    return jsonify({"message": "Internal server error"}), 500

# -----------------------------
# RUN SERVER
# -----------------------------
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
