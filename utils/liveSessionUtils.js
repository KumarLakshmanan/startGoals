// utils/liveSessionUtils.js
import moment from 'moment-timezone';

/**
 * Format date and time for different platforms
 */
export const formatDateTime = {
  // Format for Zoom API (ISO 8601)
  forZoom: (date, time, timezone = 'UTC') => {
    try {
      const dateTimeString = `${date}T${time}`;
      const momentObj = moment.tz(dateTimeString, timezone);
      return momentObj.toISOString();
    } catch (error) {
      throw new Error(`Invalid date/time format: ${error.message}`);
    }
  },

  // Format for Agora (mainly for logging and reference)
  forAgora: (date, time, timezone = 'UTC') => {
    try {
      const dateTimeString = `${date}T${time}`;
      const momentObj = moment.tz(dateTimeString, timezone);
      return momentObj.format('YYYY-MM-DD HH:mm:ss');
    } catch (error) {
      throw new Error(`Invalid date/time format: ${error.message}`);
    }
  },

  // Get current timestamp
  getCurrentTimestamp: () => {
    return moment().toISOString();
  },

  // Calculate duration in minutes
  calculateDuration: (startTime, endTime) => {
    try {
      const start = moment(`1970-01-01T${startTime}Z`);
      const end = moment(`1970-01-01T${endTime}Z`);
      
      if (!start.isValid() || !end.isValid()) {
        throw new Error('Invalid time format');
      }
      
      const duration = end.diff(start, 'minutes');
      
      if (duration <= 0) {
        throw new Error('End time must be after start time');
      }
      
      return duration;
    } catch (error) {
      throw new Error(`Duration calculation failed: ${error.message}`);
    }
  }
};

/**
 * Validate session input data
 */
export const validateSessionInput = {
  // Validate basic session data
  basic: (sessionData) => {
    const errors = [];
    
    if (!sessionData.title || typeof sessionData.title !== 'string' || sessionData.title.trim().length === 0) {
      errors.push('Title is required and must be a non-empty string');
    }
    
    if (sessionData.title && sessionData.title.length > 100) {
      errors.push('Title must be less than 100 characters');
    }
    
    if (!sessionData.sessionDate) {
      errors.push('Session date is required');
    } else {
      const datePattern = /^\d{4}-\d{2}-\d{2}$/;
      if (!datePattern.test(sessionData.sessionDate)) {
        errors.push('Session date must be in YYYY-MM-DD format');
      }
    }
    
    if (!sessionData.startTime) {
      errors.push('Start time is required');
    } else {
      const timePattern = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timePattern.test(sessionData.startTime)) {
        errors.push('Start time must be in HH:MM format');
      }
    }
    
    if (!sessionData.endTime) {
      errors.push('End time is required');
    } else {
      const timePattern = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timePattern.test(sessionData.endTime)) {
        errors.push('End time must be in HH:MM format');
      }
    }
    
    if (!sessionData.platform || !['agora', 'zoom'].includes(sessionData.platform.toLowerCase())) {
      errors.push('Platform must be either "agora" or "zoom"');
    }
    
    return errors;
  },

  // Validate UUIDs
  uuid: (value, fieldName) => {
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!value || !uuidPattern.test(value)) {
      return `${fieldName} must be a valid UUID`;
    }
    return null;
  },

  // Validate time range
  timeRange: (startTime, endTime) => {
    try {
      const duration = formatDateTime.calculateDuration(startTime, endTime);
      
      if (duration < 5) {
        return 'Session must be at least 5 minutes long';
      }
      
      if (duration > 480) { // 8 hours
        return 'Session cannot be longer than 8 hours';
      }
      
      return null;
    } catch (error) {
      return error.message;
    }
  }
};

/**
 * Generate meeting-specific data
 */
export const generateMeetingData = {
  // Generate Agora channel name
  agoraChannelName: (title, sessionId) => {
    try {
      // Clean title for channel name (Agora requirements)
      const cleanTitle = title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);
      const timestamp = Date.now();
      const shortSessionId = sessionId ? sessionId.split('-')[0] : 'session';
      
      const channelName = `${cleanTitle}_${shortSessionId}_${timestamp}`;
      
      // Ensure it's within Agora's 64 character limit
      return channelName.substring(0, 64);
    } catch (error) {
      // Fallback to timestamp-based name
      return `session_${Date.now()}`;
    }
  },

  // Generate Zoom meeting topic
  zoomTopic: (title, sessionDate, startTime) => {
    try {
      const date = moment(sessionDate).format('MMM DD, YYYY');
      const time = moment(`1970-01-01T${startTime}Z`).format('HH:mm');
      return `${title} - ${date} at ${time}`;
    } catch (error) {
      return title;
    }
  }
};

/**
 * Error handling utilities
 */
export const handlePlatformErrors = {
  agora: (error) => {
    console.error('Agora Error:', error);
    
    if (error.message.includes('Invalid channel name')) {
      return {
        status: false,
        message: 'Invalid session configuration. Please check session details.',
        code: 'INVALID_CHANNEL'
      };
    }
    
    if (error.message.includes('credentials')) {
      return {
        status: false,
        message: 'Platform configuration error. Please contact support.',
        code: 'CONFIG_ERROR'
      };
    }
    
    return {
      status: false,
      message: 'Failed to create Agora session. Please try again.',
      code: 'AGORA_ERROR'
    };
  },

  zoom: (error) => {
    console.error('Zoom Error:', error);
    
    if (error.response?.status === 401) {
      return {
        status: false,
        message: 'Platform authentication failed. Please contact support.',
        code: 'AUTH_ERROR'
      };
    }
    
    if (error.response?.status === 429) {
      return {
        status: false,
        message: 'Too many requests. Please try again later.',
        code: 'RATE_LIMIT'
      };
    }
    
    if (error.response?.data?.message) {
      return {
        status: false,
        message: `Zoom API Error: ${error.response.data.message}`,
        code: 'ZOOM_API_ERROR'
      };
    }
    
    return {
      status: false,
      message: 'Failed to create Zoom meeting. Please try again.',
      code: 'ZOOM_ERROR'
    };
  }
};
