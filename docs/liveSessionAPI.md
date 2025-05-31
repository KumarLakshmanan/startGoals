# Live Session Implementation Documentation

## Overview

The Live Session system provides comprehensive support for creating, managing, and conducting live streaming sessions using both **Agora** and **Zoom** platforms. This implementation includes real-time participant management, raise hand functionality, and platform-specific optimizations.

## Architecture

### Core Components

1. **Services Layer**
   - `agoraService.js` - Agora-specific functionality
   - `zoomService.js` - Zoom-specific functionality

2. **Controller Layer**
   - `liveSessionController.js` - Main business logic

3. **Utilities**
   - `liveSessionUtils.js` - Validation, formatting, and error handling

4. **Database Models**
   - `liveSession.js` - Session metadata
   - `liveSessionParticipant.js` - Participant tracking
   - `raisedHand.js` - Raise hand workflow

## Environment Configuration

### Required Environment Variables

```bash
# Agora Configuration
AGORA_APP_ID=your_agora_app_id
AGORA_APP_CERTIFICATE=your_agora_app_certificate

# Zoom Configuration  
ZOOM_ACCOUNT_ID=your_zoom_account_id
ZOOM_CLIENT_ID=your_zoom_client_id
ZOOM_CLIENT_SECRET=your_zoom_client_secret
```

### Platform-Specific Setup

#### Agora Setup
- Create an Agora project at https://console.agora.io
- Obtain App ID and App Certificate
- Enable token authentication

#### Zoom Setup
- Create a Zoom app at https://marketplace.zoom.us
- Configure OAuth or Server-to-Server OAuth
- Obtain Account ID, Client ID, and Client Secret

## API Endpoints

### Base URL
```
/api/live-sessions
```

### 1. Create Live Session

**Endpoint:** `POST /createLiveSession`

**Authentication:** Required (Teacher role)

**Request Body:**
```json
{
  "courseId": "uuid",
  "batchId": "uuid", 
  "title": "Session Title",
  "sessionDate": "2025-05-31",
  "startTime": "14:30",
  "endTime": "15:00",
  "durationMinutes": 30,
  "platform": "zoom" // or "agora"
}
```

**Response:**
```json
{
  "status": true,
  "message": "Live session created successfully",
  "data": {
    "sessionId": "uuid",
    "title": "Session Title",
    "meetingLink": "https://zoom.us/j/123456789",
    "platformSessionId": "123456789",
    "status": "scheduled",
    "platform": "zoom"
  }
}
```

**Platform-Specific Behavior:**
- **Agora:** Creates channel and generates channel name
- **Zoom:** Creates meeting via Zoom API with specified settings

### 2. Start Live Session

**Endpoint:** `PUT /:sessionId/start`

**Authentication:** Required (Session Instructor)

**Response:**
```json
{
  "status": true,
  "message": "Live session on zoom started successfully",
  "data": {
    "sessionId": "uuid",
    "status": "active"
  }
}
```

### 3. Join Live Session

**Endpoint:** `POST /:sessionId/join`

**Authentication:** Required

**Request Body:**
```json
{
  "userId": "user123",
  "role": "student" // or "host"
}
```

**Response - Agora:**
```json
{
  "status": true,
  "message": "Successfully prepared to join agora live session",
  "data": {
    "platform": "agora",
    "token": "agora_rtc_token",
    "appId": "agora_app_id",
    "channelName": "channel_name",
    "uid": 123456,
    "role": "subscriber",
    "participantDetails": {
      "participantId": "uuid",
      "userId": "user123",
      "role": "student"
    }
  }
}
```

**Response - Zoom:**
```json
{
  "status": true,
  "message": "Successfully prepared to join zoom live session",
  "data": {
    "platform": "zoom",
    "joinUrl": "https://zoom.us/j/123456789",
    "meetingId": "123456789",
    "password": "meeting_password",
    "topic": "Session Title",
    "participantDetails": {
      "participantId": "uuid",
      "userId": "user123",
      "role": "student"
    }
  }
}
```

### 4. End Live Session

**Endpoint:** `PUT /:sessionId/end`

**Authentication:** Required (Session Instructor)

### 5. Get Session Details

**Endpoint:** `GET /:sessionId`

**Authentication:** Required

### 6. List Sessions

**Endpoint:** `GET /sessions`

**Authentication:** Required

**Query Parameters:**
- `platform` - Filter by platform (agora/zoom)
- `courseId` - Filter by course
- `instructorId` - Filter by instructor
- `status` - Filter by status (scheduled,active,ended)
- `sortBy` - Sort field (sessionDate, startTime, title)
- `sortOrder` - Sort direction (ASC/DESC)

### 7. Leave Live Session

**Endpoint:** `POST /:sessionId/leave`

**Authentication:** Required (Any session participant)

**Description:** Allows a participant to voluntarily leave a live session they are currently in.

