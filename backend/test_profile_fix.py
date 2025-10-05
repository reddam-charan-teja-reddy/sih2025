import requests
import json

# Login
print("Logging in...")
r_login = requests.post('http://localhost:8000/api/auth/login', 
                        json={'credential': 'charanteja3639@gmail.com', 
                              'password': 'TestPassword123!'})
print(f"Login Status: {r_login.status_code}")

if r_login.status_code != 200:
    print("Login failed:", r_login.json())
    exit(1)

token = r_login.json()['access_token']
print("✓ Login successful\n")

# Test Profile Update
print("Testing Profile Update...")
r_profile = requests.put('http://localhost:8000/api/user/profile',
                         headers={'Authorization': f'Bearer {token}'},
                         json={'fullName': 'Test User Updated', 'language': 'hi'})
print(f"Profile Update Status: {r_profile.status_code}")
print(f"Response: {r_profile.json()}")
print("✓ Profile update" if r_profile.status_code == 200 else "✗ Profile update failed")
print()

# Test Settings Update
print("Testing Settings Update...")
r_settings = requests.put('http://localhost:8000/api/user/settings',
                          headers={'Authorization': f'Bearer {token}'},
                          json={'notificationPreferences': {'email': True, 'sms': False, 'push': True}, 
                                'language': 'en'})
print(f"Settings Update Status: {r_settings.status_code}")
print(f"Response: {r_settings.json()}")
print("✓ Settings update" if r_settings.status_code == 200 else "✗ Settings update failed")
