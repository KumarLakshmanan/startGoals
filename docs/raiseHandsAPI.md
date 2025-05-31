# Raise Hands Functionality API Documentation

## Overview

The Raise Hands system provides comprehensive functionality for managing student-instructor interactions during live sessions. This system allows students to request to speak during sessions, instructors to manage these requests, and implements real-time notifications for seamless communication flow.

## Architecture

### Core Components

1. **Models**
   - `raisedHand.js` - Raise hand request tracking
   - `liveSession.js` - Session information (referenced)
   - `liveSessionParticipant.js` - Participant information (referenced)

2. **Controllers**
   - `liveSessionController.js` - Raise hand workflow management

3. **Routes**
   - `liveSessionRoutes.js` - Raise hand endpoints

4. **Real-time Communication**
   - Socket.IO events for instant notifications
   - WebSocket integration for live updates

## Database Schema

### RaisedHand Table
```sql
- raisedHandId (UUID, Primary Key)
- sessionId (UUID, Foreign Key to live_sessions)
- participantId (UUID, Foreign Key to live_session_participants)
- status (ENUM: 'pending', 'accepted', 'rejected', 'addressed')
- raisedAt (TIMESTAMP, Default: NOW)
- respondedAt (TIMESTAMP, Nullable)
- createdAt (TIMESTAMP)
- updatedAt (TIMESTAMP)
- deletedAt (TIMESTAMP, Nullable)
```

### Status Flow
```
pending → accepted → addressed
pending → rejected
```

### Status Definitions
- **pending**: Student has raised hand, awaiting instructor response
- **accepted**: Instructor has accepted the request, student is unmuted
- **rejected**: Instructor has declined the request
- **addressed**: Interaction completed, student returned to audience mode

## API Endpoints

### Raise Hand Workflow

#### 1. Raise Hand (Student)

**Endpoint:** `POST /api/live-sessions/:sessionId/raise-hand`

**Authentication:** Required (Student role)

**Authorization:** Student must be participant in the session

**Parameters:**
- `sessionId` (UUID) - Live session identifier

**Request Body:**
```json
{
  "participantId": "participant_uuid"
}
```

**Response:**
```json
{
  "status": true,
  "message": "Hand raised successfully",
  "data": {
    "raisedHandId": "raised_hand_uuid",
    "sessionId": "session_uuid",
    "participantId": "participant_uuid",
    "status": "pending",
    "raisedAt": "2025-05-31T14:30:00Z",
    "createdAt": "2025-05-31T14:30:00Z",
    "updatedAt": "2025-05-31T14:30:00Z"
  }
}
```

**Error Responses:**

*Already Has Pending Request:*
```json
{
  "status": false,
  "message": "Participant already has a pending raised hand request."
}
```

*Session Not Active:*
```json
{
  "status": false,
  "message": "Cannot raise hand in a session that is not active or does not exist."
}
```

*Participant Not Found:*
```json
{
  "status": false,
  "message": "Participant not found in this session or has left."
}
```

**Real-time Event Emitted:**
```json
{
  "event": "raiseHandReceived",
  "data": {
    "raisedHandId": "raised_hand_uuid",
    "sessionId": "session_uuid",
    "participantId": "participant_uuid",
    "status": "pending",
    "raisedAt": "2025-05-31T14:30:00Z",
    "userContext": {
      "participantId": "participant_uuid",
      "userId": "user_uuid",
      "role": "student"
    }
  }
}
```

#### 2. List Raised Hands (Instructor)

**Endpoint:** `GET /api/live-sessions/:sessionId/raised-hands`

**Authentication:** Required (Session Instructor)

**Parameters:**
- `sessionId` (UUID) - Live session identifier

