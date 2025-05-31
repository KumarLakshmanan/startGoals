// Teacher Dashboard JavaScript

let sessionId;
let sessionData;
let participants = [];
let raisedHands = [];
let sessionTimer;
let sessionStartTime;

// Initialize teacher dashboard
document.addEventListener('DOMContentLoaded', async () => {
    try {
        sessionId = getSessionIdFromURL();
        const userData = getUserData();
          if (!userData.token) {
            window.location.href = '/api/web/live-session/';
            return;
        }
        
        // Update UI with user info
        document.getElementById('userName').textContent = userData.name || 'Teacher';
        
        // Initialize components
        agora = new AgoraManager();
        socketManager = new SocketManager();
        
        // Check if we need to create a new session or join existing
        if (sessionId && sessionId !== 'teacher') {
            await initializeExistingSession();
        } else {
            showCreateSessionModal();
        }
        
    } catch (error) {
        console.error('Failed to initialize teacher dashboard:', error);
        notifications.error('Failed to initialize dashboard: ' + error.message);
    }
});

// Initialize existing session
async function initializeExistingSession() {
    try {
        notifications.info('Joining session...');
        
        // Join session via API
        const joinResponse = await api.joinSession(sessionId);
        sessionData = joinResponse.session;
        
        // Update session info
        updateSessionInfo();
        
        // Initialize Agora
        await initializeAgora();
        
        // Connect to Socket.IO
        socketManager.connect(sessionId);
        
        // Load initial data
        await loadParticipants();
        await loadRaisedHands();
        
        // Start session timer
        startSessionTimer();
        
        notifications.success('Successfully joined session!');
        
    } catch (error) {
        console.error('Failed to join session:', error);
        notifications.error('Failed to join session: ' + error.message);
    }
}

// Initialize Agora for teacher
async function initializeAgora() {
    try {
        // Get session configuration
        const config = await api.getSessionConfig(sessionId);
        const uid = generateUID();
        const channelName = config.channelName || `session_${sessionId}`;
        
        // Get Agora token
        const tokenData = await api.getAgoraToken(channelName, uid, 'teacher');
        
        await agora.initialize(
            config.agoraAppId,
            channelName,
            tokenData.token,
            uid
        );
        
        await agora.join();
        await agora.publish();
        
        console.log('Agora initialized for teacher');
        
    } catch (error) {
        console.error('Failed to initialize Agora:', error);
        notifications.error('Failed to initialize video: ' + error.message);
    }
}

// Update session information display
function updateSessionInfo() {
    if (sessionData) {
        document.getElementById('sessionInfo').textContent = 
            `Session: ${sessionData.title || sessionId}`;
    }
}

// Load participants
async function loadParticipants() {
    try {
        const response = await api.getParticipants(sessionId);
        participants = response.participants || [];
        updateParticipantsList();
    } catch (error) {
        console.error('Failed to load participants:', error);
    }
}

// Update participants list in UI
function updateParticipantsList(remoteUsers = {}) {
    const participantsList = document.getElementById('participantsList');
    const participantCount = document.getElementById('participantCount');
    
    if (!participantsList || !participantCount) return;
    
    // Combine API participants with Agora remote users
    const activeParticipants = participants.filter(p => !p.leftAt);
    
    participantCount.textContent = activeParticipants.length;
    
    participantsList.innerHTML = activeParticipants.map(participant => `
        <div class="participant-item" data-participant-id="${participant.participantId}">
            <div class="participant-info">
                <div class="participant-avatar">
                    ${participant.userId.charAt(0).toUpperCase()}
                </div>
                <div class="participant-details">
                    <div class="participant-name">${participant.userId}</div>
                    <div class="participant-role">${participant.role}</div>
                </div>
            </div>
            <div class="participant-status">
                <i class="fas fa-microphone status-icon ${participant.isMicOn ? 'active' : 'muted'}"></i>
                <i class="fas fa-video status-icon ${participant.isCameraOn ? 'active' : 'muted'}"></i>
            </div>
        </div>
    `).join('');
}

