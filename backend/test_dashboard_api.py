import urllib.request
import urllib.parse
import json

base_url = "http://127.0.0.1:8000/api/v1"

# Login
data = urllib.parse.urlencode({
    "username": "meerab.traders@saas.com",
    "password": "password123"
}).encode('utf-8')

req = urllib.request.Request(f"{base_url}/login/access-token", data=data)
try:
    with urllib.request.urlopen(req) as response:
        login_res = json.loads(response.read().decode())
        token = login_res.get("access_token")
except Exception as e:
    print("Login failed:", e)
    exit()

headers = {"Authorization": f"Bearer {token}"}

def get_json(url):
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req) as response:
         return json.loads(response.read().decode())

print("USER:", json.dumps(get_json(f"{base_url}/users/me"), indent=2))
print("SUPPLIERS:", len(get_json(f"{base_url}/suppliers/")))