**Response:**
```json
{
  "status": true,
  "data": [
    {
      "raisedHandId": "raised_hand_uuid",
      "sessionId": "session_uuid",
      "participantId": "participant_uuid",
      "status": "pending",
      "raisedAt": "2025-05-31T14:30:00Z",
      "respondedAt": null,
      "liveSessionParticipant": {
        "userId": "user_uuid",
        "role": "student"
      }
    },
    {
      "raisedHandId": "raised_hand_uuid_2",
      "sessionId": "session_uuid",
      "participantId": "participant_uuid_2",
      "status": "accepted",
      "raisedAt": "2025-05-31T14:25:00Z",
      "respondedAt": "2025-05-31T14:26:00Z",
      "liveSessionParticipant": {
        "userId": "user_uuid_2",
        "role": "student"
      }
    }
  ]
}
```

**Sorting:** Results are ordered by `raisedAt` in ascending order (oldest first)

#### 3. Respond to Raised Hand (Instructor)

**Endpoint:** `PUT /api/live-sessions/:sessionId/raised-hands/:raisedHandId/respond`

**Authentication:** Required (Session Instructor)

**Parameters:**
- `sessionId` (UUID) - Live session identifier
- `raisedHandId` (UUID) - Raised hand request identifier

**Request Body:**
```json
{
  "action": "accept"  // or "reject"
}
```

**Response:**
```json
{
  "status": true,
  "message": "Raised hand accepted successfully",
  "data": {
    "raisedHandId": "raised_hand_uuid",
    "sessionId": "session_uuid",
    "participantId": "participant_uuid",
    "status": "accepted",
    "raisedAt": "2025-05-31T14:30:00Z",
    "respondedAt": "2025-05-31T14:35:00Z",
    "updatedAt": "2025-05-31T14:35:00Z"
  }
}
```

**Behavior:**

*When Action is "accept":*
1. Updates raised hand status to "accepted"
2. Unmutes the accepted participant
3. Mutes all other student participants
4. Sets respondedAt timestamp

*When Action is "reject":*
1. Updates raised hand status to "rejected"
2. No change to participant media status
3. Sets respondedAt timestamp

**Error Responses:**

*Invalid Action:*
```json
{
  "status": false,
  "message": "Session ID, Raised Hand ID, and a valid action ('accept' or 'reject') are required"
}
```

*Already Responded:*
```json
{
  "status": false,
  "message": "Cannot accept a raised hand that is already accepted."
}
```

*Raised Hand Not Found:*
```json
{
  "status": false,
  "message": "Raised hand request not found"
}
```

**Real-time Events Emitted:**

*Raise Hand Response:*
```json
{
  "event": "raiseHandResponse",
  "data": {
    "raisedHandId": "raised_hand_uuid",
    "sessionId": "session_uuid",
    "participantId": "participant_uuid",
    "status": "accepted",
    "respondedAt": "2025-05-31T14:35:00Z",
    "userContext": {
      "participantId": "participant_uuid",
      "userId": "user_uuid",
      "role": "student"
    }
  }
}
```

*Participant Media Updated (for accepted participant):*
```json
{
  "event": "participantMediaUpdated",
  "data": {
    "participantId": "participant_uuid",
    "userId": "user_uuid",
    "mediaType": "mic",
    "isMuted": false,
    "sessionId": "session_uuid"
  }
}
```

*Participant Media Updated (for other students):*
```json
{
  "event": "participantMediaUpdated",
  "data": {
    "participantId": "other_participant_uuid",
    "userId": "other_user_uuid",
    "mediaType": "mic",
    "isMuted": true,
    "sessionId": "session_uuid"
  }
}
```

#### 4. End Raised Hand Interaction (Instructor)

**Endpoint:** `PUT /api/live-sessions/:sessionId/raised-hands/:raisedHandId/end-interaction`

**Authentication:** Required (Session Instructor)

**Parameters:**
- `sessionId` (UUID) - Live session identifier
- `raisedHandId` (UUID) - Raised hand request identifier

**Request Body:** None

**Response:**
```json
{
  "status": true,
  "message": "Raised hand interaction ended successfully.",
  "data": {
    "raisedHandId": "raised_hand_uuid",
    "sessionId": "session_uuid",
    "participantId": "participant_uuid",
    "status": "addressed",
    "raisedAt": "2025-05-31T14:30:00Z",
    "respondedAt": "2025-05-31T14:35:00Z",
    "updatedAt": "2025-05-31T14:40:00Z"
  }
}
```

