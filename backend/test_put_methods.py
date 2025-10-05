import requests
import json

# Login
r = requests.post('http://localhost:8000/api/auth/login', 
                  json={'credential': 'charanteja3639@gmail.com', 'password': 'TestPassword123!'})
token = r.json()['accessToken']
print(f"Token: {token[:50]}...\n")

# Test 1: Using json parameter (current approach)
print("=== Test 1: Using json parameter ===")
headers = {
    'Authorization': f'Bearer {token}',
    'Content-Type': 'application/json'
}
body = {
    'fullName': 'Test 1',
    'phone': '+919876543210',
    'language': 'en',
    'profession': 'Engineer'
}

r = requests.put('http://localhost:8000/api/user/profile', 
                 headers=headers,
                 json=body)
print(f"Status: {r.status_code}")
print(f"Response: {r.json()}\n")

# Test 2: Using data parameter with JSON string
print("=== Test 2: Using data parameter with JSON string ===")
r = requests.put('http://localhost:8000/api/user/profile', 
                 headers=headers,
                 data=json.dumps(body))
print(f"Status: {r.status_code}")
print(f"Response: {r.json()}\n")

# Test 3: Without explicit Content-Type (let requests set it)
print("=== Test 3: Without explicit Content-Type ===")
headers_no_ct = {
    'Authorization': f'Bearer {token}'
}
r = requests.put('http://localhost:8000/api/user/profile', 
                 headers=headers_no_ct,
                 json=body)
print(f"Status: {r.status_code}")
print(f"Response: {r.json()}")
