// services/agoraService.js
import pkg from "agora-access-token";
const { RtcTokenBuilder, RtcRole } = pkg;

import dotenv from "dotenv";
dotenv.config();

class AgoraService {
    constructor() {
        // Initialize Agora SDK or configurations if needed
    }

    // Generate Agora Token
    generateToken(channelName, userId, role, expirationTimeInSeconds) {
        const agoraAppId = process.env.AGORA_APP_ID;
        const agoraAppCertificate = process.env.AGORA_APP_CERTIFICATE;

        if (!agoraAppId || !agoraAppCertificate) {
            console.error('Agora App ID or App Certificate is not configured.');
            throw new Error('Agora credentials not configured.');
        }

        const currentTimestamp = Math.floor(Date.now() / 1000);
        const privilegeExpiredTs = currentTimestamp + (expirationTimeInSeconds || 3600); // Default to 1 hour

        const token = RtcTokenBuilder.buildTokenWithUid(
            agoraAppId,
            agoraAppCertificate,
            channelName,
            userId,
            role, // Role needs to be RtcRole.PUBLISHER or RtcRole.SUBSCRIBER
            privilegeExpiredTs
        );

        return {
            token: token,
            appId: agoraAppId,
            channelName,
            userId,
            role,
            // certificate: agoraAppCertificate, // It's generally not advised to send the app certificate to the client
            privilegeExpiredTs,
        };
    }    // Example method: Create Agora Live Session
    async createLiveSession(sessionDetails) {
        try {
            console.log('Creating Agora live session:', sessionDetails);
            
            // For Agora, the platformSessionId is typically the channel name
            const channelName = sessionDetails.channelName || `agora_session_${Date.now()}`;
            
            // Validate Agora credentials
            const agoraAppId = process.env.AGORA_APP_ID;
            const agoraAppCertificate = process.env.AGORA_APP_CERTIFICATE;
            
            if (!agoraAppId || !agoraAppCertificate) {
                throw new Error('Agora credentials not configured.');
            }
            
            // For Agora, creating a session is mainly about setting up the channel
            // The actual channel is created when the first user joins
            const sessionData = {
                platformSessionId: channelName,
                appId: agoraAppId,
                channelName: channelName,
                title: sessionDetails.title,
                status: 'created'
            };
            
            console.log('Agora session created successfully:', sessionData);
            return sessionData;
            
        } catch (error) {
            console.error('Error creating Agora session:', error);
            throw error;
        }
    }
    // Example method: Start Agora Live Session
    async startLiveSession(platformSessionId) {
        try {
            console.log('Starting Agora live session:', platformSessionId);
            
            // For Agora, starting a session is mainly informational
            // The actual channel becomes active when users join
            // We could implement cloud recording start here if needed
            
            const sessionData = {
                status: 'started',
                platformSessionId: platformSessionId,
                channelName: platformSessionId,
                startedAt: new Date().toISOString(),
                message: 'Agora channel is ready for participants to join'
            };
            
            console.log('Agora session started successfully:', sessionData);
            return sessionData;
            
        } catch (error) {
            console.error('Error starting Agora session:', error);
            throw error;
        }
    }
    // Example method: End Agora Live Session
    async endLiveSession(platformSessionId) {
        try {
            console.log('Ending Agora live session:', platformSessionId);
            
            // For Agora, ending a session is mainly informational
            // The channel automatically becomes inactive when all users leave
            // We could implement cloud recording stop here if needed
            
            const sessionData = {
                status: 'ended',
                platformSessionId: platformSessionId,
                channelName: platformSessionId,
                endedAt: new Date().toISOString(),
                message: 'Agora channel session ended'
            };
            
            console.log('Agora session ended successfully:', sessionData);
            return sessionData;
            
        } catch (error) {
            console.error('Error ending Agora session:', error);
            throw error;
        }
    }

