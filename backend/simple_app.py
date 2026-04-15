from flask import Flask, jsonify, request
from flask_cors import CORS
import pickle
import os

app = Flask(__name__)
CORS(app)

# Load model
try:
    model_path = os.path.join(os.path.dirname(__file__), "../ml/load_model.pkl")
    model = pickle.load(open(model_path, 'rb'))
    print("Model loaded successfully")
except:
    model = None
    print("Model not found")

def scale_decision(predicted_load):
    if predicted_load > 75:
        return "SCALE UP"
    elif predicted_load < 40:
        return "SCALE DOWN"
    else:
        return "NO ACTION"

@app.route("/api/predict/<int:time>")
def predict(time):
    if not model:
        return jsonify({'error': 'Model not available'}), 500
    
    predicted_load = model.predict([[time]])[0]
    action = scale_decision(predicted_load)
    
    return jsonify({
        'time_slot': time,
        'predicted_cpu_load': round(predicted_load, 2),
        'action': action,
        'confidence': 0.85
    })

@app.route("/api/health")
def health():
    return jsonify({
        'status': 'healthy',
        'model_loaded': model is not None
    })

if __name__ == "__main__":
    print("Starting backend on http://localhost:5000")
    app.run(debug=True, port=5000)