// Load raised hands
async function loadRaisedHands() {
    try {
        const response = await api.getRaisedHands(sessionId);
        raisedHands = response.raisedHands || [];
        updateRaisedHandsList();
    } catch (error) {
        console.error('Failed to load raised hands:', error);
    }
}

// Update raised hands list in UI
function updateRaisedHandsList() {
    const raisedHandsList = document.getElementById('raisedHandsList');
    const raisedHandsCount = document.getElementById('raisedHandsCount');
    
    if (!raisedHandsList || !raisedHandsCount) return;
    
    const pendingHands = raisedHands.filter(hand => hand.status === 'pending');
    
    raisedHandsCount.textContent = pendingHands.length;
    
    raisedHandsList.innerHTML = pendingHands.map(hand => `
        <div class="raised-hand-item" data-hand-id="${hand.raisedHandId}">
            <div class="raised-hand-header">
                <div class="raised-hand-user">${hand.participantId}</div>
                <div class="raised-hand-time">${formatTimestamp(hand.raisedAt)}</div>
            </div>
            ${hand.question ? `<div class="raised-hand-question">"${hand.question}"</div>` : ''}
            <div class="raised-hand-actions">
                <button class="btn btn-sm btn-primary" onclick="respondToRaisedHand('${hand.raisedHandId}', 'accepted')">
                    <i class="fas fa-check"></i> Accept
                </button>
                <button class="btn btn-sm btn-secondary" onclick="respondToRaisedHand('${hand.raisedHandId}', 'rejected')">
                    <i class="fas fa-times"></i> Decline
                </button>
            </div>
        </div>
    `).join('');
}

// Respond to raised hand
async function respondToRaisedHand(raisedHandId, status) {
    try {
        await api.respondToRaisedHand(sessionId, raisedHandId, status);
        
        // Update local data
        const handIndex = raisedHands.findIndex(h => h.raisedHandId === raisedHandId);
        if (handIndex !== -1) {
            raisedHands[handIndex].status = status;
            raisedHands[handIndex].respondedAt = new Date().toISOString();
        }
        
        updateRaisedHandsList();
        
        notifications.success(`Hand ${status} successfully`);
        
    } catch (error) {
        console.error('Failed to respond to raised hand:', error);
        notifications.error('Failed to respond to raised hand: ' + error.message);
    }
}

// Media controls
function toggleAudio() {
    if (agora) {
        agora.toggleAudio();
    }
}

function toggleVideo() {
    if (agora) {
        agora.toggleVideo();
    }
}

function shareScreen() {
    // Screen sharing implementation would go here
    notifications.info('Screen sharing feature coming soon!');
}