    // Participant Controls (Agora Specific)
    async controlParticipantMic(channelName, targetUserId, mute) {
        // Placeholder for Agora SDK call to mute/unmute a specific user's mic
        console.log(`AgoraService: Setting mic for user ${targetUserId} in channel ${channelName} to ${mute ? 'muted' : 'unmuted'}`);
        // Example: agoraEngine.muteRemoteAudioStream(targetUserId, mute);
        return { success: true, userId: targetUserId, isMuted: mute };
    }

    async controlParticipantCamera(channelName, targetUserId, disable) {
        // Placeholder for Agora SDK call to disable/enable a specific user's camera
        console.log(`AgoraService: Setting camera for user ${targetUserId} in channel ${channelName} to ${disable ? 'disabled' : 'enabled'}`);
        // Example: agoraEngine.muteRemoteVideoStream(targetUserId, disable);
        return { success: true, userId: targetUserId, isCameraOff: disable };
    }

    async removeParticipant(channelName, targetUserId) {
        // Placeholder for Agora SDK call to kick a user from the channel
        console.log(`AgoraService: Removing user ${targetUserId} from channel ${channelName}`);
        // Example: agoraEngine.kickUser(targetUserId, channelName); // Fictional method, actual API might differ
        return { success: true, userId: targetUserId, message: 'Participant removed from Agora session' };
    }

    // Generate channel name with validation
    generateChannelName(prefix = 'session') {
        // Agora channel names must be ASCII characters only
        // Length should be less than 64 characters
        const timestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substring(7);
        const channelName = `${prefix}_${timestamp}_${randomSuffix}`;
        
        // Validate channel name
        if (channelName.length > 64) {
            throw new Error('Channel name too long');
        }
        
        // Check for valid ASCII characters
        if (!/^[a-zA-Z0-9_-]+$/.test(channelName)) {
            throw new Error('Channel name contains invalid characters');
        }
        
        return channelName;
    }

    // Enhanced token generation with better error handling
    generateTokenWithValidation(channelName, userId, role, expirationTimeInSeconds = 3600) {
        try {
            // Validate inputs
            if (!channelName || typeof channelName !== 'string') {
                throw new Error('Invalid channel name');
            }
            
            if (!userId || (typeof userId !== 'number' && typeof userId !== 'string')) {
                throw new Error('Invalid user ID');
            }
            
            if (typeof userId === 'string') {
                userId = parseInt(userId);
                if (isNaN(userId)) {
                    throw new Error('User ID must be a valid number');
                }
            }
            
            if (role !== RtcRole.PUBLISHER && role !== RtcRole.SUBSCRIBER) {
                throw new Error('Invalid role specified');
            }
            
            return this.generateToken(channelName, userId, role, expirationTimeInSeconds);
            
        } catch (error) {
            console.error('Token generation validation failed:', error);
            throw error;
        }
    }

    // Add other Agora-specific methods here (e.g., recording)

    // Cloud Recording
    async startCloudRecording(channelName, userId, token) {
        // Placeholder for starting cloud recording
        console.log(`AgoraService: Starting cloud recording for channel ${channelName}`);
        // Actual Agora cloud recording start logic using Agora's RESTful APIs
        // This would typically involve making an HTTP request to Agora's /acquire, /start, and /query endpoints.
        // Ensure you have the necessary customer ID, secret, and handle UID generation for recording.
        return { success: true, message: 'Cloud recording started (placeholder)', recordingId: 'mockRecordingId' };
    }

    async stopCloudRecording(channelName, recordingId, userId) {
        // Placeholder for stopping cloud recording
        console.log(`AgoraService: Stopping cloud recording ${recordingId} for channel ${channelName}`);
        // Actual Agora cloud recording stop logic using Agora's RESTful APIs
        // This would involve making an HTTP request to Agora's /stop endpoint.
        return { success: true, message: 'Cloud recording stopped (placeholder)' };
    }
}

export default new AgoraService();