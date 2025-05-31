# Batch Management API Documentation

## Overview

The Batch Management system provides comprehensive functionality for creating, managing, and organizing batches within courses. This system allows instructors to create batches, manage student enrollments, and track batch statistics.

## Architecture

### Core Components

1. **Models**
   - `batch.js` - Batch metadata and configuration
   - `batchStudents.js` - Student enrollment tracking
   - `course.js` - Course information (referenced)
   - `user.js` - User information (referenced)

2. **Controllers**
   - `batchController.js` - Batch CRUD operations
   - `batchStudentsController.js` - Student enrollment management

3. **Routes**
   - `batchRoutes.js` - Batch management endpoints
   - `batchStudentsRoutes.js` - Student enrollment endpoints

## Database Schema

### Batch Table
```sql
- batchId (UUID, Primary Key)
- courseId (UUID, Foreign Key to courses)
- title (STRING, NOT NULL)
- startTime (DATE, NOT NULL)
- endTime (DATE, NOT NULL)
- createdBy (UUID, Foreign Key to users)
- createdAt (TIMESTAMP)
- updatedAt (TIMESTAMP)
- deletedAt (TIMESTAMP, Nullable)
```

### BatchStudents Table
```sql
- batchStudentId (UUID, Primary Key)
- batchId (UUID, Foreign Key to batches)
- userId (UUID, Foreign Key to users)
- enrollmentDate (DATE, Default: NOW)
- status (ENUM: 'active', 'inactive', 'dropped', 'completed')
- createdAt (TIMESTAMP)
- updatedAt (TIMESTAMP)
- deletedAt (TIMESTAMP, Nullable)
```

## API Endpoints

### Batch Management

#### 1. Create Batch

**Endpoint:** `POST /api/batch/createBatch`

**Authentication:** Required

**Request Body:**
```json
{
  "courseId": "course_uuid",
  "title": "Spring 2024 Batch",
  "startTime": "2024-03-01T10:00:00Z",
  "endTime": "2024-06-01T18:00:00Z",
  "userId": "instructor_uuid"
}
```

**Response:**
```json
{
  "status": true,
  "message": "Batch created",
  "data": {
    "batchId": "batch_uuid",
    "courseId": "course_uuid",
    "title": "Spring 2024 Batch",
    "startTime": "2024-03-01T10:00:00Z",
    "endTime": "2024-06-01T18:00:00Z",
    "createdBy": "instructor_uuid",
    "createdAt": "2024-01-15T14:30:00Z",
    "updatedAt": "2024-01-15T14:30:00Z"
  }
}
```

#### 2. Get All Batches

**Endpoint:** `GET /api/batch`

**Query Parameters:**
- `page` (number, default: 1) - Page number for pagination
- `limit` (number, default: 10) - Items per page
- `courseId` (UUID, optional) - Filter by course
- `status` (string, optional) - Filter by status
- `search` (string, optional) - Search in batch titles
- `sortBy` (string, default: "createdAt") - Sort field
- `sortOrder` (string, default: "DESC") - Sort order (ASC/DESC)

**Response:**
```json
{
  "status": true,
  "message": "Batches retrieved successfully",
  "data": {
    "batches": [
      {
        "batchId": "batch_uuid",
        "title": "Spring 2024 Batch",
        "startTime": "2024-03-01T10:00:00Z",
        "endTime": "2024-06-01T18:00:00Z",
        "course": {
          "courseId": "course_uuid",
          "title": "JavaScript Fundamentals",
          "description": "Learn the basics of JavaScript"
        },
        "creator": {
          "userId": "instructor_uuid",
          "username": "john_doe",
          "email": "john@example.com"
        }
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 45,
      "itemsPerPage": 10
    }
  }
}
```

#### 3. Get Batch by ID

**Endpoint:** `GET /api/batch/:batchId`

**Parameters:**
- `batchId` (UUID) - Batch identifier

**Response:**
```json
{
  "status": true,
  "message": "Batch retrieved successfully",
  "data": {
    "batchId": "batch_uuid",
    "courseId": "course_uuid",
    "title": "Spring 2024 Batch",
    "startTime": "2024-03-01T10:00:00Z",
    "endTime": "2024-06-01T18:00:00Z",
    "course": {
      "courseId": "course_uuid",
      "title": "JavaScript Fundamentals",
      "description": "Learn the basics of JavaScript"
    },
    "creator": {
      "userId": "instructor_uuid",
      "username": "john_doe",
      "email": "john@example.com"
    },
    "batchStudents": [
      {
        "batchStudentId": "enrollment_uuid",
        "enrollmentDate": "2024-02-15T09:00:00Z",
        "status": "active",
        "student": {
          "userId": "student_uuid",
          "username": "jane_smith",
          "email": "jane@example.com"
        }
      }
    ]
  }
}
```

#### 4. Update Batch

**Endpoint:** `PUT /api/batch/:batchId`

**Parameters:**
- `batchId` (UUID) - Batch identifier

**Request Body:**
```json
{
  "title": "Updated Batch Title",
  "startTime": "2024-03-15T10:00:00Z",
  "endTime": "2024-06-15T18:00:00Z",
  "status": "active",
  "maxStudents": 30
}
```

**Response:**
```json
{
  "status": true,
  "message": "Batch updated successfully",
  "data": {
    "batchId": "batch_uuid",
    "title": "Updated Batch Title",
    "startTime": "2024-03-15T10:00:00Z",
    "endTime": "2024-06-15T18:00:00Z",
    "updatedAt": "2024-01-20T10:15:00Z"
  }
}
```