**Request Body:** None (userId is extracted from authenticated user)

**Response:**
```json
{
  "status": true,
  "message": "Successfully left the live session",
  "data": {
    "sessionId": "uuid",
    "participantId": "participant_uuid",
    "userId": "user123",
    "leftAt": "2025-05-31T14:45:00Z",
    "platform": "agora"
  }
}
```

**Error Responses:**
- `400` - Session ID missing
- `401` - User authentication required
- `404` - Session not found or user not in session
- `500` - Internal server error

**Platform-Specific Behavior:**
- **Agora:** Client-side disconnect expected; server logs the leave event
- **Zoom:** Client-side disconnect expected; server logs the leave event

**Real-time Events:** Emits `participantLeft` event to all session participants

## Participant Management

### 8. Toggle Participant Microphone

**Endpoint:** `PUT /:sessionId/participants/:participantUserId/mic`

**Authentication:** Required (Session Instructor)

**Request Body:**
```json
{
  "allow": true // true to unmute, false to mute
}
```

### 9. Toggle Participant Camera

**Endpoint:** `PUT /:sessionId/participants/:participantUserId/camera`

**Authentication:** Required (Session Instructor)

**Request Body:**
```json
{
  "enable": true // true to enable camera, false to disable
}
```

### 10. Remove Participant

**Endpoint:** `DELETE /:sessionId/participants/:participantUserId`

**Authentication:** Required (Session Instructor)

## Raise Hand Workflow

### 11. Raise Hand

**Endpoint:** `POST /:sessionId/raise-hand`

**Authentication:** Required (Student role)

**Request Body:**
```json
{
  "participantId": "participant_uuid"
}
```

### 12. List Raised Hands

**Endpoint:** `GET /:sessionId/raised-hands`

**Authentication:** Required (Session Instructor)

### 13. Respond to Raised Hand

**Endpoint:** `PUT /:sessionId/raised-hands/:raisedHandId/respond`

**Authentication:** Required (Session Instructor)

**Request Body:**
```json
{
  "action": "accept" // or "reject"
}
```

**Behavior:**
- **Accept:** Unmutes the student, mutes all other students
- **Reject:** No change to participant status

### 14. End Raised Hand Interaction

**Endpoint:** `PUT /:sessionId/raised-hands/:raisedHandId/end-interaction`

**Authentication:** Required (Session Instructor)

**Behavior:** Mutes the participant and marks interaction as completed

## Real-time Events (WebSocket)

The system emits various real-time events through Socket.IO:

### Event Types

1. **participantJoined**
   ```json
   {
     "participant": "participant_data",
     "userId": "user123",
     "participantId": "uuid",
     "role": "student",
     "joinedAt": "2025-05-31T14:30:00Z"
   }
   ```

2. **participantLeft**
   ```json
   {
     "participant": "participant_data",
     "userId": "user123",
     "participantId": "uuid",
     "role": "student",
     "leftAt": "2025-05-31T14:32:00Z",
     "sessionId": "session_uuid"
   }
   ```

3. **participantMediaUpdated**
   ```json
   {
     "participantId": "uuid",
     "userId": "user123", 
     "mediaType": "mic", // or "camera"
     "isMuted": true,
     "sessionId": "session_uuid"
   }
   ```

4. **raiseHandReceived**
   ```json
   {
     "raisedHandId": "uuid",
     "sessionId": "session_uuid",
     "participantId": "participant_uuid",
     "userContext": {
       "userId": "user123",
       "role": "student"
     }
   }
   ```

5. **raiseHandResponse**
   ```json
   {
     "raisedHandId": "uuid",
     "status": "accepted", // or "rejected"
     "respondedAt": "2025-05-31T14:35:00Z"
   }
   ```

## Error Handling

### Common Error Codes

- `400` - Bad Request (validation errors)
- `401` - Unauthorized
- `403` - Forbidden (insufficient permissions)
- `404` - Resource not found
- `429` - Rate limit exceeded (Zoom)
- `500` - Internal server error

### Platform-Specific Errors

#### Agora Errors
- `INVALID_CHANNEL` - Invalid channel name format
- `CONFIG_ERROR` - Missing or invalid Agora credentials
- `TOKEN_ERROR` - Token generation failure

#### Zoom Errors
- `AUTH_ERROR` - Zoom authentication failure
- `RATE_LIMIT` - Zoom API rate limit exceeded
- `ZOOM_API_ERROR` - Zoom API specific error

## Database Schema

### LiveSession Table
```sql
- sessionId (UUID, Primary Key)
- courseId (UUID, Foreign Key)
- batchId (UUID, Foreign Key)
- title (VARCHAR)
- meetingLink (TEXT)
- sessionDate (DATE)
- startTime (TIME)
- endTime (TIME)
- durationMinutes (INTEGER)
- platform (ENUM: 'agora', 'zoom')
- platformSessionId (VARCHAR)
- status (ENUM: 'scheduled', 'active', 'ended')
- createdBy (UUID)
- createdAt (TIMESTAMP)
- updatedAt (TIMESTAMP)
```

