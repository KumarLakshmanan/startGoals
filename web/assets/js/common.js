// Common utilities for Live Session Web Interface

class LiveSessionAPI {
    constructor() {
        this.baseURL = window.location.origin;
        this.apiURL = `${this.baseURL}/api`;
        this.token = sessionStorage.getItem('userToken');
    }

    // Helper method for API requests
    async request(endpoint, options = {}) {
        const url = `${this.apiURL}${endpoint}`;
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': this.token ? `Bearer ${this.token}` : '',
                ...options.headers
            }
        };

        try {
            const response = await fetch(url, { ...defaultOptions, ...options });
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || `HTTP ${response.status}`);
            }
            
            return data;
        } catch (error) {
            console.error('API Request failed:', error);
            throw error;
        }
    }

    // Live Session API endpoints
    async createSession(sessionData) {
        return this.request('/live-sessions', {
            method: 'POST',
            body: JSON.stringify(sessionData)
        });
    }

    async joinSession(sessionId) {
        return this.request(`/live-sessions/${sessionId}/join`, {
            method: 'POST'
        });
    }

    async leaveSession(sessionId) {
        return this.request(`/live-sessions/${sessionId}/leave`, {
            method: 'POST'
        });
    }

    async endSession(sessionId) {
        return this.request(`/live-sessions/${sessionId}/end`, {
            method: 'POST'
        });
    }

    async getParticipants(sessionId) {
        return this.request(`/live-sessions/${sessionId}/participants`);
    }

    async raiseHand(sessionId, question = '') {
        return this.request(`/live-sessions/${sessionId}/raise-hand`, {
            method: 'POST',
            body: JSON.stringify({ question })
        });
    }

    async respondToRaisedHand(sessionId, raisedHandId, status) {
        return this.request(`/live-sessions/${sessionId}/raised-hands/${raisedHandId}/respond`, {
            method: 'POST',
            body: JSON.stringify({ status })
        });
    }

    async getRaisedHands(sessionId) {
        return this.request(`/live-sessions/${sessionId}/raised-hands`);
    }    async getSessionConfig(sessionId) {
        return this.request(`/web/live-session/api/session-config/${sessionId}`);
    }

    // Get Agora token
    async getAgoraToken(channelName, userId, role) {
        return this.request(`/web/live-session/api/agora-token`, {
            method: 'POST',
            body: JSON.stringify({ channelName, userId, role })
        });
    }
}

class NotificationManager {
    constructor() {
        this.container = document.getElementById('notifications') || this.createContainer();
    }

    createContainer() {
        const container = document.createElement('div');
        container.id = 'notifications';
        container.className = 'notifications-container';
        document.body.appendChild(container);
        return container;
    }

    show(message, type = 'info', duration = 5000) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        notification.innerHTML = `
            <div class="notification-header">
                <div class="notification-title">${this.getTitle(type)}</div>
                <div class="notification-close" onclick="this.parentElement.parentElement.remove()">×</div>
            </div>
            <div class="notification-message">${message}</div>
        `;

        this.container.appendChild(notification);

        // Auto remove after duration
        if (duration > 0) {
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, duration);
        }

        return notification;
    }

    getTitle(type) {
        const titles = {
            success: 'Success',
            error: 'Error',
            warning: 'Warning',
            info: 'Info'
        };
        return titles[type] || 'Notification';
    }

    success(message, duration) {
        return this.show(message, 'success', duration);
    }

    error(message, duration) {
        return this.show(message, 'error', duration);
    }

    warning(message, duration) {
        return this.show(message, 'warning', duration);
    }

    info(message, duration) {
        return this.show(message, 'info', duration);
    }
}

class AgoraManager {
    constructor() {
        this.client = null;
        this.localAudioTrack = null;
        this.localVideoTrack = null;
        this.remoteUsers = {};
        this.isAudioMuted = true;
        this.isVideoMuted = true;
        this.appId = null;
        this.channel = null;
        this.token = null;
        this.uid = null;
    }

    async initialize(appId, channel, token, uid) {
        try {
            this.appId = appId;
            this.channel = channel;
            this.token = token;
            this.uid = uid;

            // Create Agora client
            this.client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });

            // Set up event listeners
            this.setupEventListeners();

