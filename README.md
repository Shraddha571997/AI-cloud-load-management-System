# AI-Based Predictive Cloud Load Management

Production-ready full-stack app (Flask + MongoDB + React) for MCA final-year evaluation. Predict CPU load with ML, recommend scaling actions, and visualize analytics.

## Quick Start
Backend
```
cd backend
python -m venv .venv && .venv\Scripts\activate  # mac/linux: source .venv/bin/activate
pip install -r requirements.txt
cp ../.env.example ../.env  # edit MONGO_URI, secrets, thresholds
python ../ml/train_model.py  # trains and saves ml/load_model.pkl
python app.py  # API at http://localhost:5000
```
Frontend
```
cd ../frontend/react-app
npm install
npm run dev  # http://localhost:3000
```

## Environment (.env)
- SECRET_KEY, JWT_SECRET_KEY
- MONGO_URI (Atlas connection string)
- SCALE_UP_THRESHOLD, SCALE_DOWN_THRESHOLD, HIGH_UTIL_THRESHOLD
- Optional: MAIL_*, REDIS_URL, RATELIMIT_STORAGE_URL

## APIs
- POST /api/auth/register | /login | /refresh
- GET /api/predict/:time (0-23)
- POST /api/predict/batch { time_slots: [ints] }
- GET /api/history (query: limit, scope=user|all*)
- GET /api/stats   (query: days, scope=user|all*)
- Admin: GET /api/admin/users | POST /api/admin/retrain-model | GET /api/admin/system-stats
- Health: GET /api/health
*scope=all requires admin

## Features
- JWT auth with refresh; role-gated admin
- ML: scikit-learn RandomForest with retrain and metadata
- Scaling: env-configurable thresholds + recommendations
- UI: dashboard with overview cards, quick prediction, trend line, action bar, history table; prediction center; admin panel

## ML Pipeline
- Data: data/cloud_load.csv
- Training: ml/train_model.py (train/test split, metrics -> ml/model_metadata.json, artefact -> ml/load_model.pkl)
- Serving: backend/ml_service.py loads model, scores requests, retries with fallback if missing artefact

## Deployment Notes
- Stateless API; run behind gunicorn/uwsgi + reverse proxy with TLS
- Use managed Mongo (Atlas); optional Redis for rate limiting/cache
- Docker/k8s ready; real-time extensions via WebSockets/Kafka

## Viva Pointers
- AI: RandomForest regression + metrics
- Cloud: scaling policy with configurable thresholds
- Full-stack: React  Flask  Mongo integration
- Extensibility: model registry ready for LSTM, env-driven tuning



How to Run
1. Backend
Open a terminal in backend and run:

cd backend
# Activate virtual environment
.venv\Scripts\activate
# Run server
python app.py
Server will start on http://localhost:5000

2. Frontend
Open a new terminal in frontend/react-app and run:

cd frontend/react-app
npm run dev
Frontend will start on http://localhost:5173

Verification
Open the frontend URL.
Register a new account.
Login to see the dashboard.
Use the "Quick Prediction" tool to test the ML model.
admin
admin123

email :  admin@cloudload.com
password : admin123

### For user
username :  Shraddha
password : 123456

### For admin
username :  admin
password :  admin123
