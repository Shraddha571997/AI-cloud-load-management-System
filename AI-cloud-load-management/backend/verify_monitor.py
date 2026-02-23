from monitor import monitor
import sys

print("Testing Monitor Module...")
try:
    cpu = monitor.get_cpu_load()
    mem = monitor.get_memory_usage()
    net = monitor.get_network_stats()
    health = monitor.get_system_health()
    
    print(f"CPU: {cpu}%")
    print(f"Memory: {mem}%")
    print(f"Network: {net}")
    print(f"Health: {health}")
    
    if health['is_real_data']:
        print("SUCCESS: Real Data Detected!")
    else:
        print("WARNING: Using Simulated Data (psutil missing?)")
        
except Exception as e:
    print(f"ERROR: {e}")
    sys.exit(1)
