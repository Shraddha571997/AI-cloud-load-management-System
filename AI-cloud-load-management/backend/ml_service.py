import pickle
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_squared_error, r2_score
from sklearn.model_selection import train_test_split
import os
from datetime import datetime
import logging

class MLService:
    def __init__(self):
        self.models = {}
        self.model_metrics = {}
        self.load_models()
    
    def load_models(self):
        """Load all trained models from disk."""
        model_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../ml/")
        
        try:
            rf_path = os.path.join(model_dir, "load_model.pkl")
            if os.path.exists(rf_path):
                self.models['random_forest'] = pickle.load(open(rf_path, 'rb'))
            else:
                logging.warning("RandomForest model not found; using fallback")
                self._train_minimal_fallback()
            
            lr_path = os.path.join(model_dir, "linear_model.pkl")
            if os.path.exists(lr_path):
                self.models['linear_regression'] = pickle.load(open(lr_path, 'rb'))
        except Exception as e:
            logging.error(f"Error loading models: {e}")
            self._train_minimal_fallback()
    
    def predict_load(self, time_slot, model_type='random_forest'):
        """Predict CPU load with confidence score."""
        try:
            if time_slot is None:
                raise ValueError("time_slot is required")

            if model_type not in self.models:
                model_type = 'random_forest'  # fallback
            
            model = self.models.get(model_type)
            if not model:
                raise Exception("No model available")
            
            # Make prediction
            # sklearn expects 2D array
            prediction = float(model.predict([[time_slot]])[0])
            
            # Calculate confidence (simplified approach)
            confidence = self._calculate_confidence(time_slot, prediction, model_type)
            
            return {
                'predicted_load': round(prediction, 2),
                'confidence': round(confidence, 2),
                'model_used': model_type,
                'timestamp': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logging.error(f"Prediction error: {e}")
            return None
    
    def _calculate_confidence(self, time_slot, prediction, model_type):
        """Calculate prediction confidence score"""
        # Simplified confidence calculation
        # In production, this would use model uncertainty estimation
        
        base_confidence = 0.85
        
        # Adjust confidence based on prediction range
        if 40 <= prediction <= 75:
            confidence_adjustment = 0.1  # More confident in normal range
        else:
            confidence_adjustment = -0.1  # Less confident in extreme values
        
        # Adjust based on time slot (business hours vs off-hours)
        if 9 <= time_slot <= 17:  # Business hours
            time_adjustment = 0.05
        else:
            time_adjustment = -0.05
        
        final_confidence = base_confidence + confidence_adjustment + time_adjustment
        return max(0.5, min(0.99, final_confidence))  # Clamp between 0.5 and 0.99
    
    def batch_predict(self, time_slots):
        """Predict for multiple time slots"""
        predictions = []
        for time_slot in time_slots:
            pred = self.predict_load(time_slot)
            if pred:
                predictions.append({
                    'time_slot': time_slot,
                    **pred
                })
        return predictions
    
    
    def detect_anomaly(self, real_load, predicted_load, threshold=20.0):
        """
        Detect if real load deviates significantly from prediction.
        Returns: 'NORMAL', 'WARNING', or 'CRITICAL'
        """
        try:
            diff = abs(real_load - predicted_load)
            
            if diff > threshold * 1.5:
                return {
                    'status': 'CRITICAL',
                    'message': f'Major anomaly! Real load ({real_load}%) is way off from predicted ({predicted_load}%)',
                    'diff': diff
                }
            elif diff > threshold:
                return {
                    'status': 'WARNING',
                    'message': f'Anomaly detected. Load deviation of {diff:.1f}%',
                    'diff': diff
                }
            else:
                return {
                    'status': 'NORMAL',
                    'message': 'System behavior matches predictions',
                    'diff': diff
                }
        except Exception as e:
            logging.error(f"Anomaly detection error: {e}")
            return {'status': 'UNKNOWN', 'message': 'Detection failed'}

    def retrain_model(self, data_path=None):
        """Retrain the model with new data and persist artefacts."""
        try:
            if not data_path:
                data_path = os.path.join(os.path.dirname(__file__), "../data/cloud_load.csv")
            
            # Load data
            data = pd.read_csv(data_path)
            X = data[['time']]
            y = data['cpu_usage']
            
            # Split data
            X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
            
            # Train Random Forest
            rf_model = RandomForestRegressor(n_estimators=100, random_state=42)
            rf_model.fit(X_train, y_train)
            
            # Evaluate model
            y_pred = rf_model.predict(X_test)
            mse = mean_squared_error(y_test, y_pred)
            r2 = r2_score(y_test, y_pred)
            
            # Save model
            model_path = os.path.join(os.path.dirname(__file__), "../ml/load_model.pkl")
            pickle.dump(rf_model, open(model_path, 'wb'))
            
            # Update loaded model
            self.models['random_forest'] = rf_model
            self.model_metrics['random_forest'] = {
                'mse': mse,
                'r2_score': r2,
                'trained_at': datetime.utcnow().isoformat()
            }
            
            return {
                'success': True,
                'metrics': self.model_metrics['random_forest']
            }
            
        except Exception as e:
            logging.error(f"Model retraining error: {e}")
            return {'success': False, 'error': str(e)}
    
    def get_model_info(self):
        """Get information about loaded models"""
        info = {}
        for model_name, model in self.models.items():
            info[model_name] = {
                'type': type(model).__name__,
                'metrics': self.model_metrics.get(model_name, {}),
                'loaded': True
            }
        return info

    def _train_minimal_fallback(self):
        """Train a tiny linear model so the API can still respond in dev environments."""
        X = np.array(range(24)).reshape(-1, 1)
        y = np.clip(np.linspace(20, 80, 24) + np.random.randn(24) * 5, 0, 100)
        lr = LinearRegression()
        lr.fit(X, y)
        self.models['random_forest'] = lr
        self.model_metrics['random_forest'] = {'note': 'fallback linear model', 'trained_at': datetime.utcnow().isoformat()}

# Global ML service instance
ml_service = MLService()