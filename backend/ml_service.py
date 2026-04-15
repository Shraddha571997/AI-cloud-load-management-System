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
    
    def predict_load(self, time_slot, model_type='active'):
        """Predict CPU load using engineered multi-factors."""
        try:
            if time_slot is None:
                raise ValueError("time_slot is required")
                
            model = self.models.get('active')
            if not model:
                logging.warning("No active champion found, executing algorithmic benchmark logic...")
                self._train_minimal_fallback()
                model = self.models.get('active')
                
            if not model:
               raise Exception("Critical Model Error")

            # Engineer real-time synthetic features to pair with time_slot
            requests = np.random.normal(1500, 200) if 9 <= time_slot <= 17 else np.random.normal(500, 100)
            ram = np.clip(requests / 20 + np.random.normal(0, 5), 10, 95)
            
            # Predict using 3-dimensional array
            features = np.array([[time_slot, requests, ram]])
            prediction = float(model.predict(features)[0])
            
            metrics = self.model_metrics.get('active', {})
            accuracy = metrics.get('r2_score', 0.85)

            return {
                'predicted_load': round(prediction, 2),
                'confidence': round(accuracy, 2),
                'model_used': metrics.get('name', 'unknown'),
                'accuracy': round(accuracy, 4),
                'engineering_features': {'requests': round(requests), 'ram': round(ram, 1)},
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
        """Train models using multifactor feature engineering and algorithm benchmarking."""
        np.random.seed(42)
        n_samples = 500
        time_slots = np.random.randint(0, 24, n_samples)
        
        # Multi-factor Feature Engineering Array
        requests = np.where((time_slots >= 9) & (time_slots <= 17), 
                           np.random.normal(1500, 200, n_samples), 
                           np.random.normal(500, 100, n_samples))
        
        ram = np.clip(requests / 20 + np.random.normal(0, 5, n_samples), 10, 95)
        
        # Target variable mapped procedurally from logic
        y = np.clip((time_slots * 1.5) + (requests / 40) + (ram * 0.3) + np.random.normal(0, 5, n_samples), 5, 100)
        
        X = np.column_stack((time_slots, requests, ram))
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        # 1. Random Forest Engine
        rf = RandomForestRegressor(n_estimators=50, random_state=42)
        rf.fit(X_train, y_train)
        rf_pred = rf.predict(X_test)
        rf_r2 = r2_score(y_test, rf_pred)
        
        # 2. Linear Regression Engine
        lr = LinearRegression()
        lr.fit(X_train, y_train)
        lr_pred = lr.predict(X_test)
        lr_r2 = r2_score(y_test, lr_pred)
        
        # Champion Benchmarking Logic
        if rf_r2 > lr_r2:
            best_model = rf
            best_name = 'random_forest'
            accuracy = rf_r2
        else:
            best_model = lr
            best_name = 'linear_regression'
            accuracy = lr_r2
            
        self.models['active'] = best_model
        self.model_metrics['active'] = {
            'name': best_name,
            'r2_score': accuracy,
            'features_version': '3D[time, requests, ram]',
            'trained_at': datetime.utcnow().isoformat()
        }

# Global ML service instance
ml_service = MLService()