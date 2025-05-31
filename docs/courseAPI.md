# Course API Documentation

## Overview
Complete CRUD operations for course management with advanced features like search, filtering, pagination, and analytics.

## Base URL
```
/api/courses
```

## Authentication
Most endpoints require authentication using Bearer token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

---

## Endpoints

### 1. Create Course
**POST** `/api/courses/`

Creates a new course.

**Headers:**
- `Authorization: Bearer <token>` (Required)
- `Content-Type: application/json`

**Request Body:**
```json
{
  "title": "Complete JavaScript Course",
  "description": "Learn JavaScript from basics to advanced",
  "levelId": "uuid-here",
  "categoryId": "uuid-here",
  "languageIds": ["uuid1", "uuid2"],
  "tags": ["javascript", "programming", "web"],
  "goals": ["Learn JS fundamentals", "Build projects"],
  "requirements": ["Basic computer knowledge"],
  "createdBy": "instructor-uuid",
  "isPaid": true,
  "price": 99.99,
  "type": "recorded",
  "thumbnailUrl": "https://example.com/thumb.jpg"
}
```

**Response:**
```json
{
  "status": true,
  "message": "Course created successfully!",
  "course": { /* course object */ }
}
```

---

### 2. Get All Courses
**GET** `/api/courses/`

Retrieves all courses with pagination and filtering.

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10)
- `categoryId` (uuid): Filter by category
- `levelId` (uuid): Filter by level
- `type` (string): Filter by type (recorded/live/hybrid)
- `isPaid` (boolean): Filter by payment type
- `status` (string): Filter by status (active/inactive/draft)
- `sortBy` (string): Sort field (default: createdAt)
- `sortOrder` (string): Sort order ASC/DESC (default: DESC)
- `search` (string): Search in title and description

**Example:**
```
GET /api/courses/?page=1&limit=5&categoryId=uuid&type=recorded&search=javascript
```

