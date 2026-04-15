import requests
import random
import sys

base_url = "http://localhost:5000/api/auth"
username = "testuser" + str(random.randint(1000, 9999))
print(f"Testing with username: {username}")

try:
    # Register
    print("Testing Registration...")
    resp = requests.post(f"{base_url}/register", json={
        "name": "Test User",
        "username": username,
        "email": f"{username}@example.com",
        "password": "mypassword123"
    })
    print("Register Status:", resp.status_code)
    print("Register Response:", resp.text)

    if resp.status_code not in (200, 201):
        sys.exit(1)

    # Login
    print("\nTesting Login...")
    resp = requests.post(f"{base_url}/login", json={
        "username": username,
        "password": "mypassword123"
    })
    print("Login Status:", resp.status_code)
    print("Login Response:", resp.text)

    if resp.status_code != 200:
        sys.exit(1)
        
    print("\nAll tests passed successfully!")

except Exception as e:
    print(f"Error occurred: {str(e)}")
    sys.exit(1)
