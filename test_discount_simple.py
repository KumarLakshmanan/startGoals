import requests
import json

API_BASE = 'http://localhost:8080/api'

# Login
response = requests.post(f'{API_BASE}/user/userLogin', json={
    'identifier': 'admin@example.com', 
    'password': 'SecurePassword@123'
})

if response.status_code == 200:
    token = response.json()['data']['token']
    headers = {'Authorization': f'Bearer {token}'}
    
    # Test discount list
    response = requests.get(f'{API_BASE}/discounts', headers=headers)
    print(f'Status: {response.status_code}')
    
    if response.status_code == 200:
        print('✅ SUCCESS: Discount list works!')
        data = response.json()
        print(f'Found {len(data.get("data", {}).get("discountCodes", []))} discount codes')
    else:
        print('❌ FAILED')
        print(f'Response: {json.dumps(response.json(), indent=2)}')
else:
    print('Login failed')