**Response:**
```json
{
  "status": true,
  "message": "Courses fetched successfully.",
  "data": {
    "courses": [/* array of courses */],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 25,
      "itemsPerPage": 5,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

---

### 3. Get Course by ID
**GET** `/api/courses/:courseId`

Retrieves a single course with all details.

**Parameters:**
- `courseId` (uuid): Course ID

**Response:**
```json
{
  "status": true,
  "message": "Course fetched successfully.",
  "course": {
    "courseId": "uuid",
    "title": "Course Title",
    "description": "Course description",
    "level": { /* level details */ },
    "category": { /* category details */ },
    "instructor": { /* instructor details */ },
    "tags": [/* array of tags */],
    "languages": [/* array of languages */],
    "goals": [/* array of goals */],
    "requirements": [/* array of requirements */],
    "sections": [/* array of sections with lessons */]
  }
}
```

---

### 4. Update Course
**PUT** `/api/courses/:courseId`

Updates an existing course.

**Headers:**
- `Authorization: Bearer <token>` (Required)

**Parameters:**
- `courseId` (uuid): Course ID

**Request Body:** (Same as create course)

**Response:**
```json
{
  "status": true,
  "message": "Course updated successfully!",
  "course": { /* updated course object */ }
}
```

---

### 5. Delete Course
**DELETE** `/api/courses/:courseId`

Deletes a course (soft delete by default).

**Headers:**
- `Authorization: Bearer <token>` (Required)

**Parameters:**
- `courseId` (uuid): Course ID

**Query Parameters:**
- `hardDelete` (boolean): Set to 'true' for permanent deletion (default: false)

**Response:**
```json
{
  "status": true,
  "message": "Course deleted successfully."
}
```

---

### 6. Search Courses
**GET** `/api/courses/search/courses`

Advanced search functionality.

**Query Parameters:**
- `q` (string): Search query (minimum 2 characters)
- `page` (number): Page number
- `limit` (number): Items per page
- `filters` (object): Additional filters

**Example:**
```
GET /api/courses/search/courses?q=javascript&page=1&limit=10
```

**Response:**
```json
{
  "status": true,
  "message": "Search completed successfully.",
  "data": {
    "searchQuery": "javascript",
    "courses": [/* matching courses */],
    "pagination": { /* pagination info */ }
  }
}
```

---

### 7. Get Courses by Instructor
**GET** `/api/courses/instructor/:instructorId`

Get all courses created by a specific instructor.

**Parameters:**
- `instructorId` (uuid): Instructor's user ID

**Query Parameters:**
- `page`, `limit`, `status` (same as get all courses)

---

### 8. Get Courses by Category
**GET** `/api/courses/category/:categoryId`

Get all courses in a specific category.

**Parameters:**
- `categoryId` (uuid): Category ID

**Query Parameters:**
- `page`, `limit`, `status` (same as get all courses)

---

### 9. Toggle Course Status
**PATCH** `/api/courses/:courseId/status`

Change course status.

**Headers:**
- `Authorization: Bearer <token>` (Required)

**Request Body:**
```json
{
  "status": "active" // active, inactive, draft, deleted
}
```

**Response:**
```json
{
  "status": true,
  "message": "Course status updated to active successfully.",
  "course": {
    "courseId": "uuid",
    "title": "Course Title",
    "status": "active"
  }
}
```

---

### 10. Duplicate Course
**POST** `/api/courses/:courseId/duplicate`

Create a copy of an existing course.

**Headers:**
- `Authorization: Bearer <token>` (Required)

**Request Body:**
```json
{
  "newTitle": "Copy of Original Course"
}
```

**Response:**
```json
{
  "status": true,
  "message": "Course duplicated successfully.",
  "course": { /* new course object */ }
}
```

---

### 11. Get Course Statistics
**GET** `/api/courses/admin/stats`

Get comprehensive course statistics (Admin only).

**Headers:**
- `Authorization: Bearer <token>` (Required)

**Response:**
```json
{
  "status": true,
  "message": "Course statistics fetched successfully.",
  "stats": {
    "byStatus": {
      "active": 25,
      "inactive": 5,
      "draft": 10,
      "total": 40
    },
    "byType": {
      "live": 8,
      "recorded": 20,
      "hybrid": 12
    },
    "byPricing": {
      "paid": 30,
      "free": 10
    }
  }
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "status": false,
  "message": "Validation error message",
  "errors": ["Error 1", "Error 2"]
}
```

### 401 Unauthorized
```json
{
  "status": false,
  "message": "Access denied. No token provided."
}
```

### 404 Not Found
```json
{
  "status": false,
  "message": "Course not found."
}
```

### 500 Internal Server Error
```json
{
  "status": false,
  "message": "An error occurred while processing your request."
}
```

---

## Usage Examples

### Frontend JavaScript (Axios)

```javascript
// Get all courses with filters
const getCourses = async () => {
  try {
    const response = await axios.get('/api/courses', {
      params: {
        page: 1,
        limit: 10,
        categoryId: 'some-uuid',
        type: 'recorded',
        search: 'javascript'
      }
    });
    console.log(response.data);
  } catch (error) {
    console.error(error.response.data);
  }
};

// Create a new course
const createCourse = async (courseData) => {
  try {
    const response = await axios.post('/api/courses', courseData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    console.log(response.data);
  } catch (error) {
    console.error(error.response.data);
  }
};

// Update course status
const updateCourseStatus = async (courseId, status) => {
  try {
    const response = await axios.patch(`/api/courses/${courseId}/status`, 
      { status }, 
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    console.log(response.data);
  } catch (error) {
    console.error(error.response.data);
  }
};
```

---

## Notes

1. **Pagination**: All list endpoints support pagination with `page` and `limit` parameters.
2. **Filtering**: Most endpoints support various filters to narrow down results.
3. **Soft Delete**: By default, deletion is soft delete (status changed to 'deleted').
4. **Authentication**: All modification operations require valid JWT token.
5. **Validation**: All inputs are validated before processing.
6. **Search**: Full-text search is available in title, description, and tags.
7. **Status Management**: Courses can have different statuses for better workflow management.

## Database Migration

Don't forget to run database migration to add the new `status` field:

```sql
ALTER TABLE courses ADD COLUMN status VARCHAR(20) DEFAULT 'draft' NOT NULL;
ALTER TABLE courses ADD CONSTRAINT courses_status_check CHECK (status IN ('active', 'inactive', 'draft', 'deleted'));
```
