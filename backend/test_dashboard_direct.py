import requests
import json

# Login first
login_url = "https://saas-1-orcin.vercel.app/api/v1/login/access-token"
login_data = {
    "username": "admin@meerab.com",
    "password": "password123"
}

print("Logging in...")
response = requests.post(login_url, data=login_data)  # OAuth2 uses form data, not JSON
print(f"Login Status: {response.status_code}")

if response.status_code == 200:
    token = response.json()["access_token"]
    print(f"Token received: {token[:20]}...")
    
    # Test dashboard
    dashboard_url = "https://saas-1-orcin.vercel.app/api/v1/dashboard/summary?timeframe=monthly"
    headers = {"Authorization": f"Bearer {token}"}
    
    print("\nTesting dashboard...")
    dash_response = requests.get(dashboard_url, headers=headers)
    print(f"Dashboard Status: {dash_response.status_code}")
    print(f"Dashboard Response: {dash_response.text}")
else:
    print(f"Login failed: {response.text}")
