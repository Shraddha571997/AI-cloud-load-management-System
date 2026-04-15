from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime, timedelta
import logging

from models import AutoPredictionConfig, Prediction, User, db
from ml_service import ml_service
from scaling import scale_decision

logging.basicConfig()
logging.getLogger('apscheduler').setLevel(logging.INFO)

class SchedulerService:
    def __init__(self):
        self.scheduler = BackgroundScheduler(daemon=True)
        self.job_id = "auto_prediction_job"
        self.app = None
        
    def init_app(self, app):
        self.app = app
        config = AutoPredictionConfig.get_config()
        
        if config['is_enabled']:
            self._schedule_job(config['interval_minutes'])
            
        self.scheduler.start()
        
    def _schedule_job(self, interval_minutes):
        if self.scheduler.get_job(self.job_id):
            self.scheduler.remove_job(self.job_id)
            
        self.scheduler.add_job(
            func=self.run_auto_prediction,
            trigger="interval",
            minutes=interval_minutes,
            id=self.job_id,
            replace_existing=True
        )
        
        # Update next_run in DB
        next_run = datetime.utcnow() + timedelta(minutes=interval_minutes)
        AutoPredictionConfig.update_config({'next_run': next_run})

    def enable_auto_prediction(self, interval_minutes):
        self._schedule_job(interval_minutes)
        AutoPredictionConfig.update_config({
            'is_enabled': True,
            'interval_minutes': interval_minutes
        })

    def disable_auto_prediction(self):
        if self.scheduler.get_job(self.job_id):
            self.scheduler.remove_job(self.job_id)
        AutoPredictionConfig.update_config({
            'is_enabled': False,
            'next_run': None
        })

    def run_auto_prediction(self):
        if not self.app:
            logging.error("Scheduler Service is missing Flask app context!")
            return
            
        with self.app.app_context():
            now = datetime.utcnow()
            time_slot = now.hour
            
            # Run prediction
            prediction_result = ml_service.predict_load(time_slot)
            if not prediction_result:
                logging.error("Auto Prediction Failed: Service unavailable")
                return

            predicted_load = prediction_result['predicted_load']
            confidence = prediction_result['confidence']
            action = scale_decision(predicted_load)
            
            recommendation_message = "Maintain current capacity"
            if action == "SCALE UP" or action == "aggressive scaling" or action == "scale up":
                recommendation_message = "Scale up to avoid overload"
            elif action == "SCALE DOWN" or action == "reduce resources":
                recommendation_message = "Reduce servers to save cost"
                
            confidence_score = round(confidence * 100) if confidence else 85
            
            # Find admin user or default user to attach the prediction to, or None (system prediction)
            admin_user = User.collection.find_one({'role': 'admin'})
            user_id = str(admin_user['_id']) if admin_user else None
            
            # Save it
            Prediction.save_prediction(
                user_id=user_id,
                time_slot=time_slot,
                predicted_load=predicted_load,
                action=action,
                confidence=confidence,
                recommendation_message=recommendation_message,
                confidence_score=confidence_score
            )
            
            # Audit log
            from models import AuditLog
            username = 'System'
            AuditLog.log_action(user_id, username, 'prediction', {'time_slot': time_slot, 'load': predicted_load, 'auto': True})
            if action in ['SCALE UP', 'SCALE DOWN']:
                AuditLog.log_action(user_id, username, 'scaling', {'action': action, 'auto': True})
            
            # Update last run and next run
            config = AutoPredictionConfig.get_config()
            interval = config.get('interval_minutes', 15)
            next_run = now + timedelta(minutes=interval)
            
            AutoPredictionConfig.update_config({
                'last_run': now,
                'next_run': next_run
            })
            
            logging.info(f"Auto Prediction executed successfully at {now}")

scheduler_service = SchedulerService()
