import requests
import json
import time
from datetime import datetime, timedelta

API_BASE = 'http://localhost:8080/api'

def login_admin():
    """Login as admin and get token"""
    try:
        response = requests.post(f'{API_BASE}/user/userLogin', json={
            'identifier': 'admin@example.com',
            'password': 'SecurePassword@123'
        })
        
        print(f"Login Status: {response.status_code}")
        data = response.json()
        print(f"Login Response: {json.dumps(data, indent=2)}")
        
        if data.get('success') and 'token' in data.get('data', {}):
            return data['data']['token']
        else:
            print("Login failed!")
            return None
    except Exception as e:
        print(f"Login error: {str(e)}")
        return None

def test_discount_list(token):
    """Test getting discount list"""
    try:
        headers = {'Authorization': f'Bearer {token}'}
        response = requests.get(f'{API_BASE}/discounts', headers=headers)
        
        print(f"\n=== DISCOUNT LIST TEST ===")
        print(f"Status: {response.status_code}")
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        return response.status_code == 200 and data.get('success', False)
    except Exception as e:
        print(f"Discount list error: {str(e)}")
        return False

def test_create_discount(token):
    """Test creating a new discount"""
    try:
        headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }
        
        # Create test discount data matching the validation schema
        discount_data = {
            'code': f'TEST{int(time.time())}',  # Make unique
            'description': 'Test discount for Python testing',
            'discountType': 'percentage',
            'discountValue': 20.0,
            'applicableType': 'both',
            'minPurchaseAmount': 50.0,  # Changed from minimumPurchaseAmount
            'maxUses': 100,  # Changed from usageLimit
            'maxUsesPerUser': 1,  # Changed from usageLimitPerUser
            'validFrom': datetime.now().isoformat(),
            'validUntil': (datetime.now() + timedelta(days=30)).isoformat(),
            'isActive': True
        }
        
        response = requests.post(f'{API_BASE}/discounts', json=discount_data, headers=headers)
        
        print(f"\n=== CREATE DISCOUNT TEST ===")
        print(f"Status: {response.status_code}")
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        if response.status_code in [200, 201] and data.get('success', False):
            return data.get('data', {}).get('discountId') or data.get('data', {}).get('code')
        return None
    except Exception as e:
        print(f"Create discount error: {str(e)}")
        return None

def test_get_discount(token, discount_id):
    """Test getting a specific discount"""
    try:
        headers = {'Authorization': f'Bearer {token}'}
        response = requests.get(f'{API_BASE}/discounts/{discount_id}', headers=headers)
        
        print(f"\n=== GET DISCOUNT TEST ===")
        print(f"Status: {response.status_code}")
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        return response.status_code == 200 and data.get('success', False)
    except Exception as e:
        print(f"Get discount error: {str(e)}")
        return False

def test_lesson_endpoints(token):
    """Test lesson endpoints"""
    try:
        # First get a course
        headers = {'Authorization': f'Bearer {token}'}
        courses_response = requests.get(f'{API_BASE}/course/getAllCourses?page=1&limit=1', headers=headers)
        
        print(f"\n=== LESSON ENDPOINTS TEST ===")
        print(f"Get Courses Status: {courses_response.status_code}")
        
        if courses_response.status_code != 200:
            print("Failed to get courses")
            return False
            
        courses_data = courses_response.json()
        if not courses_data.get('success') or not courses_data.get('data', {}).get('courses'):
            print("No courses found")
            return False
            
        course_id = courses_data['data']['courses'][0]['courseId']
        print(f"Using course ID: {course_id}")
        
        # Get sections for this course
        sections_response = requests.get(f'{API_BASE}/section/getSectionsByCourseId/{course_id}', headers=headers)
        print(f"Get Sections Status: {sections_response.status_code}")
        
        if sections_response.status_code != 200:
            print("Failed to get sections")
            return False
            
        sections_data = sections_response.json()
        if not sections_data.get('success') or not sections_data.get('data', {}).get('sections'):
            print("No sections found")
            return False
            
        section_id = sections_data['data']['sections'][0]['sectionId']
        print(f"Using section ID: {section_id}")
        
        # Test lesson creation
        lesson_data = {
            'courseId': course_id,
            'sectionId': section_id,
            'title': 'Python Test Lesson',
            'type': 'video',
            'content': '<p>This is a <strong>test lesson</strong> created by Python script with <em>rich content</em>.</p>',
            'duration': 15,
            'order': 100,
            'isPreview': True
        }
        
        lesson_response = requests.post(f'{API_BASE}/lesson/admin/create', json=lesson_data, headers=headers)
        print(f"Create Lesson Status: {lesson_response.status_code}")
        lesson_result = lesson_response.json()
        print(f"Create Lesson Response: {json.dumps(lesson_result, indent=2)}")
        
        return lesson_response.status_code == 200 and lesson_result.get('success', False)
        
    except Exception as e:
        print(f"Lesson endpoints error: {str(e)}")
        return False

def main():
    print("🚀 Starting API Test Suite...")
    
    # Login
    token = login_admin()
    if not token:
        print("❌ Failed to login. Stopping tests.")
        return
    
    print(f"✅ Login successful. Token: {token[:20]}...")
    
    # Test discount functionality
    discount_list_success = test_discount_list(token)
    print(f"Discount List Test: {'✅ PASSED' if discount_list_success else '❌ FAILED'}")
    
    # Test creating discount
    discount_id = test_create_discount(token)
    create_success = discount_id is not None
    print(f"Create Discount Test: {'✅ PASSED' if create_success else '❌ FAILED'}")
    
    # Test getting specific discount
    if discount_id:
        get_success = test_get_discount(token, discount_id)
        print(f"Get Discount Test: {'✅ PASSED' if get_success else '❌ FAILED'}")
    
    # Test lesson endpoints
    lesson_success = test_lesson_endpoints(token)
    print(f"Lesson Endpoints Test: {'✅ PASSED' if lesson_success else '❌ FAILED'}")
    
    print("\n📊 Test Summary:")
    print(f"- Discount List: {'✅' if discount_list_success else '❌'}")
    print(f"- Create Discount: {'✅' if create_success else '❌'}")
    if discount_id:
        print(f"- Get Discount: {'✅' if get_success else '❌'}")
    print(f"- Lesson Endpoints: {'✅' if lesson_success else '❌'}")

if __name__ == "__main__":
    main()
