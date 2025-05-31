// Student Interface JavaScript

let sessionId;
let sessionData;
let participants = [];
let sessionTimer;
let sessionStartTime;
let isHandRaised = false;
let currentRaisedHandId = null;

// Initialize student interface
document.addEventListener('DOMContentLoaded', async () => {
    try {
        sessionId = getSessionIdFromURL();
        const userData = getUserData();
          if (!userData.token || !sessionId || sessionId === 'student') {
            window.location.href = '/api/web/live-session/';
            return;
        }
        
        // Update UI with user info
        document.getElementById('userName').textContent = userData.name || 'Student';
        
        // Initialize components
        agora = new AgoraManager();
        socketManager = new SocketManager();
        
        await initializeSession();
        
    } catch (error) {
        console.error('Failed to initialize student interface:', error);
        notifications.error('Failed to initialize session: ' + error.message);
    }
});

// Initialize session
async function initializeSession() {
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
        
        // Start session timer
        startSessionTimer();
        
        notifications.success('Successfully joined session!');
        
    } catch (error) {
        console.error('Failed to join session:', error);
        notifications.error('Failed to join session: ' + error.message);
    }
}

// Initialize Agora for student
async function initializeAgora() {
    try {
        // Get session configuration
        const config = await api.getSessionConfig(sessionId);
        const uid = generateUID();
        const channelName = config.channelName || `session_${sessionId}`;
        
        // Get Agora token
        const tokenData = await api.getAgoraToken(channelName, uid, 'student');
        
        await agora.initialize(
            config.agoraAppId,
            channelName,
            tokenData.token,
            uid
        );
        
        await agora.join();
        // Students don't auto-publish - they need to unmute first
        
        console.log('Agora initialized for student');
        
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
function updateParticipantsList() {
    const participantsList = document.getElementById('participantsList');
    const participantCount = document.getElementById('participantCount');
    
    if (!participantsList || !participantCount) return;
    
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
                ${participant.role === 'teacher' ? '<i class="fas fa-star" title="Teacher"></i>' : ''}
                <i class="fas fa-microphone status-icon ${participant.isMicOn ? 'active' : 'muted'}"></i>
                <i class="fas fa-video status-icon ${participant.isCameraOn ? 'active' : 'muted'}"></i>
            </div>
        </div>
    `).join('');
}

// Media controls
async function toggleAudio() {
    if (agora) {
        await agora.toggleAudio();
        
        // If unmuting for the first time, publish tracks
        if (!agora.isAudioMuted && !agora.hasPublished) {
            await agora.publish();
            agora.hasPublished = true;
        }
    }
}

async function toggleVideo() {
    if (agora) {
        await agora.toggleVideo();
        
        // If unmuting for the first time, publish tracks
        if (!agora.isVideoMuted && !agora.hasPublished) {
            await agora.publish();
            agora.hasPublished = true;
        }
    }
}

// Raise hand functionality
function toggleRaiseHand() {
    if (isHandRaised) {
        lowerHand();
    } else {
        showRaiseHandModal();
    }
}

function showRaiseHandModal() {
    const modal = document.getElementById('raiseHandModal');
    if (modal) {
        modal.style.display = 'block';
        document.getElementById('questionInput').focus();
    }
}

function closeRaiseHandModal() {
    const modal = document.getElementById('raiseHandModal');
    if (modal) {
        modal.style.display = 'none';
        document.getElementById('questionInput').value = '';
    }
}

async function submitRaiseHand() {
    try {
        const question = document.getElementById('questionInput').value.trim();
        
        const response = await api.raiseHand(sessionId, question);
        currentRaisedHandId = response.raisedHandId;
        
        // Update UI
        setHandRaisedState(true);
        closeRaiseHandModal();
        
        notifications.success('Hand raised! Waiting for teacher response...');
        
    } catch (error) {
        console.error('Failed to raise hand:', error);
        notifications.error('Failed to raise hand: ' + error.message);
    }
}

async function lowerHand() {
    try {
        // In a real implementation, you'd have an API endpoint to lower hand
        // For now, we'll just update the UI
        setHandRaisedState(false);
        currentRaisedHandId = null;
        
        notifications.info('Hand lowered');
        
    } catch (error) {
        console.error('Failed to lower hand:', error);
        notifications.error('Failed to lower hand: ' + error.message);
    }
}

function setHandRaisedState(raised) {
    isHandRaised = raised;
    
    const raiseHandBtn = document.getElementById('raiseHandBtn');
    const handStatusPanel = document.getElementById('handStatusPanel');
    
    if (raiseHandBtn) {
        if (raised) {
            raiseHandBtn.classList.add('active');
            raiseHandBtn.innerHTML = '<i class="fas fa-hand-paper"></i>';
        } else {
            raiseHandBtn.classList.remove('active');
            raiseHandBtn.innerHTML = '<i class="fas fa-hand-paper"></i>';
        }
    }
    
    if (handStatusPanel) {
        handStatusPanel.style.display = raised ? 'block' : 'none';
    }
}

// Leave session
async function leaveSession() {
    const confirmed = confirm('Are you sure you want to leave this session?');
    if (!confirmed) return;
    
    try {
        notifications.info('Leaving session...');
        
        await api.leaveSession(sessionId);
        
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
        
        notifications.success('Left session successfully');
        
        // Redirect after a delay
        setTimeout(() => {
            window.location.href = '/live-session/';
        }, 2000);
        
    } catch (error) {
        console.error('Failed to leave session:', error);
        notifications.error('Failed to leave session: ' + error.message);
    }
}

// Chat functionality
function sendMessage() {
    const chatInput = document.getElementById('chatInput');
    const message = chatInput.value.trim();
    
    if (!message) return;
    
    // Add message to chat (in a real app, this would go through the server)
    const userData = getUserData();
    addChatMessage(userData.name || 'Student', message, true);
    
    chatInput.value = '';
    
    // In a real implementation, send via Socket.IO
    // socketManager.socket.emit('chatMessage', { sessionId, message });
}

function addChatMessage(sender, message, isOwn = false) {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${isOwn ? 'own' : ''}`;
    
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
    
    notifications.info(`${data.userId} joined the session`);
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
    // Show notification for other students
    if (data.userContext.userId !== getUserData().name) {
        notifications.info(`${data.userContext.userId} raised their hand`);
    }
};

window.onRaiseHandResponse = (data) => {
    // Check if this response is for the current user's raised hand
    if (data.raisedHandId === currentRaisedHandId) {
        setHandRaisedState(false);
        currentRaisedHandId = null;
        
        if (data.status === 'accepted') {
            notifications.success('Your hand was accepted by the teacher!');
        } else if (data.status === 'rejected') {
            notifications.warning('Your hand was declined by the teacher');
        }
    }
};

// Handle modal clicks
window.onclick = function(event) {
    const raiseHandModal = document.getElementById('raiseHandModal');
    if (event.target === raiseHandModal) {
        closeRaiseHandModal();
    }
};

// Handle Enter key events
document.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        if (event.target.id === 'chatInput') {
            sendMessage();
        } else if (event.target.id === 'questionInput') {
            submitRaiseHand();
        }
    }
    
    // Handle Escape key
    if (event.key === 'Escape') {
        closeRaiseHandModal();
    }
});