            console.log('Agora manager initialized');
            return true;
        } catch (error) {
            console.error('Failed to initialize Agora:', error);
            throw error;
        }
    }

    setupEventListeners() {
        this.client.on("user-published", async (user, mediaType) => {
            await this.client.subscribe(user, mediaType);
            console.log("Subscribe success");

            if (mediaType === 'video') {
                const remoteVideoTrack = user.videoTrack;
                this.playRemoteVideo(user, remoteVideoTrack);
            }

            if (mediaType === 'audio') {
                const remoteAudioTrack = user.audioTrack;
                remoteAudioTrack.play();
            }

            this.remoteUsers[user.uid] = user;
            this.updateParticipantsList();
        });

        this.client.on("user-unpublished", (user) => {
            delete this.remoteUsers[user.uid];
            this.removeRemoteVideo(user);
            this.updateParticipantsList();
        });

        this.client.on("user-left", (user) => {
            delete this.remoteUsers[user.uid];
            this.removeRemoteVideo(user);
            this.updateParticipantsList();
        });
    }

    async join() {
        try {
            await this.client.join(this.appId, this.channel, this.token, this.uid);
            console.log('Joined Agora channel successfully');
            
            // Create local tracks
            await this.createLocalTracks();
            
            return true;
        } catch (error) {
            console.error('Failed to join Agora channel:', error);
            throw error;
        }
    }

    async createLocalTracks() {
        try {
            [this.localAudioTrack, this.localVideoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
            
            // Initially mute both audio and video
            await this.localAudioTrack.setMuted(this.isAudioMuted);
            await this.localVideoTrack.setMuted(this.isVideoMuted);
            
            // Play local video
            this.playLocalVideo();
            
            console.log('Local tracks created');
        } catch (error) {
            console.error('Failed to create local tracks:', error);
            throw error;
        }
    }

    playLocalVideo() {
        const localVideoContainer = document.getElementById('localVideo') || document.getElementById('localVideoSmall');
        if (localVideoContainer && this.localVideoTrack) {
            this.localVideoTrack.play(localVideoContainer);
        }
    }

    playRemoteVideo(user, videoTrack) {
        // For teacher dashboard - add to participants grid
        const participantsGrid = document.getElementById('participantsGrid');
        if (participantsGrid) {
            const videoContainer = document.createElement('div');
            videoContainer.className = 'participant-video';
            videoContainer.id = `remote-video-${user.uid}`;
            
            const nameLabel = document.createElement('div');
            nameLabel.className = 'participant-name';
            nameLabel.textContent = `User ${user.uid}`;
            
            videoContainer.appendChild(nameLabel);
            participantsGrid.appendChild(videoContainer);
            
            videoTrack.play(videoContainer);
        }
        
        // For student interface - show teacher video
        const teacherVideo = document.getElementById('teacherVideo');
        if (teacherVideo) {
            videoTrack.play(teacherVideo);
        }
    }

    removeRemoteVideo(user) {
        const videoContainer = document.getElementById(`remote-video-${user.uid}`);
        if (videoContainer) {
            videoContainer.remove();
        }
    }

    async toggleAudio() {
        if (this.localAudioTrack) {
            this.isAudioMuted = !this.isAudioMuted;
            await this.localAudioTrack.setMuted(this.isAudioMuted);
            
            // Update UI
            const audioBtn = document.getElementById('toggleAudio');
            if (audioBtn) {
                const icon = audioBtn.querySelector('i');
                if (this.isAudioMuted) {
                    icon.className = 'fas fa-microphone-slash';
                    audioBtn.classList.add('muted');
                } else {
                    icon.className = 'fas fa-microphone';
                    audioBtn.classList.remove('muted');
                }
            }
            
            console.log(`Audio ${this.isAudioMuted ? 'muted' : 'unmuted'}`);
        }
    }

    async toggleVideo() {
        if (this.localVideoTrack) {
            this.isVideoMuted = !this.isVideoMuted;
            await this.localVideoTrack.setMuted(this.isVideoMuted);
            
            // Update UI
            const videoBtn = document.getElementById('toggleVideo');
            if (videoBtn) {
                const icon = videoBtn.querySelector('i');
                if (this.isVideoMuted) {
                    icon.className = 'fas fa-video-slash';
                    videoBtn.classList.add('muted');
                } else {
                    icon.className = 'fas fa-video';
                    videoBtn.classList.remove('muted');
                }
            }
            
            console.log(`Video ${this.isVideoMuted ? 'muted' : 'unmuted'}`);
        }
    }

    async publish() {
        try {
            if (this.localAudioTrack && this.localVideoTrack) {
                await this.client.publish([this.localAudioTrack, this.localVideoTrack]);
                console.log('Published local tracks');
            }
        } catch (error) {
            console.error('Failed to publish tracks:', error);
            throw error;
        }
    }

    async leave() {
        try {
            // Unpublish tracks
            if (this.localAudioTrack) {
                this.localAudioTrack.close();
            }
            if (this.localVideoTrack) {
                this.localVideoTrack.close();
            }
            
            // Leave channel
            await this.client.leave();
            console.log('Left Agora channel');
        } catch (error) {
            console.error('Failed to leave Agora channel:', error);
            throw error;
        }
    }

    updateParticipantsList() {
        // This will be implemented by the specific page (teacher/student)
        if (window.updateParticipantsList) {
            window.updateParticipantsList(this.remoteUsers);
        }
    }
}

