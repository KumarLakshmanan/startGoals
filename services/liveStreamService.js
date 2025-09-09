// services/liveStreamService.js
import agoraService from "./agoraService.js";
import zoomService from "./zoomService.js";

class LiveStreamService {
  /**
   * Generate live stream links for a lesson
   * @param {Object} lesson - Lesson object
   * @param {string} instructorId - Instructor user ID
   * @returns {Object} Updated lesson with stream links
   */
  async generateStreamLinks(lesson, instructorId) {
    try {
      if (lesson.type !== 'live') {
        throw new Error('Only live lessons can have stream links');
      }

      const streamData = {};

      // Generate Agora channel and token
      try {
        const agoraChannelName = `lesson_${lesson.lessonId}_${Date.now()}`;
        const agoraToken = agoraService.generateToken(
          agoraChannelName,
          instructorId,
          'publisher', // Instructor role
          24 * 60 * 60 // 24 hours expiry
        );

        streamData.agoraChannelName = agoraChannelName;
        streamData.agoraToken = agoraToken;
        streamData.agoraAppId = process.env.AGORA_APP_ID;

        console.log(`Generated Agora channel: ${agoraChannelName}`);
      } catch (agoraError) {
        console.error('Failed to generate Agora links:', agoraError);
      }

      // Generate Zoom meeting
      try {
        const zoomMeeting = await zoomService.createLiveMeeting({
          topic: `Live Lesson: ${lesson.title}`,
          type: 2, // Scheduled meeting
          start_time: lesson.streamStartDateTime ? lesson.streamStartDateTime.toISOString() : new Date().toISOString(),
          duration: Math.ceil((lesson.duration || 60) / 60), // Convert minutes to hours, default 1 hour
          timezone: 'UTC',
          settings: {
            host_video: true,
            participant_video: true,
            cn_meeting: false,
            in_meeting: false,
            join_before_host: false,
            mute_upon_entry: true,
            watermark: false,
            use_pmi: false,
            approval_type: 1,
            audio: 'both',
            auto_recording: 'cloud',
          }
        });

        streamData.zoomMeetingId = zoomMeeting.id.toString();
        streamData.zoomJoinUrl = zoomMeeting.join_url;
        streamData.zoomStartUrl = zoomMeeting.start_url;
        streamData.zoomPassword = zoomMeeting.password;

        console.log(`Generated Zoom meeting: ${zoomMeeting.id}`);
      } catch (zoomError) {
        console.error('Failed to generate Zoom meeting:', zoomError);
      }

      return streamData;
    } catch (error) {
      console.error('Error generating stream links:', error);
      throw error;
    }
  }

  /**
   * Generate student access token for Agora
   * @param {string} channelName - Agora channel name
   * @param {string} studentId - Student user ID
   * @returns {string} Agora token for student
   */
  generateStudentToken(channelName, studentId) {
    try {
      return agoraService.generateToken(
        channelName,
        studentId,
        'subscriber', // Student role
        4 * 60 * 60 // 4 hours expiry
      );
    } catch (error) {
      console.error('Error generating student token:', error);
      throw error;
    }
  }

  /**
   * Update live stream status
   * @param {string} lessonId - Lesson ID
   * @param {string} status - New status (scheduled, live, ended, cancelled)
   * @returns {boolean} Success status
   */
  async updateStreamStatus(lessonId, status) {
    try {
      const Lesson = (await import('../model/lesson.js')).default;
      await Lesson.update(
        { liveStreamStatus: status },
        { where: { lessonId } }
      );
      return true;
    } catch (error) {
      console.error('Error updating stream status:', error);
      return false;
    }
  }

  /**
   * Clean up expired tokens and meetings
   * @param {string} lessonId - Lesson ID
   */
  async cleanupStreamResources(lessonId) {
    try {
      const Lesson = (await import('../model/lesson.js')).default;
      const lesson = await Lesson.findByPk(lessonId);
      
      if (!lesson) {
        throw new Error('Lesson not found');
      }

      // Clean up Zoom meeting if it exists
      if (lesson.zoomMeetingId) {
        try {
          await zoomService.deleteMeeting(lesson.zoomMeetingId);
          console.log(`Deleted Zoom meeting: ${lesson.zoomMeetingId}`);
        } catch (zoomError) {
          console.error('Failed to delete Zoom meeting:', zoomError);
        }
      }

      // Clear stream data from lesson
      await lesson.update({
        agoraChannelName: null,
        agoraToken: null,
        zoomMeetingId: null,
        zoomJoinUrl: null,
        zoomStartUrl: null,
        zoomPassword: null,
        liveStreamStatus: 'ended'
      });

      console.log(`Cleaned up stream resources for lesson: ${lessonId}`);
    } catch (error) {
      console.error('Error cleaning up stream resources:', error);
      throw error;
    }
  }
}

export default new LiveStreamService();
