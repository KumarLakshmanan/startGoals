# Live Session Implementation - Quick Setup Guide

## Prerequisites

1. **Environment Variables Setup**
   Create a `.env` file with the following variables:
   ```bash
   # Agora Configuration
   AGORA_APP_ID=your_agora_app_id
   AGORA_APP_CERTIFICATE=your_agora_app_certificate

   # Zoom Configuration
   ZOOM_ACCOUNT_ID=your_zoom_account_id
   ZOOM_CLIENT_ID=your_zoom_client_id
   ZOOM_CLIENT_SECRET=your_zoom_client_secret

   # Database Configuration
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=startgoals
   DB_USER=your_db_user
   DB_PASSWORD=your_db_password

   # JWT Configuration
   JWT_SECRET=your_jwt_secret
   ```

2. **Dependencies Installation**
   ```bash
   npm install moment moment-timezone axios agora-access-token
   ```

## Quick Test Examples

### 1. Create a Zoom Session

```bash
curl -X POST http://localhost:3000/api/live-sessions/createLiveSession \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "courseId": "550e8400-e29b-41d4-a716-446655440000",
    "batchId": "550e8400-e29b-41d4-a716-446655440001",
    "title": "Introduction to JavaScript",
    "sessionDate": "2025-06-01",
    "startTime": "10:00",
    "endTime": "11:00",
    "durationMinutes": 60,
    "platform": "zoom"
  }'
```

### 2. Create an Agora Session

```bash
curl -X POST http://localhost:3000/api/live-sessions/createLiveSession \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "courseId": "550e8400-e29b-41d4-a716-446655440000",
    "batchId": "550e8400-e29b-41d4-a716-446655440001",
    "title": "Live Coding Session",
    "sessionDate": "2025-06-01",
    "startTime": "14:00",
    "endTime": "15:30",
    "durationMinutes": 90,
    "platform": "agora"
  }'
```

### 3. Start a Session

```bash
curl -X PUT http://localhost:3000/api/live-sessions/{sessionId}/start \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 4. Join a Session (Student)

```bash
curl -X POST http://localhost:3000/api/live-sessions/{sessionId}/join \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "userId": "student123",
    "role": "student"
  }'
```

### 5. Join a Session (Host/Teacher)

```bash
curl -X POST http://localhost:3000/api/live-sessions/{sessionId}/join \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "userId": "teacher456",
    "role": "host"
  }'
```

## Frontend Integration Examples

### React/JavaScript Integration

#### For Agora Sessions

```javascript
// After receiving join data from API
const joinAgoraSession = async (joinData) => {
  const { token, appId, channelName, uid } = joinData;
  
  // Initialize Agora client
  const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
  
  try {
    // Join the channel
    await client.join(appId, channelName, token, uid);
    
    // Create and publish local tracks for host
    if (joinData.role === 'publisher') {
      const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
      const videoTrack = await AgoraRTC.createCameraVideoTrack();
      await client.publish([audioTrack, videoTrack]);
    }
    
    console.log('Successfully joined Agora session');
  } catch (error) {
    console.error('Failed to join Agora session:', error);
  }
};
```

#### For Zoom Sessions

```javascript
// For Zoom, redirect to join URL or embed Zoom Web SDK
const joinZoomSession = (joinData) => {
  const { joinUrl, meetingId, password } = joinData;
  
  // Option 1: Redirect to Zoom (simplest)
  window.open(joinUrl, '_blank');
  
  // Option 2: Use Zoom Web SDK (requires additional setup)
  // ZoomMtg.init({
  //   leaveUrl: window.location.origin,
  //   success: () => {
  //     ZoomMtg.join({
  //       meetingNumber: meetingId,
  //       password: password,
  //       // ... other configuration
  //     });
  //   }
  // });
};
```

### Socket.IO Event Handling

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3000');

// Join session room
socket.emit('join', { sessionId: 'your-session-id' });

// Listen for participant events
socket.on('participantJoined', (data) => {
  console.log('New participant joined:', data);
  updateParticipantsList(data.participant);
});

socket.on('participantMediaUpdated', (data) => {
  console.log('Participant media updated:', data);
  if (data.mediaType === 'mic') {
    updateParticipantMuteStatus(data.participantId, data.isMuted);
  }
});

socket.on('raiseHandReceived', (data) => {
  console.log('Hand raised:', data);
  showRaisedHandNotification(data);
});

// Raise hand (for students)
const raiseHand = (participantId) => {
  fetch(`/api/live-sessions/${sessionId}/raise-hand`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ participantId })
  });
};

// Control participant (for instructors)
const toggleParticipantMic = (participantUserId, allow) => {
  fetch(`/api/live-sessions/${sessionId}/participants/${participantUserId}/mic`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ allow })
  });
};
```

