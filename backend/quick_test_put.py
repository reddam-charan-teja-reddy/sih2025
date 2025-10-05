import requests
import json

# Login
r = requests.post('http://localhost:8000/api/auth/login', 
                  json={'credential': 'charanteja3639@gmail.com', 'password': 'TestPassword123!'})
token = r.json()['accessToken']
print(f"Token: {token[:50]}...")

# Test PUT with profile
print("\n--- Testing Profile Update ---")
headers = {
    'Authorization': f'Bearer {token}',
    'Content-Type': 'application/json'
}
body = {
    'fullName': 'Direct Test User',
    'language': 'te'
}

print(f"Headers: {headers}")
print(f"Body: {json.dumps(body)}")

r = requests.put('http://localhost:8000/api/user/profile', 
                 headers=headers,
                 json=body)

print(f"\nStatus: {r.status_code}")
print(f"Response: {json.dumps(r.json(), indent=2)}")