// Keyboard shortcuts
document.addEventListener('keydown', (event) => {
    // Only handle shortcuts if not typing in an input
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return;
    }
    
    // Ctrl/Cmd + M = Toggle audio
    if ((event.ctrlKey || event.metaKey) && event.key === 'm') {
        event.preventDefault();
        toggleAudio();
    }
    
    // Ctrl/Cmd + E = Toggle video
    if ((event.ctrlKey || event.metaKey) && event.key === 'e') {
        event.preventDefault();
        toggleVideo();
    }
    
    // Ctrl/Cmd + H = Raise/Lower hand
    if ((event.ctrlKey || event.metaKey) && event.key === 'h') {
        event.preventDefault();
        toggleRaiseHand();
    }
    
    // Ctrl/Cmd + L = Leave session
    if ((event.ctrlKey || event.metaKey) && event.key === 'l') {
        event.preventDefault();
        leaveSession();
    }
});

// Show keyboard shortcuts info
function showKeyboardShortcuts() {
    notifications.info(`
        Keyboard Shortcuts:<br>
        Ctrl+M: Toggle Audio<br>
        Ctrl+E: Toggle Video<br>
        Ctrl+H: Raise/Lower Hand<br>
        Ctrl+L: Leave Session
    `, 10000);
}

// Add shortcuts info on load
window.addEventListener('load', () => {
    setTimeout(() => {
        showKeyboardShortcuts();
    }, 3000);
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

// Handle browser back button
window.addEventListener('popstate', () => {
    leaveSession();
});