**Behavior:**
1. Updates raised hand status to "addressed"
2. Mutes the participant (returns them to audience mode)
3. Optionally turns off participant camera

**Error Responses:**

*Can Only End Accepted Interactions:*
```json
{
  "status": false,
  "message": "Can only end interaction for an 'accepted' raised hand."
}
```

*Session Not Active:*
```json
{
  "status": false,
  "message": "Cannot end interaction in a session that is not active or does not exist."
}
```

**Real-time Events Emitted:**

*Interaction Ended:*
```json
{
  "event": "raiseHandInteractionEnded",
  "data": {
    "raisedHandId": "raised_hand_uuid",
    "sessionId": "session_uuid",
    "participantId": "participant_uuid",
    "status": "addressed",
    "userContext": {
      "participantId": "participant_uuid",
      "userId": "user_uuid",
      "role": "student"
    }
  }
}
```

*Participant Media Updated:*
```json
{
  "event": "participantMediaUpdated",
  "data": {
    "participantId": "participant_uuid",
    "userId": "user_uuid",
    "mediaType": "mic",
    "isMuted": true,
    "sessionId": "session_uuid"
  }
}
```

## Real-time Events (Socket.IO)

### Event Types

#### 1. raiseHandReceived
**Triggered:** When a student raises their hand
**Recipients:** All session participants (especially instructors)
**Purpose:** Notify instructor of new raise hand request

#### 2. raiseHandResponse
**Triggered:** When instructor accepts/rejects a raise hand request
**Recipients:** All session participants
**Purpose:** Notify participants of instructor's decision

#### 3. raiseHandInteractionEnded
**Triggered:** When instructor ends an accepted interaction
**Recipients:** All session participants
**Purpose:** Notify that student has returned to audience mode

#### 4. participantMediaUpdated
**Triggered:** When participant mute/unmute status changes due to raise hand actions
**Recipients:** All session participants
**Purpose:** Update UI to reflect current audio status

### Socket.IO Integration

```javascript
// Client-side Socket.IO setup
import io from 'socket.io-client';

const socket = io('your-server-url');

// Join session room
socket.emit('join', { sessionId: 'session-uuid' });

// Listen for raise hand events
socket.on('raiseHandReceived', (data) => {
  console.log('New raise hand request:', data);
  // Update UI to show raise hand notification
  showRaiseHandNotification(data);
});

socket.on('raiseHandResponse', (data) => {
  console.log('Raise hand response:', data);
  if (data.status === 'accepted') {
    // Show that student is now allowed to speak
    highlightActiveSpeaker(data.userContext.participantId);
  }
});

socket.on('raiseHandInteractionEnded', (data) => {
  console.log('Interaction ended:', data);
  // Remove active speaker highlighting
  removeActiveSpeaker(data.userContext.participantId);
});

socket.on('participantMediaUpdated', (data) => {
  console.log('Media status updated:', data);
  // Update participant's mute/unmute status in UI
  updateParticipantMediaStatus(data.participantId, data.mediaType, data.isMuted);
});
```

## Error Handling

### Common Error Responses

#### 400 Bad Request
```json
{
  "status": false,
  "message": "Session ID and Participant ID are required"
}
```

#### 401 Unauthorized
```json
{
  "status": false,
  "message": "Authentication required"
}
```

#### 403 Forbidden
```json
{
  "status": false,
  "message": "Insufficient permissions for this operation"
}
```

#### 404 Not Found
```json
{
  "status": false,
  "message": "Raised hand request not found"
}
```

#### 409 Conflict
```json
{
  "status": false,
  "message": "Participant already has a pending raised hand request."
}
```

#### 500 Internal Server Error
```json
{
  "status": false,
  "message": "Internal server error",
  "error": "Detailed error message"
}
```

## Implementation Features

### Transaction Safety
- All raise hand operations use database transactions
- Automatic rollback on errors to maintain consistency
- Atomic updates for complex state changes

### Authorization
- Role-based access control (students vs instructors)
- Session-specific permissions
- Participant validation

