import requests
import json

# Login
r = requests.post('http://localhost:8000/api/auth/login', 
                  json={'credential': 'charanteja3639@gmail.com', 'password': 'TestPassword123!'})
token = r.json()['accessToken']
print(f"Token: {token[:50]}...")

# Test Profile Update
print("\n--- Testing Profile Update ---")
headers = {
    'Authorization': f'Bearer {token}',
    'Content-Type': 'application/json'
}
profile_body = {
    'fullName': 'Updated Name Test',
    'phone': '+919876543210',
    'language': 'en',
    'profession': 'Software Engineer'
}

print(f"Body: {json.dumps(profile_body, indent=2)}")

r = requests.put('http://localhost:8000/api/user/profile', 
                 headers=headers,
                 json=profile_body)

print(f"Status: {r.status_code}")
print(f"Response: {json.dumps(r.json(), indent=2)}")

# Test Settings Update
print("\n--- Testing Settings Update ---")
settings_body = {
    'notificationPreferences': {
        'email': True,
        'sms': False,
        'push': True
    },
    'language': 'te'
}

print(f"Body: {json.dumps(settings_body)}")

r = requests.put('http://localhost:8000/api/user/settings', 
                 headers=headers,
                 json=settings_body)

print(f"Status: {r.status_code}")
print(f"Response: {json.dumps(r.json(), indent=2)}")