#### 5. Delete Batch

**Endpoint:** `DELETE /api/batch/:batchId`

**Parameters:**
- `batchId` (UUID) - Batch identifier

**Response:**
```json
{
  "status": true,
  "message": "Batch deleted successfully"
}
```

**Error Response (if batch has students):**
```json
{
  "status": false,
  "message": "Cannot delete batch with enrolled students"
}
```

#### 6. Get Batches by Course

**Endpoint:** `GET /api/batch/course/:courseId`

**Parameters:**
- `courseId` (UUID) - Course identifier

**Query Parameters:**
- `status` (string, optional) - Filter by status
- `page` (number, default: 1) - Page number
- `limit` (number, default: 10) - Items per page

**Response:**
```json
{
  "status": true,
  "message": "Batches retrieved successfully",
  "data": {
    "batches": [
      {
        "batchId": "batch_uuid",
        "title": "Spring 2024 Batch",
        "startTime": "2024-03-01T10:00:00Z",
        "endTime": "2024-06-01T18:00:00Z",
        "course": {
          "courseId": "course_uuid",
          "title": "JavaScript Fundamentals",
          "description": "Learn the basics of JavaScript"
        }
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 2,
      "totalItems": 15,
      "itemsPerPage": 10
    }
  }
}
```

## Error Handling

### Common Error Responses

#### 400 Bad Request
```json
{
  "status": false,
  "message": "Missing required fields"
}
```

#### 404 Not Found
```json
{
  "status": false,
  "message": "Batch not found"
}
```

#### 409 Conflict
```json
{
  "status": false,
  "message": "Cannot delete batch with enrolled students"
}
```

#### 500 Internal Server Error
```json
{
  "status": false,
  "message": "Internal server error"
}
```

## Implementation Features

### Transaction Safety
- All create, update, and delete operations use database transactions
- Automatic rollback on errors to maintain data consistency

### Validation
- UUID format validation for all ID parameters
- Required field validation for create operations
- Referential integrity checks (course exists, user exists)

### Associations
- Batch belongs to Course
- Batch belongs to User (creator)
- Batch has many BatchStudents
- Includes related data in responses

### Pagination and Filtering
- Configurable page size and sorting
- Search functionality by batch title
- Filter by course, status, and other criteria
- Consistent pagination response format

## Usage Examples

### Creating a New Batch

```javascript
const createBatch = async () => {
  try {
    const response = await fetch('/api/batch/createBatch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer your-token'
      },
      body: JSON.stringify({
        courseId: 'course-uuid',
        title: 'Advanced React Development',
        startTime: '2024-03-01T10:00:00Z',
        endTime: '2024-06-01T18:00:00Z',
        userId: 'instructor-uuid'
      })
    });
    
    const data = await response.json();
    if (data.status) {
      console.log('Batch created:', data.data);
    }
  } catch (error) {
    console.error('Error creating batch:', error);
  }
};
```

### Fetching Batches with Filtering

```javascript
const fetchBatches = async () => {
  try {
    const params = new URLSearchParams({
      page: '1',
      limit: '20',
      courseId: 'course-uuid',
      search: 'React',
      sortBy: 'startTime',
      sortOrder: 'ASC'
    });
    
    const response = await fetch(`/api/batch?${params}`, {
      headers: {
        'Authorization': 'Bearer your-token'
      }
    });
    
    const data = await response.json();
    if (data.status) {
      console.log('Batches:', data.data.batches);
      console.log('Pagination:', data.data.pagination);
    }
  } catch (error) {
    console.error('Error fetching batches:', error);
  }
};
```

## Best Practices

### Data Integrity
1. Always use transactions for multi-step operations
2. Validate foreign key relationships before operations
3. Handle constraint violations gracefully

### Performance
1. Use pagination for large datasets
2. Implement efficient indexing on frequently queried fields
3. Include only necessary related data in responses

### Security
1. Implement proper authentication and authorization
2. Validate all input parameters
3. Use parameterized queries to prevent SQL injection

### Error Handling
1. Provide clear, actionable error messages
2. Log errors for debugging while keeping responses clean
3. Use appropriate HTTP status codes

## Testing

### Unit Test Example

```javascript
import { createBatch } from '../controller/batchController.js';

describe('Batch Controller', () => {
  describe('createBatch', () => {
    it('should create a batch successfully', async () => {
      const req = {
        body: {
          courseId: 'valid-course-uuid',
          title: 'Test Batch',
          startTime: '2024-03-01T10:00:00Z',
          endTime: '2024-06-01T18:00:00Z',
          userId: 'instructor-uuid'
        }
      };
      
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      
      await createBatch(req, res);
      
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: true,
          message: 'Batch created'
        })
      );
    });
  });
});
```

## Future Enhancements

1. **Batch Templates**: Create reusable batch configurations
2. **Automatic Enrollment**: Auto-enroll students based on criteria
3. **Batch Cloning**: Copy batch structure to new time periods
4. **Advanced Analytics**: Detailed batch performance metrics
5. **Integration**: Connect with external learning management systems
6. **Notifications**: Automated notifications for batch events
7. **Capacity Management**: Automatic waitlist handling
8. **Batch Scheduling**: Advanced recurring batch creation

## Support

For additional support or questions regarding the Batch Management API:

1. Check the error messages for specific guidance
2. Ensure all required fields are provided with correct data types
3. Verify UUID format for all ID parameters
4. Check database logs for constraint violations
5. Review transaction logs for concurrent operation issues