// Session management
function showCreateSessionModal() {
    const modal = document.getElementById('createSessionModal');
    if (modal) {
        modal.style.display = 'block';
        
        // Set default values
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('sessionDate').value = today;
        
        const now = new Date();
        const startTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        const endTime = `${(now.getHours() + 1).toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        document.getElementById('startTime').value = startTime;
        document.getElementById('endTime').value = endTime;
    }
}

function closeCreateModal() {
    const modal = document.getElementById('createSessionModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

async function createSession() {
    try {
        const form = document.getElementById('createSessionForm');
        const formData = new FormData(form);
        
        const sessionData = {
            title: formData.get('title'),
            courseId: formData.get('courseId'),
            batchId: formData.get('batchId'),
            sessionDate: formData.get('sessionDate'),
            startTime: formData.get('startTime'),
            endTime: formData.get('endTime'),
            platform: formData.get('platform') || 'agora'
        };
        
        notifications.info('Creating session...');
        
        const response = await api.createSession(sessionData);
        sessionId = response.session.sessionId;
        
        // Update URL
        window.history.replaceState({}, '', `/live-session/teacher/${sessionId}`);
        
        // Close modal
        closeCreateModal();
        
        // Initialize the created session
        await initializeExistingSession();
        
    } catch (error) {
        console.error('Failed to create session:', error);
        notifications.error('Failed to create session: ' + error.message);
    }
}

async function endSession() {
    if (!sessionId) return;
    
    const confirmed = confirm('Are you sure you want to end this session? This action cannot be undone.');
    if (!confirmed) return;
    
    try {
        notifications.info('Ending session...');
        
        await api.endSession(sessionId);
        
        // Leave Agora
        if (agora) {
            await agora.leave();
        }
        
        // Disconnect socket
        if (socketManager) {
            socketManager.disconnect();
        }
        
        // Stop timer
        if (sessionTimer) {
            clearInterval(sessionTimer);
        }
        
        notifications.success('Session ended successfully');
        
        // Redirect after a delay
        setTimeout(() => {
            window.location.href = '/live-session/';
        }, 2000);
        
    } catch (error) {
        console.error('Failed to end session:', error);
        notifications.error('Failed to end session: ' + error.message);
    }
}

// Chat functionality
function sendMessage() {
    const chatInput = document.getElementById('chatInput');
    const message = chatInput.value.trim();
    
    if (!message) return;
    
    // Add message to chat (in a real app, this would go through the server)
    addChatMessage('Teacher', message, true);
    
    chatInput.value = '';
    
    // In a real implementation, send via Socket.IO
    // socketManager.socket.emit('chatMessage', { sessionId, message });
}

function addChatMessage(sender, message, isOwn = false) {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${isOwn ? 'own' : ''} teacher`;
    
    messageDiv.innerHTML = `
        <div class="message-header">
            <div class="message-sender">${sender}</div>
            <div class="message-time">${formatTimestamp(new Date().toISOString())}</div>
        </div>
        <div class="message-content">${message}</div>
    `;
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Session timer
function startSessionTimer() {
    sessionStartTime = Date.now();
    
    sessionTimer = setInterval(() => {
        const elapsed = Math.floor((Date.now() - sessionStartTime) / 1000);
        const durationElement = document.getElementById('sessionDuration');
        if (durationElement) {
            durationElement.textContent = formatTime(elapsed);
        }
    }, 1000);
}

// Socket.IO event handlers
window.onParticipantJoined = (data) => {
    // Add to participants list
    participants.push(data.participant);
    updateParticipantsList();
    
    notifications.success(`${data.userId} joined the session`);
};

window.onParticipantLeft = (data) => {
    // Update participant in list
    const participantIndex = participants.findIndex(p => p.participantId === data.participantId);
    if (participantIndex !== -1) {
        participants[participantIndex].leftAt = data.leftAt;
        updateParticipantsList();
    }
    
    notifications.info(`${data.userId} left the session`);
};

window.onRaiseHandReceived = (data) => {
    // Add to raised hands list
    raisedHands.push({
        raisedHandId: data.raisedHandId,
        participantId: data.participantId,
        userId: data.userContext.userId,
        question: data.question,
        raisedAt: new Date().toISOString(),
        status: 'pending'
    });
    
    updateRaisedHandsList();
    
    notifications.warning(`${data.userContext.userId} raised their hand`);
};

window.onRaiseHandResponse = (data) => {
    // Update raised hand status
    const handIndex = raisedHands.findIndex(h => h.raisedHandId === data.raisedHandId);
    if (handIndex !== -1) {
        raisedHands[handIndex].status = data.status;
        raisedHands[handIndex].respondedAt = data.respondedAt;
    }
    
    updateRaisedHandsList();
};

// Handle modal clicks
window.onclick = function(event) {
    const createModal = document.getElementById('createSessionModal');
    if (event.target === createModal) {
        closeCreateModal();
    }
};

// Handle Enter key in chat
document.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && event.target.id === 'chatInput') {
        sendMessage();
    }
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (agora) {
        agora.leave();
    }
    if (socketManager) {
        socketManager.disconnect();
    }
    if (sessionTimer) {
        clearInterval(sessionTimer);
    }
});