class SocketManager {
    constructor() {
        this.socket = null;
        this.sessionId = null;
    }

    connect(sessionId) {
        this.sessionId = sessionId;
        this.socket = io();
        
        this.setupEventListeners();
        
        // Join session room
        this.socket.emit('joinSession', { sessionId });
        
        console.log('Socket connected for session:', sessionId);
    }

    setupEventListeners() {
        this.socket.on('connect', () => {
            console.log('Socket.IO connected');
            this.updateConnectionStatus('connected');
        });

        this.socket.on('disconnect', () => {
            console.log('Socket.IO disconnected');
            this.updateConnectionStatus('disconnected');
        });

        this.socket.on('participantJoined', (data) => {
            console.log('Participant joined:', data);
            if (window.onParticipantJoined) {
                window.onParticipantJoined(data);
            }
        });

        this.socket.on('participantLeft', (data) => {
            console.log('Participant left:', data);
            if (window.onParticipantLeft) {
                window.onParticipantLeft(data);
            }
        });

        this.socket.on('raiseHandReceived', (data) => {
            console.log('Hand raised:', data);
            if (window.onRaiseHandReceived) {
                window.onRaiseHandReceived(data);
            }
        });

        this.socket.on('raiseHandResponse', (data) => {
            console.log('Hand response:', data);
            if (window.onRaiseHandResponse) {
                window.onRaiseHandResponse(data);
            }
        });
    }

    updateConnectionStatus(status) {
        const statusIndicator = document.querySelector('.status-indicator');
        if (statusIndicator) {
            statusIndicator.className = `status-indicator ${status}`;
            const statusText = statusIndicator.querySelector('span');
            if (statusText) {
                const statusTexts = {
                    connected: 'Connected',
                    connecting: 'Connecting...',
                    disconnected: 'Disconnected'
                };
                statusText.textContent = statusTexts[status] || status;
            }
        }
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }
}

// Utility functions
function getSessionIdFromURL() {
    const pathParts = window.location.pathname.split('/');
    return pathParts[pathParts.length - 1];
}

function getUserData() {
    return {
        token: sessionStorage.getItem('userToken'),
        name: sessionStorage.getItem('userName'),
        role: sessionStorage.getItem('userRole')
    };
}

function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function formatTimestamp(timestamp) {
    return new Date(timestamp).toLocaleTimeString();
}

function generateUID() {
    return Math.floor(Math.random() * 1000000);
}

// Global instances (will be initialized by each page)
let api;
let notifications;
let agora;
let socketManager;

// Initialize common components
document.addEventListener('DOMContentLoaded', () => {
    api = new LiveSessionAPI();
    notifications = new NotificationManager();
    
    console.log('Common utilities initialized');
});

// Export for use in other scripts
window.LiveSessionAPI = LiveSessionAPI;
window.NotificationManager = NotificationManager;
window.AgoraManager = AgoraManager;
window.SocketManager = SocketManager;
window.getSessionIdFromURL = getSessionIdFromURL;
window.getUserData = getUserData;
window.formatTime = formatTime;
window.formatTimestamp = formatTimestamp;
window.generateUID = generateUID;
