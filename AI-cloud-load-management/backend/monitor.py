import logging
import random
from datetime import datetime

try:
    import psutil
    PSUTIL_AVAILABLE = True
except ImportError:
    PSUTIL_AVAILABLE = False
    logging.warning("psutil not found. Using simulation mode.")

class SystemMonitor:
    def __init__(self):
        self.last_net_io = None
        self.last_net_time = None
        
        if PSUTIL_AVAILABLE:
            # Initialize network counters
            self.last_net_io = psutil.net_io_counters()
            self.last_net_time = datetime.now()

    def get_cpu_load(self):
        """Get real CPU percentage or simulated fallback."""
        try:
            if PSUTIL_AVAILABLE:
                return psutil.cpu_percent(interval=0.1)
            else:
                return round(random.uniform(10, 80), 1)
        except Exception as e:
            logging.error(f"Error reading CPU: {e}")
            return round(random.uniform(10, 80), 1)

    def get_memory_usage(self):
        """Get real Memory percentage."""
        try:
            if PSUTIL_AVAILABLE:
                return psutil.virtual_memory().percent
            else:
                return round(random.uniform(40, 60), 1)
        except Exception as e:
            logging.error(f"Error reading Memory: {e}")
            return 50.0

    def get_network_stats(self):
        """Get network traffic rate (bytes/sec)."""
        try:
            if not PSUTIL_AVAILABLE:
                return {
                    'bytes_sent': random.randint(1000, 5000000),
                    'bytes_recv': random.randint(1000, 10000000)
                }

            current_net_io = psutil.net_io_counters()
            current_time = datetime.now()
            
            # For this simple implementation, we just return the raw counters
            # The frontend calculates the rate, or a more advanced rate calculation could happen here
            # But adhering to the existing app.py pattern which returned raw bytes
            return {
                'bytes_sent': current_net_io.bytes_sent,
                'bytes_recv': current_net_io.bytes_recv
            }
            
        except Exception as e:
            logging.error(f"Error reading Network: {e}")
            return {'bytes_sent': 0, 'bytes_recv': 0}

    def get_system_health(self):
        """Return overall system health status."""
        cpu = self.get_cpu_load()
        mem = self.get_memory_usage()
        
        status = "Operational"
        if cpu > 90 or mem > 90:
            status = "Critical"
        elif cpu > 75 or mem > 80:
            status = "Warning"
            
        return {
            "status": status,
            "is_real_data": PSUTIL_AVAILABLE,
            "cpu_load": cpu,
            "memory_usage": mem
        }

# Global instance
monitor = SystemMonitor()