### Real-time Communication
- Instant notifications via Socket.IO
- Room-based event broadcasting
- Selective event targeting

### State Management
- Proper status flow enforcement
- Duplicate request prevention
- Consistent media state management

## Usage Examples

### Student Raising Hand

```javascript
const raiseHand = async (sessionId, participantId) => {
  try {
    const response = await fetch(
      `/api/live-sessions/${sessionId}/raise-hand`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer student-token'
        },
        body: JSON.stringify({
          participantId
        })
      }
    );
    
    const data = await response.json();
    if (data.status) {
      console.log('Hand raised successfully:', data.data);
      // Update UI to show "hand raised" status
      showHandRaisedStatus();
    } else {
      console.error('Failed to raise hand:', data.message);
      showError(data.message);
    }
  } catch (error) {
    console.error('Error raising hand:', error);
  }
};
```

### Instructor Viewing Raised Hands

```javascript
const fetchRaisedHands = async (sessionId) => {
  try {
    const response = await fetch(
      `/api/live-sessions/${sessionId}/raised-hands`,
      {
        headers: {
          'Authorization': 'Bearer instructor-token'
        }
      }
    );
    
    const data = await response.json();
    if (data.status) {
      console.log('Raised hands:', data.data);
      // Update UI with raised hands list
      updateRaisedHandsList(data.data);
    }
  } catch (error) {
    console.error('Error fetching raised hands:', error);
  }
};
```

### Instructor Responding to Raised Hand

```javascript
const respondToRaisedHand = async (sessionId, raisedHandId, action) => {
  try {
    const response = await fetch(
      `/api/live-sessions/${sessionId}/raised-hands/${raisedHandId}/respond`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer instructor-token'
        },
        body: JSON.stringify({
          action // 'accept' or 'reject'
        })
      }
    );
    
    const data = await response.json();
    if (data.status) {
      console.log(`Raised hand ${action}ed:`, data.data);
      if (action === 'accept') {
        // Update UI to show active speaker
        setActiveSpeaker(data.data.participantId);
      }
      // Remove from raised hands list
      removeFromRaisedHandsList(raisedHandId);
    }
  } catch (error) {
    console.error('Error responding to raised hand:', error);
  }
};
```

### Instructor Ending Interaction

```javascript
const endInteraction = async (sessionId, raisedHandId) => {
  try {
    const response = await fetch(
      `/api/live-sessions/${sessionId}/raised-hands/${raisedHandId}/end-interaction`,
      {
        method: 'PUT',
        headers: {
          'Authorization': 'Bearer instructor-token'
        }
      }
    );
    
    const data = await response.json();
    if (data.status) {
      console.log('Interaction ended:', data.data);
      // Remove active speaker status
      removeActiveSpeaker(data.data.participantId);
    }
  } catch (error) {
    console.error('Error ending interaction:', error);
  }
};
```

### Complete React Component Example