### LiveSessionParticipant Table
```sql
- participantId (UUID, Primary Key)
- sessionId (UUID, Foreign Key)
- userId (VARCHAR)
- role (ENUM: 'host', 'student')
- joinedAt (TIMESTAMP)
- leftAt (TIMESTAMP, Nullable)
- isMuted (BOOLEAN, Default: true)
- isCameraOn (BOOLEAN, Default: false)
```

### RaisedHand Table
```sql
- raisedHandId (UUID, Primary Key)
- sessionId (UUID, Foreign Key)
- participantId (UUID, Foreign Key)
- status (ENUM: 'pending', 'accepted', 'rejected', 'addressed')
- raisedAt (TIMESTAMP)
- respondedAt (TIMESTAMP, Nullable)
```

## Implementation Details

### Session Creation Flow

1. **Input Validation**
   - Validate session data using `validateSessionInput.basic()`
   - Validate UUID formats for courseId and batchId
   - Validate time ranges

2. **Database Validation**
   - Verify course and batch existence
   - Check for scheduling conflicts (optional)

3. **Platform Session Creation**
   - **Agora:** Generate unique channel name, create session record
   - **Zoom:** Call Zoom API to create meeting with specified settings

4. **Database Record Creation**
   - Store session metadata with platform-specific details
   - Generate meeting link (Zoom URL or Agora channel reference)

### Token Management (Agora)

- Tokens are generated with 1-hour expiry by default
- Role-based token generation (Publisher for hosts, Subscriber for students)
- Automatic token validation before generation

### Meeting Settings (Zoom)

Default Zoom meeting settings:
```json
{
  "join_before_host": true,
  "mute_upon_entry": true,
  "participant_video": false,
  "host_video": true,
  "waiting_room": false,
  "audio": "both",
  "auto_recording": "none"
}
```

## Security Considerations

1. **Authentication & Authorization**
   - JWT-based authentication required for all endpoints
   - Role-based access control (Teachers, Students, Session Instructors)
   - Session-specific permissions

2. **Input Validation**
   - Comprehensive validation for all input parameters
   - SQL injection prevention through parameterized queries
   - XSS protection through input sanitization

3. **Platform Security**
   - Agora tokens with limited validity
   - Zoom API authentication using OAuth
   - Environment variable protection for credentials

## Performance Considerations

1. **Database Optimization**
   - Indexes on frequently queried fields (sessionId, userId, courseId)
   - Transaction management for data consistency
   - Connection pooling for database access

2. **Caching**
   - Consider caching frequently accessed session data
   - Agora token caching with appropriate TTL

3. **Rate Limiting**
   - Zoom API rate limiting compliance
   - Request throttling for high-traffic scenarios

## Testing

### Unit Tests
- Service layer functionality
- Utility function validation
- Error handling scenarios

### Integration Tests
- Platform API integration
- Database operations
- End-to-end session workflows

### Manual Testing Scenarios

1. **Session Creation**
   - Create sessions for both platforms
   - Verify platform-specific responses
   - Test validation edge cases

2. **Session Management**
   - Start/end sessions
   - Join as different user roles
   - Test participant controls

3. **Raise Hand Workflow**
   - Raise hand as student
   - Accept/reject as instructor
   - End interactions

## Deployment

### Prerequisites
- Node.js environment
- PostgreSQL/MySQL database
- Agora account and credentials
- Zoom account and app credentials

### Environment Setup
1. Set required environment variables
2. Run database migrations
3. Install dependencies: `npm install`
4. Start application: `npm start`

### Monitoring
- Monitor API response times
- Track platform API usage
- Log error rates and types
- Monitor database performance

## Troubleshooting

### Common Issues

1. **Platform Authentication Failures**
   - Verify environment variables
   - Check credential validity
   - Confirm API permissions

2. **Session Join Issues**
   - Verify session status
   - Check user permissions
   - Validate token expiry (Agora)

3. **Database Connectivity**
   - Check database configuration
   - Verify connection pool settings
   - Monitor transaction timeouts

### Debug Mode
Enable debug logging by setting:
```bash
DEBUG=live-session:*
```

## Future Enhancements

1. **Recording Integration**
   - Session recording for both platforms
   - Recording management and playback

2. **Analytics**
   - Participant engagement metrics
   - Session quality monitoring
   - Usage analytics dashboard

3. **Advanced Features**
   - Breakout rooms support
   - Screen sharing controls
   - Chat integration
   - Polls and quizzes

4. **Scalability**
   - Multi-region deployment
   - Load balancing for high traffic
   - Database sharding for large datasets

## Support

For technical support or implementation questions:
- Check error logs for specific error codes
- Refer to platform documentation (Agora/Zoom)
- Contact development team for custom requirements
