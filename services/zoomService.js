// services/zoomService.js
import axios from 'axios';
import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

// Potentially import zoomConfig functions if they are not directly part of this class
// import { getZoomAccessToken, generateZoomSignature } from '../config/zoomconfig.js';

class ZoomService {
    constructor() {
        // Initialize Zoom SDK or configurations if needed
        this.zoomApiBaseUrl = 'https://api.zoom.us/v2';
    }

    async getAccessToken() {
        const ZOOM_ACCOUNT_ID = process.env.ZOOM_ACCOUNT_ID;
        const ZOOM_CLIENT_ID = process.env.ZOOM_CLIENT_ID;
        const ZOOM_CLIENT_SECRET = process.env.ZOOM_CLIENT_SECRET;

        if (!ZOOM_ACCOUNT_ID || !ZOOM_CLIENT_ID || !ZOOM_CLIENT_SECRET) {
            console.error('Zoom API credentials not configured.');
            throw new Error('Zoom API credentials not configured.');
        }

        try {
            const response = await axios.post(
                `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${ZOOM_ACCOUNT_ID}`,
                {},
                {
                    auth: {
                        username: ZOOM_CLIENT_ID,
                        password: ZOOM_CLIENT_SECRET,
                    },
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                    },
                }
            );
            return response.data.access_token;
        } catch (error) {
            console.error(
                "Error fetching Zoom access token:",
                error.response?.data || error.message
            );
            throw new Error("Unable to retrieve Zoom access token");
        }
    }

    // Example method: Create Zoom Live Meeting
    async createLiveMeeting(meetingDetails) {
        try {
            console.log('Creating Zoom live meeting:', meetingDetails);
            const accessToken = await this.getAccessToken();
            
            // Prepare meeting data for Zoom API
            const meetingData = {
                topic: meetingDetails.topic || meetingDetails.title || 'Live Session',
                type: 2, // Scheduled meeting
                start_time: meetingDetails.start_time,
                duration: meetingDetails.duration || 60,
                timezone: meetingDetails.timezone || 'UTC',
                settings: {
                    host_video: true,
                    participant_video: false,
                    cn_meeting: false,
                    in_meeting: false,
                    join_before_host: true,
                    mute_upon_entry: true,
                    watermark: false,
                    use_pmi: false,
                    approval_type: 0,
                    registration_type: 1,
                    audio: 'both',
                    auto_recording: 'none',
                    waiting_room: false,
                    ...meetingDetails.settings
                }
            };
            
            const response = await axios.post(
                `${this.zoomApiBaseUrl}/users/me/meetings`,
                meetingData,
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            const meetingResponse = response.data;
            console.log('Zoom meeting created successfully:', meetingResponse);
            
            return {
                id: meetingResponse.id,
                start_url: meetingResponse.start_url,
                join_url: meetingResponse.join_url,
                password: meetingResponse.password,
                topic: meetingResponse.topic,
                start_time: meetingResponse.start_time,
                duration: meetingResponse.duration,
                status: 'created',
                ...meetingResponse
            };
            
        } catch (error) {
            console.error('Error creating Zoom meeting:', error.response?.data || error.message);
            throw new Error(`Failed to create Zoom meeting: ${error.response?.data?.message || error.message}`);
        }
    }

    // Example method: Start Zoom Live Meeting (often part of creation or handled by user via start_url)
    async startLiveMeeting(meetingId) {
        try {
            console.log('Starting Zoom live meeting:', meetingId);
            const accessToken = await this.getAccessToken();
            
            // Update meeting status to started (if needed)
            // Note: Zoom meetings are typically started by host via start_url
            // This is more for tracking purposes on our end
            
            const response = await axios.patch(
                `${this.zoomApiBaseUrl}/meetings/${meetingId}`,
                {
                    settings: {
                        host_video: true,
                        participant_video: false
                    }
                },
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            console.log('Zoom meeting started/updated successfully');
            return { 
                status: 'started',
                meetingId: meetingId,
                message: 'Meeting is ready to start. Host should use start_url to begin.'
            };
            
        } catch (error) {
            console.error('Error starting Zoom meeting:', error.response?.data || error.message);
            return { 
                status: 'error',
                message: 'Failed to start meeting, but host can still use start_url',
                meetingId: meetingId
            };
        }
    }

    // Example method: End Zoom Live Meeting
    async endLiveMeeting(meetingId) {
        try {
            console.log('Ending Zoom live meeting:', meetingId);
            const accessToken = await this.getAccessToken();
            
            // End the meeting
            const response = await axios.patch(
                `${this.zoomApiBaseUrl}/meetings/${meetingId}/status`,
                {
                    action: 'end'
                },
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            console.log('Zoom meeting ended successfully');
            return { 
                status: 'ended',
                meetingId: meetingId,
                message: 'Meeting ended successfully'
            };
            
        } catch (error) {
            console.error('Error ending Zoom meeting:', error.response?.data || error.message);
            return { 
                status: 'error',
                message: `Failed to end meeting: ${error.response?.data?.message || error.message}`,
                meetingId: meetingId
            };
        }
    }

    // Example method: Generate Zoom Join Link (often the join_url from meeting creation)
    generateJoinLink(meetingInfo) {
        console.log('Generating Zoom join link for meeting:', meetingInfo.id);
        return meetingInfo.join_url; // Or construct if needed
    }

    // Generate Zoom SDK Signature (for Meeting SDK)
    generateSdkSignature(meetingNumber, role) {
        const ZOOM_API_KEY = process.env.ZOOM_API_KEY; // Or SDK Key
        const ZOOM_API_SECRET = process.env.ZOOM_API_SECRET; // Or SDK Secret

        if (!ZOOM_API_KEY || !ZOOM_API_SECRET) {
            console.error('Zoom SDK Key/Secret not configured.');
            throw new Error('Zoom SDK credentials not configured.');
        }

        try {
            const timestamp = new Date().getTime() - 30000;
            const msg = Buffer.from(
                `${ZOOM_API_KEY}${meetingNumber}${timestamp}${role}`
            ).toString("base64");

            const hash = crypto
                .createHmac("sha256", ZOOM_API_SECRET)
                .update(msg)
                .digest("base64");

            const signature = Buffer.from(
                `${ZOOM_API_KEY}.${meetingNumber}.${timestamp}.${role}.${hash}`
            ).toString("base64");

            return signature;
        } catch (error) {
            console.error("Error generating Zoom SDK signature:", error);
            throw new Error("Failed to generate Zoom SDK signature");
        }
    }

    // Get meeting details
    async getMeetingDetails(meetingId) {
        try {
            const accessToken = await this.getAccessToken();
            
            const response = await axios.get(
                `${this.zoomApiBaseUrl}/meetings/${meetingId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            return response.data;
            
        } catch (error) {
            console.error('Error fetching Zoom meeting details:', error.response?.data || error.message);
            throw new Error(`Failed to fetch meeting details: ${error.response?.data?.message || error.message}`);
        }
    }

    // Update meeting details
    async updateMeeting(meetingId, updateData) {
        try {
            const accessToken = await this.getAccessToken();
            
            const response = await axios.patch(
                `${this.zoomApiBaseUrl}/meetings/${meetingId}`,
                updateData,
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            return response.data;
            
        } catch (error) {
            console.error('Error updating Zoom meeting:', error.response?.data || error.message);
            throw new Error(`Failed to update meeting: ${error.response?.data?.message || error.message}`);
        }
    }

    // Delete meeting
    async deleteMeeting(meetingId) {
        try {
            const accessToken = await this.getAccessToken();
            
            await axios.delete(
                `${this.zoomApiBaseUrl}/meetings/${meetingId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            console.log('Zoom meeting deleted successfully');
            return { 
                status: 'deleted',
                meetingId: meetingId,
                message: 'Meeting deleted successfully'
            };
            
        } catch (error) {
            console.error('Error deleting Zoom meeting:', error.response?.data || error.message);
            throw new Error(`Failed to delete meeting: ${error.response?.data?.message || error.message}`);
        }
    }

    // Add other Zoom-specific methods here (e.g., recording management, webhook handling)
}

export default new ZoomService();