```jsx
import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';

const RaiseHandComponent = ({ sessionId, participantId, userRole, authToken }) => {
  const [hasRaisedHand, setHasRaisedHand] = useState(false);
  const [raisedHands, setRaisedHands] = useState([]);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io('your-server-url');
    newSocket.emit('join', { sessionId });
    setSocket(newSocket);

    // Listen for raise hand events
    newSocket.on('raiseHandReceived', (data) => {
      if (userRole === 'instructor') {
        setRaisedHands(prev => [...prev, data]);
      }
    });

    newSocket.on('raiseHandResponse', (data) => {
      if (data.userContext.participantId === participantId) {
        setHasRaisedHand(false);
      }
      // Update raised hands list
      setRaisedHands(prev => 
        prev.filter(hand => hand.raisedHandId !== data.raisedHandId)
      );
    });

    return () => newSocket.close();
  }, [sessionId, participantId, userRole]);

  const handleRaiseHand = async () => {
    try {
      const response = await fetch(
        `/api/live-sessions/${sessionId}/raise-hand`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({ participantId })
        }
      );
      
      const data = await response.json();
      if (data.status) {
        setHasRaisedHand(true);
      }
    } catch (error) {
      console.error('Error raising hand:', error);
    }
  };

  const handleRespondToRaisedHand = async (raisedHandId, action) => {
    try {
      const response = await fetch(
        `/api/live-sessions/${sessionId}/raised-hands/${raisedHandId}/respond`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({ action })
        }
      );
      
      const data = await response.json();
      if (data.status) {
        console.log(`Raised hand ${action}ed`);
      }
    } catch (error) {
      console.error('Error responding to raised hand:', error);
    }
  };

  if (userRole === 'student') {
    return (
      <div className="raise-hand-student">
        <button 
          onClick={handleRaiseHand}
          disabled={hasRaisedHand}
          className={`raise-hand-btn ${hasRaisedHand ? 'raised' : ''}`}
        >
          {hasRaisedHand ? '✋ Hand Raised' : '🙋 Raise Hand'}
        </button>
      </div>
    );
  }

  if (userRole === 'instructor') {
    return (
      <div className="raise-hand-instructor">
        <h3>Raised Hands ({raisedHands.length})</h3>
        <div className="raised-hands-list">
          {raisedHands.map(hand => (
            <div key={hand.raisedHandId} className="raised-hand-item">
              <span>Student {hand.userContext.userId}</span>
              <div className="actions">
                <button 
                  onClick={() => handleRespondToRaisedHand(hand.raisedHandId, 'accept')}
                  className="accept-btn"
                >
                  Accept
                </button>
                <button 
                  onClick={() => handleRespondToRaisedHand(hand.raisedHandId, 'reject')}
                  className="reject-btn"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
};

export default RaiseHandComponent;
```

## Best Practices

### User Experience
1. **Clear Visual Feedback**: Provide immediate UI updates for all raise hand actions
2. **Intuitive Controls**: Use recognizable icons and clear button states
3. **Real-time Updates**: Ensure UI reflects current state instantly
4. **Status Indicators**: Show who is currently speaking and who has raised hands

### Performance
1. **Efficient Queries**: Use proper database indexing for frequently accessed data
2. **Minimal Data Transfer**: Send only necessary data in real-time events
3. **Connection Management**: Handle socket disconnections gracefully
4. **Caching**: Cache session and participant data appropriately

### Security
1. **Role Validation**: Verify user roles before allowing actions
2. **Session Authorization**: Ensure users can only access their sessions
3. **Input Validation**: Validate all request parameters and body data
4. **Rate Limiting**: Prevent spam raise hand requests

### Error Handling
1. **Graceful Degradation**: Handle network failures gracefully
2. **User Feedback**: Provide clear error messages to users
3. **Retry Mechanisms**: Implement automatic retries for failed operations
4. **Logging**: Log all raise hand activities for debugging

## Common Workflows

### Typical Raise Hand Session Flow

1. **Session Start**: Instructor starts live session, all students muted
2. **Student Raises Hand**: Student clicks raise hand button
3. **Notification**: Instructor receives real-time notification
4. **Instructor Review**: Instructor sees list of pending raise hand requests
5. **Accept/Reject**: Instructor decides to accept or reject the request
6. **Audio Control**: If accepted, student is unmuted, others remain muted
7. **Interaction**: Student and instructor have conversation
8. **End Interaction**: Instructor ends interaction, student returns to muted state
9. **Next Request**: Process continues with next raise hand request

### Queue Management

```javascript
// Example of managing multiple raise hand requests
class RaiseHandQueue {
  constructor() {
    this.queue = [];
    this.currentSpeaker = null;
  }

  addToQueue(raisedHand) {
    if (!this.queue.find(item => item.participantId === raisedHand.participantId)) {
      this.queue.push(raisedHand);
      this.sortByTimestamp();
    }
  }

  removeFromQueue(raisedHandId) {
    this.queue = this.queue.filter(item => item.raisedHandId !== raisedHandId);
  }

  setCurrentSpeaker(participantId) {
    this.currentSpeaker = participantId;
  }

  clearCurrentSpeaker() {
    this.currentSpeaker = null;
  }

  getNext() {
    return this.queue[0] || null;
  }

  sortByTimestamp() {
    this.queue.sort((a, b) => new Date(a.raisedAt) - new Date(b.raisedAt));
  }
}
```