## Common Error Handling

```javascript
const handleAPIError = (error) => {
  if (error.response) {
    const { status, data } = error.response;
    
    switch (status) {
      case 400:
        console.error('Validation Error:', data.message);
        showUserError(data.message);
        break;
      case 401:
        console.error('Authentication Error');
        redirectToLogin();
        break;
      case 403:
        console.error('Permission Denied');
        showUserError('You do not have permission to perform this action');
        break;
      case 404:
        console.error('Session Not Found');
        showUserError('Session not found or has ended');
        break;
      case 429:
        console.error('Rate Limit Exceeded');
        showUserError('Too many requests. Please try again later.');
        break;
      case 500:
        console.error('Server Error:', data.message);
        showUserError('Something went wrong. Please try again.');
        break;
      default:
        console.error('Unknown Error:', data.message);
        showUserError('An unexpected error occurred');
    }
  } else {
    console.error('Network Error:', error.message);
    showUserError('Network error. Please check your connection.');
  }
};
```

## Database Migrations

If you need to create the database tables, here are the migration scripts:

### PostgreSQL Migration

```sql
-- Create live_sessions table
CREATE TABLE live_sessions (
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL,
    batch_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    meeting_link TEXT,
    session_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    duration_minutes INTEGER NOT NULL,
    platform VARCHAR(20) NOT NULL CHECK (platform IN ('agora', 'zoom')),
    platform_session_id VARCHAR(255),
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'active', 'ended')),
    created_by UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create live_session_participants table
CREATE TABLE live_session_participants (
    participant_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES live_sessions(session_id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'student' CHECK (role IN ('host', 'student')),
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    left_at TIMESTAMP,
    is_muted BOOLEAN DEFAULT true,
    is_camera_on BOOLEAN DEFAULT false
);

-- Create raised_hands table
CREATE TABLE raised_hands (
    raised_hand_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES live_sessions(session_id) ON DELETE CASCADE,
    participant_id UUID NOT NULL REFERENCES live_session_participants(participant_id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'addressed')),
    raised_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_live_sessions_course_id ON live_sessions(course_id);
CREATE INDEX idx_live_sessions_batch_id ON live_sessions(batch_id);
CREATE INDEX idx_live_sessions_status ON live_sessions(status);
CREATE INDEX idx_live_sessions_platform ON live_sessions(platform);
CREATE INDEX idx_live_session_participants_session_id ON live_session_participants(session_id);
CREATE INDEX idx_live_session_participants_user_id ON live_session_participants(user_id);
CREATE INDEX idx_raised_hands_session_id ON raised_hands(session_id);
CREATE INDEX idx_raised_hands_status ON raised_hands(status);
```

## Testing the Implementation

### 1. Start the Application

```bash
npm start
# or for development
npm run dev
```

### 2. Test with Postman

Import this Postman collection structure:

```json
{
  "info": {
    "name": "Live Session API",
    "description": "API endpoints for live session management"
  },
  "item": [
    {
      "name": "Create Session",
      "request": {
        "method": "POST",
        "url": "{{base_url}}/api/live-sessions/createLiveSession",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{jwt_token}}"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"courseId\": \"{{course_id}}\",\n  \"batchId\": \"{{batch_id}}\",\n  \"title\": \"Test Session\",\n  \"sessionDate\": \"2025-06-01\",\n  \"startTime\": \"10:00\",\n  \"endTime\": \"11:00\",\n  \"platform\": \"zoom\"\n}"
        }
      }
    }
  ]
}
```

### 3. Monitor Logs

Watch for any errors in the console:
```bash
tail -f logs/app.log
```

## Next Steps

1. **Configure Platform Credentials**
   - Set up Agora project and get credentials
   - Set up Zoom app and get OAuth credentials

2. **Test Platform Integration**
   - Create test sessions for both platforms
   - Verify tokens and meeting creation

3. **Frontend Integration**
   - Integrate with your React/Vue/Angular application
   - Implement real-time event handling

4. **Production Deployment**
   - Set up production environment variables
   - Configure load balancing if needed
   - Set up monitoring and logging

## Support

For issues or questions:
- Check the main documentation: `docs/liveSessionAPI.md`
- Review error logs for specific error messages
- Test with simple API calls using curl or Postman
- Verify environment variables are correctly set