## Testing

### Unit Test Examples

```javascript
import { raiseHand, respondToRaisedHand } from '../controller/liveSessionController.js';

describe('Raise Hand Controller', () => {
  describe('raiseHand', () => {
    it('should create raised hand request successfully', async () => {
      const req = {
        params: { sessionId: 'valid-session-uuid' },
        body: { participantId: 'valid-participant-uuid' },
        app: { get: jest.fn().mockReturnValue(mockSocketIO) }
      };
      
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      
      await raiseHand(req, res);
      
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: true,
          message: 'Hand raised successfully'
        })
      );
    });

    it('should prevent duplicate raise hand requests', async () => {
      // Test duplicate prevention logic
      const req = {
        params: { sessionId: 'valid-session-uuid' },
        body: { participantId: 'participant-with-pending-request' },
        app: { get: jest.fn().mockReturnValue(mockSocketIO) }
      };
      
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      
      await raiseHand(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: false,
          message: 'Participant already has a pending raised hand request.'
        })
      );
    });
  });

  describe('respondToRaisedHand', () => {
    it('should accept raised hand and update participant status', async () => {
      const req = {
        params: { 
          sessionId: 'valid-session-uuid',
          raisedHandId: 'valid-raised-hand-uuid'
        },
        body: { action: 'accept' },
        app: { get: jest.fn().mockReturnValue(mockSocketIO) }
      };
      
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      
      await respondToRaisedHand(req, res);
      
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: true,
          message: 'Raised hand accepted successfully'
        })
      );
    });
  });
});
```

### Integration Test Example

```javascript
describe('Raise Hand Integration', () => {
  it('should complete full raise hand workflow', async () => {
    // 1. Student raises hand
    const raiseResponse = await request(app)
      .post(`/api/live-sessions/${sessionId}/raise-hand`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ participantId })
      .expect(201);

    const raisedHandId = raiseResponse.body.data.raisedHandId;

    // 2. Instructor lists raised hands
    const listResponse = await request(app)
      .get(`/api/live-sessions/${sessionId}/raised-hands`)
      .set('Authorization', `Bearer ${instructorToken}`)
      .expect(200);

    expect(listResponse.body.data).toHaveLength(1);
    expect(listResponse.body.data[0].raisedHandId).toBe(raisedHandId);

    // 3. Instructor accepts raised hand
    const acceptResponse = await request(app)
      .put(`/api/live-sessions/${sessionId}/raised-hands/${raisedHandId}/respond`)
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({ action: 'accept' })
      .expect(200);

    expect(acceptResponse.body.data.status).toBe('accepted');

    // 4. Instructor ends interaction
    const endResponse = await request(app)
      .put(`/api/live-sessions/${sessionId}/raised-hands/${raisedHandId}/end-interaction`)
      .set('Authorization', `Bearer ${instructorToken}`)
      .expect(200);

    expect(endResponse.body.data.status).toBe('addressed');
  });
});
```

## Future Enhancements

1. **Queue Management**: Visual queue showing order of raise hand requests
2. **Time Limits**: Automatic interaction timeouts for better session flow
3. **Priority System**: VIP or urgent raise hand requests
4. **Analytics**: Track raise hand patterns and engagement metrics
5. **Auto-moderation**: AI-powered inappropriate content detection
6. **Breakout Rooms**: Raise hand functionality in smaller groups
7. **Recording Integration**: Mark raise hand interactions in session recordings
8. **Mobile Optimization**: Enhanced mobile raise hand experience
9. **Accessibility**: Screen reader and keyboard navigation support
10. **Custom Actions**: Configurable instructor response options beyond accept/reject

## Support

For additional support or questions regarding the Raise Hands functionality:

1. Verify session status and participant roles
2. Check Socket.IO connection for real-time events
3. Review authentication and authorization setup
4. Test with proper session and participant data
5. Monitor database transaction logs for consistency issues
6. Ensure proper error handling in client applications
