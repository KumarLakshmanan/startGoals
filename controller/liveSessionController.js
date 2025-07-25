// controllers/liveSessionController.js
import sequelize from "../config/db.js";
import LiveSession from "../model/liveSession.js";
import Batch from "../model/batch.js";
import Course from "../model/course.js";
import LiveSessionParticipant from "../model/liveSessionParticipant.js";
import RaisedHand from "../model/raisedHand.js";
import AgoraAccessToken from "agora-access-token";
import axios from "axios";
import agoraService from "../services/agoraService.js";
import zoomService from "../services/zoomService.js";
import { Op } from "sequelize";
import {
  formatDateTime,
  validateSessionInput,
  generateMeetingData,
  handlePlatformErrors,
} from "../utils/liveSessionUtils.js";
import {
  sendSuccess,
  sendError,
  sendValidationError,
  sendNotFound,
  sendUnauthorized,
  sendForbidden,
  sendServerError,
  sendConflict
} from "../utils/responseHelper.js";

const { RtcRole } = AgoraAccessToken;

export const createLiveSession = async (req, res) => {
  const io = req.app.get("io");

  const t = await sequelize.transaction();

  // Helper function to safely rollback transaction
  const safeRollback = async () => {
    if (t && !t.finished) {
      await t.rollback();
    }
  };

  try {
    const {
      courseId,
      batchId,
      title,
      sessionDate,
      startTime,
      endTime,
      durationMinutes,
      platform,
    } = req.body;

    // ✅ Input validation using utility functions
    const basicValidationErrors = validateSessionInput.basic({
      title,
      sessionDate,
      startTime,
      endTime,
      platform,
    });

    if (basicValidationErrors.length > 0) {
      return sendValidationError(res, "Validation failed", basicValidationErrors);
    }

    // Additional UUID validations
    const courseIdError = validateSessionInput.uuid(courseId, "Course ID");
    const batchIdError = validateSessionInput.uuid(batchId, "Batch ID");

    if (courseIdError || batchIdError) {
      return sendValidationError(res, "Invalid ID format", [courseIdError, batchIdError].filter(Boolean));
    }

    // Validate time range
    const timeRangeError = validateSessionInput.timeRange(startTime, endTime);
    if (timeRangeError) {
      return sendValidationError(res, timeRangeError);
    }

    // ✅ Validate course & batch existence
    // ✅ Validate course & batch existence without fetching full objects
    const course = await Course.count({
      where: { courseId },
      transaction: t,
    });
    const batch = await Batch.count({
      where: { batchId },
      transaction: t,
    });
    if (!course) {
      await safeRollback();
      return sendNotFound(res, "Course not found");
    }

    if (!batch) {
      await safeRollback();
      return sendNotFound(res, "Batch not found");
    }

    // ✅ Optionally calculate duration if not sent
    let duration = durationMinutes;
    if (!durationMinutes) {
      const start = new Date(`1970-01-01T${startTime}Z`);
      const end = new Date(`1970-01-01T${endTime}Z`);
      duration = Math.floor((end - start) / 60000); // in minutes
    } // ✅ Platform-specific session creation
    let platformSessionDetails;
    let generatedMeetingLink;

    if (platform.toLowerCase() === "agora") {
      // For Agora, channelName is often the platformSessionId
      // Generate a unique and valid channel name
      const channelName = agoraService.generateChannelName(
        `session_${title.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 20)}`,
      );

      platformSessionDetails = await agoraService.createLiveSession({
        channelName: channelName,
        title,
        sessionDate,
        startTime,
        endTime,
        duration,
      });

      // Agora typically doesn't have a 'meetingLink' in the same way Zoom does; it uses channel names.
      // The client would use the channelName and a token to join.
      generatedMeetingLink = `agora:${platformSessionDetails.platformSessionId || channelName}`;
    } else if (platform.toLowerCase() === "zoom") {
      // Format the start time properly for Zoom API using utility function
      const formattedStartTime = formatDateTime.forZoom(sessionDate, startTime);

      platformSessionDetails = await zoomService.createLiveMeeting({
        topic: title,
        start_time: formattedStartTime,
        duration: duration,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        settings: {
          join_before_host: true,
          mute_upon_entry: true,
          participant_video: false,
          host_video: true,
          waiting_room: false,
          audio: "both",
          auto_recording: "none",
        },
      });

      generatedMeetingLink = platformSessionDetails.join_url;
    } else {
      await safeRollback();
      return sendError(res, "Invalid platform specified. Choose 'agora' or 'zoom'.");
    }

    if (!platformSessionDetails) {
      await safeRollback();
      return sendServerError(res, `Failed to create session on ${platform}.`);
    }

    // ✅ Create Live Session in DB
    const session = await LiveSession.create(
      {
        courseId,
        batchId,
        title,
        meetingLink: generatedMeetingLink, // Use the generated link
        sessionDate,
        startTime,
        endTime,
        durationMinutes: duration,
        createdBy: req.user?.userId || null,
        platform,
        platformSessionId:
          platform.toLowerCase() === "agora"
            ? platformSessionDetails.platformSessionId
            : platformSessionDetails.id, // Agora channel or Zoom meeting ID
      },
      { transaction: t },
    );

    await t.commit();
    return sendSuccess(res, "Live session created successfully", session);
  } catch (error) {
    console.error("Live session creation error:", error);
    // Only rollback if transaction is still active
    await safeRollback();
    return sendServerError(res, "Internal server error", error.message);
  }
};

// Start Live Session
export const startLiveSession = async (req, res) => {
  const io = req.app.get("io");

  const t = await sequelize.transaction();

  // Helper function to safely rollback transaction
  const safeRollback = async () => {
    if (t && !t.finished) {
      await t.rollback();
    }
  };

  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return sendValidationError(res, "Session ID is required");
    }

    const session = await LiveSession.findByPk(sessionId, { transaction: t });
    if (!session) {
      await safeRollback();
      return sendNotFound(res, "Live session not found");
    }

    if (session.status === "active") {
      await safeRollback();
      return sendConflict(res, "Session is already active");
    }

    if (session.status === "ended") {
      await safeRollback();
      return sendConflict(res, "Cannot start an ended session");
    } // Platform-specific start logic
    try {
      if (session.platform === "agora") {
        await agoraService.startLiveSession(session.platformSessionId);
        // Additional Agora-specific actions after starting, if any
      } else if (session.platform === "zoom") {
        // Zoom meetings are often started by the host via start_url.
        // This call could be to update status or ensure the meeting is ready.
        await zoomService.startLiveMeeting(session.platformSessionId);
        // Additional Zoom-specific actions after starting, if any
      } else {
        await t.rollback();
        return sendError(res, "Unknown platform for this session.");
      }
    } catch (platformError) {
      console.error(`${session.platform} session start error:`, platformError);
      await t.rollback();

      const errorResponse =
        session.platform.toLowerCase() === "agora"
          ? handlePlatformErrors.agora(platformError)
          : handlePlatformErrors.zoom(platformError);

      return sendServerError(res, `Failed to start ${session.platform} session: ${errorResponse.message}`, errorResponse.code);
    }

    session.status = "active";
    await session.save({ transaction: t });

    await t.commit();
    return sendSuccess(res, `Live session on ${session.platform} started successfully`, session);
  } catch (error) {
    console.error("Error starting live session:", error);
    await t.rollback();
    return sendServerError(res, "Internal server error", error.message);
  }
};

// End Live Session
export const endLiveSession = async (req, res) => {
  const io = req.app.get("io");

  const t = await sequelize.transaction();
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return sendValidationError(res, "Session ID is required");
    }

    const session = await LiveSession.findByPk(sessionId, { transaction: t });

    if (!session) {
      await t.rollback();
      return sendNotFound(res, "Live session not found");
    }

    if (session.status === "ended") {
      await t.rollback();
      return sendConflict(res, "Session is already ended");
    } // Platform-specific end logic
    try {
      if (session.platform === "agora") {
        await agoraService.endLiveSession(session.platformSessionId);
        // Additional Agora-specific cleanup, if any
      } else if (session.platform === "zoom") {
        await zoomService.endLiveMeeting(session.platformSessionId);
        // Additional Zoom-specific cleanup, if any
      } else {
        await t.rollback();
        return sendError(res, "Unknown platform for this session.");
      }
    } catch (platformError) {
      console.error(`${session.platform} session end error:`, platformError);
      await t.rollback();

      const errorResponse =
        session.platform.toLowerCase() === "agora"
          ? handlePlatformErrors.agora(platformError)
          : handlePlatformErrors.zoom(platformError);

      return sendServerError(res, `Failed to end ${session.platform} session: ${errorResponse.message}`, errorResponse.code);
    }

    session.status = "ended";
    await session.save({ transaction: t });

    await t.commit();
    return sendSuccess(res, `Live session on ${session.platform} ended successfully`, session);
  } catch (error) {
    console.error("Error ending live session:", error);
    await t.rollback();
    return sendServerError(res, "Internal server error", error.message);
  }
};

// Get Live Session Details
export const getLiveSessionDetails = async (req, res) => {
  const io = req.app.get("io");

  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return sendValidationError(res, "Session ID is required");
    }

    const session = await LiveSession.findByPk(sessionId);

    if (!session) {
      return sendNotFound(res, "Live session not found");
    }

    return sendSuccess(res, "Live session details retrieved successfully", session);
  } catch (error) {
    console.error("Error getting live session details:", error);
    return sendServerError(res, "Internal server error", error.message);
  }
};

// List Upcoming/Active Sessions
// Join Live Session
export const joinLiveSession = async (req, res) => {
  const io = req.app.get("io");

  const t = await sequelize.transaction();
  try {
    const { sessionId } = req.params;
    const { userId, role } = req.user;

    if (!sessionId || !userId) {
      return sendValidationError(res, "Session ID and User ID are required");
    }

    const session = await LiveSession.findByPk(sessionId, { transaction: t });

    if (!session) {
      await t.rollback();
      return sendNotFound(res, "Live session not found");
    }

    if (session.status !== "active") {
      await t.rollback();
      return sendConflict(res, "Cannot join a session that is not active. Current status: " + session.status);
    }

    // Check if user has already joined
    const existingParticipant = await LiveSessionParticipant.findOne({
      where: { sessionId, userId },
      transaction: t,
    });
    console.log("Existing Participant:", existingParticipant);
    if (existingParticipant && !existingParticipant.leftAt) {
      await t.rollback();
      return sendConflict(res, "User has already joined this session and has not left.");
    }

    // If user rejoining, update leftAt to null, otherwise create new participant
    let participant;
    if (existingParticipant && existingParticipant.leftAt) {
      existingParticipant.leftAt = null;
      existingParticipant.joinedAt = new Date(); // Update joinedAt time
      // Reset mute and camera status if needed, or retain previous settings
      // existingParticipant.isMuted = false;
      // existingParticipant.isCameraOn = false;
      participant = await existingParticipant.save({ transaction: t });
    } else {
      participant = await LiveSessionParticipant.create(
        {
          sessionId,
          userId,
          role: role || "student", // Default role to 'student' if not provided
          // joinedAt is handled by defaultValue in model
        },
        { transaction: t },
      );
    }
    let joinData = {};
    if (session.platform === "agora") {
      const rtcRole =
        role && role.toLowerCase() === "host"
          ? RtcRole.PUBLISHER
          : RtcRole.SUBSCRIBER;
      // Ensure userId for Agora token is a number
      const numericUserId = parseInt(userId, 10);
      if (isNaN(numericUserId)) {
        await t.rollback();
        return sendValidationError(res, "User ID must be a number for Agora sessions");
      }

      try {
        const agoraTokenData = agoraService.generateTokenWithValidation(
          session.platformSessionId,
          numericUserId,
          rtcRole,
          3600,
        ); // 1 hour expiry

        joinData = {
          platform: "agora",
          token: agoraTokenData.token,
          appId: agoraTokenData.appId,
          channelName: agoraTokenData.channelName,
          uid: numericUserId,
          role: rtcRole,
          participantDetails: participant,
        };
      } catch (tokenError) {
        await t.rollback();
        return sendServerError(res, `Failed to generate Agora token: ${tokenError.message}`);
      }
    } else if (session.platform === "zoom") {
      try {
        // For Zoom, we can provide additional meeting details if needed
        const meetingDetails = await zoomService.getMeetingDetails(
          session.platformSessionId,
        );

        joinData = {
          platform: "zoom",
          joinUrl: session.meetingLink,
          meetingId: session.platformSessionId,
          password: meetingDetails.password || null,
          topic: meetingDetails.topic || session.title,
          participantDetails: participant,
        };
      } catch (zoomError) {
        console.error("Failed to get Zoom meeting details:", zoomError);
        // Fallback to basic join data
        joinData = {
          platform: "zoom",
          joinUrl: session.meetingLink,
          meetingId: session.platformSessionId,
          participantDetails: participant,
        };
      }
    } else {
      await t.rollback();
      return sendError(res, "Unknown platform for this session.");
    }

    await t.commit();
    // Emit participantJoined event
    if (io && sessionId && participant) {
      io.to(sessionId).emit("participantJoined", {
        participant: participant.toJSON(),
        userId: participant.userId,
        participantId: participant.participantId,
        role: participant.role,
        isMuted: participant.isMuted,
        isCameraOn: participant.isCameraOn,
        joinedAt: participant.joinedAt,
      });
    }
    return sendSuccess(res, `Successfully prepared to join ${session.platform} live session`, joinData);
  } catch (error) {
    console.error("Error joining live session:", error);
    await t.rollback();
    return sendServerError(res, "Internal server error", error.message);
  }
};

export const listSessions = async (req, res) => {
  const io = req.app.get("io");

  try {
    const {
      platform,
      courseId,
      instructorId,
      status,
      sortBy = "sessionDate",
      sortOrder = "ASC",
    } = req.query;
    const whereClause = {};

    if (platform) {
      whereClause.platform = platform;
    }
    if (courseId) {
      whereClause.courseId = courseId;
    }
    if (instructorId) {
      whereClause.createdBy = instructorId; // Assuming instructorId maps to createdBy
    }
    if (status) {
      // Allow comma-separated status values or a single status
      whereClause.status = status.includes(",") ? status.split(",") : status;
    } else {
      // Default to scheduled and active if no status is provided
      whereClause.status = ["scheduled", "active"];
    }

    const orderClause = [];
    if (sortBy) {
      orderClause.push([
        sortBy,
        sortOrder.toUpperCase() === "DESC" ? "DESC" : "ASC",
      ]);
      // Add secondary sort for consistency if primary is not time based
      if (sortBy !== "startTime" && sortBy !== "sessionDate") {
        orderClause.push(["startTime", "ASC"]);
      }
    } else {
      // Default sort order
      orderClause.push(["sessionDate", "ASC"], ["startTime", "ASC"]);
    }

    const sessions = await LiveSession.findAll({
      where: whereClause,
      order: orderClause,
      // TODO: Add pagination (limit, offset) based on req.query.page and req.query.limit
    });

    return sendSuccess(res, "Sessions retrieved successfully", sessions);
  } catch (error) {
    console.error("Error listing sessions:", error);
    return sendServerError(res, "Internal server error", error.message);
  }
};

// Participant Controls

// Helper function updateParticipantMedia is removed as its logic is integrated into toggleParticipantMic/Camera

// Mute/Unmute Participant Mic (by instructor)
export const toggleParticipantMic = async (req, res) => {
  const io = req.app.get("io");

  const t = await sequelize.transaction();
  try {
    const { sessionId, participantUserId } = req.params;
    const { allow } = req.body; // allow: true to unmute, false to mute

    if (!sessionId || !participantUserId || typeof allow !== "boolean") {
      return sendValidationError(res, "Session ID, Participant User ID, and allow (boolean) are required");
    }

    // Basic check: Ensure session exists and is active (optional, depends on requirements)
    const session = await LiveSession.findByPk(sessionId, { transaction: t });
    if (!session || session.status !== "active") {
      await t.rollback();
      return sendNotFound(res, "Active session not found.");
    }
    // Authorization is handled by isSessionInstructor middleware

    const participant = await LiveSessionParticipant.findOne({
      where: { sessionId, userId: participantUserId, leftAt: null }, // Ensure participant is active
      transaction: t,
    });

    if (!participant) {
      await t.rollback();
      return sendNotFound(res, "Active participant not found in this session.");
    }

    if (session.platform === "agora") {
      try {
        await agoraService.controlParticipantMic(
          session.platformSessionId,
          participantUserId,
          !allow,
        ); // allow=true means unmute (isMuted=false)
      } catch (agoraError) {
        console.error(
          `Agora mic control error for user ${participantUserId} in session ${sessionId}:`,
          agoraError,
        );
      }
    } else if (session.platform === "zoom") {
      // Mic control for Zoom is typically handled client-side or via Zoom's interface by host/co-host.
      // Server-side API for individual participant mute is limited for basic integrations.
      console.log(
        `Zoom session ${sessionId}: Mic control for ${participantUserId} requested. This is usually client-side for Zoom.`,
      );
    }

    participant.isMuted = !allow;
    await participant.save({ transaction: t });

    await t.commit();
    if (io && sessionId && participant) {
      io.to(sessionId).emit("participantMediaUpdated", {
        participantId: participant.participantId,
        userId: participant.userId,
        mediaType: "mic",
        isMuted: participant.isMuted,
        sessionId,
      });
    }
    return sendSuccess(res, `Participant mic on ${session.platform} ${allow ? "unmuted" : "muted"} successfully (DB updated). Platform action: ${session.platform === "agora" ? "attempted" : "manual/client-side"}`, participant);
  } catch (error) {
    console.error("Error toggling participant mic:", error);
    await t.rollback();
    return sendServerError(res, "Internal server error", error.message);
  }
};

// Enable/Disable Participant Camera (by instructor)
export const toggleParticipantCamera = async (req, res) => {
  const io = req.app.get("io");

  const t = await sequelize.transaction();
  try {
    const { sessionId, participantUserId } = req.params;
    const { enable } = req.body; // enable: true to turn on, false to turn off

    if (!sessionId || !participantUserId || typeof enable !== "boolean") {
      return sendValidationError(res, "Session ID, Participant User ID, and enable (boolean) are required");
    }

    // Basic check: Ensure session exists and is active
    const session = await LiveSession.findByPk(sessionId, { transaction: t });
    if (!session || session.status !== "active") {
      await t.rollback();
      return sendNotFound(res, "Active session not found.");
    }
    // Authorization is handled by isSessionInstructor middleware

    const participant = await LiveSessionParticipant.findOne({
      where: { sessionId, userId: participantUserId, leftAt: null }, // Ensure participant is active
      transaction: t,
    });

    if (!participant) {
      await t.rollback();
      return sendNotFound(res, "Active participant not found in this session.");
    }

    if (session.platform === "agora") {
      try {
        await agoraService.controlParticipantCamera(
          session.platformSessionId,
          participantUserId,
          !enable,
        ); // enable=true means camera on (isCameraOff=false)
      } catch (agoraError) {
        console.error(
          `Agora camera control error for user ${participantUserId} in session ${sessionId}:`,
          agoraError,
        );
        // Decide if fatal or warning
      }
    } else if (session.platform === "zoom") {
      // Camera control for Zoom is typically client-side or via Zoom's interface by host/co-host.
      console.log(
        `Zoom session ${sessionId}: Camera control for ${participantUserId} requested. This is usually client-side for Zoom.`,
      );
    }

    participant.isCameraOn = enable;
    await participant.save({ transaction: t });

    await t.commit();
    if (io && sessionId && participant) {
      io.to(sessionId).emit("participantMediaUpdated", {
        participantId: participant.participantId,
        userId: participant.userId,
        mediaType: "camera",
        isCameraOn: participant.isCameraOn,
        sessionId,
      });
    }
    return sendSuccess(res, `Participant camera on ${session.platform} ${enable ? "enabled" : "disabled"} successfully (DB updated). Platform action: ${session.platform === "agora" ? "attempted" : "manual/client-side"}`, participant);
  } catch (error) {
    console.error("Error toggling participant camera:", error);
    await t.rollback();
    return sendServerError(res, "Internal server error", error.message);
  }
};

// Remove Participant from Session (by instructor)
export const removeParticipantFromSession = async (req, res) => {
  const io = req.app.get("io");

  const t = await sequelize.transaction();
  try {
    const { sessionId, participantUserId } = req.params;

    if (!sessionId || !participantUserId) {
      return sendValidationError(res, "Session ID and Participant User ID are required");
    }

    // Basic check: Ensure session exists and is active
    const session = await LiveSession.findByPk(sessionId, { transaction: t });
    if (!session || session.status !== "active") {
      await t.rollback();
      return sendNotFound(res, "Active session not found.");
    }
    // Authorization is handled by isSessionInstructor middleware

    const participant = await LiveSessionParticipant.findOne({
      where: { sessionId, userId: participantUserId }, // Not checking leftAt here, as we might remove an already 'marked as left' user from platform if needed
      transaction: t,
    });

    if (!participant) {
      await t.rollback();
      return sendNotFound(res, "Participant not found in this session");
    }

    if (participant.leftAt) {
      await t.rollback();
      return sendConflict(res, "Participant has already left the session.");
    }

    if (session.platform === "agora") {
      try {
        await agoraService.removeParticipant(
          session.platformSessionId,
          participantUserId,
        );
      } catch (agoraError) {
        console.error(
          `Agora remove participant error for user ${participantUserId} in session ${sessionId}:`,
          agoraError,
        );
        // Decide if fatal or warning
      }
    } else if (session.platform === "zoom") {
      // Removing participants from Zoom via API can be complex and might require specific permissions/SDK features.
      // Often done via Zoom client by host.
      console.log(
        `Zoom session ${sessionId}: Remove participant ${participantUserId} requested. This is usually client-side or via advanced Zoom API usage.`,
      );
    }

    // Mark as left in our DB regardless of platform action success/failure for now
    participant.leftAt = new Date();
    await participant.save({ transaction: t });

    await t.commit();
    if (io && sessionId && participant) {
      io.to(sessionId).emit("participantWasRemoved", {
        participantId: participant.participantId,
        userId: participant.userId,
        sessionId,
      });
    }
    return sendSuccess(res, `Participant removed from ${session.platform} session (DB updated). Platform action: ${session.platform === "agora" ? "attempted" : "manual/client-side"}`, participant);
  } catch (error) {
    console.error("Error removing participant from session:", error);
    await t.rollback();
    return sendServerError(res, "Internal server error", error.message);
  }
};

// Raise Hand Workflow

// Raise Hand (by student)
export const raiseHand = async (req, res) => {
  const io = req.app.get("io");

  const t = await sequelize.transaction();
  try {
    const { sessionId } = req.params;
    const { participantId } = req.body; // participantId of the student raising hand

    if (!sessionId || !participantId) {
      return sendValidationError(res, "Session ID and Participant ID are required");
    }

    const session = await LiveSession.findByPk(sessionId, { transaction: t });
    if (!session || session.status !== "active") {
      await t.rollback();
      return sendValidationError(res, "Cannot raise hand in a session that is not active or does not exist.");
    }

    const participant = await LiveSessionParticipant.findOne({
      where: { participantId, sessionId },
      transaction: t,
    });

    if (!participant || participant.leftAt) {
      await t.rollback();
      return sendNotFound(res, "Participant not found in this session or has left.");
    }

    // Check if already has an active raised hand
    const existingRaisedHand = await RaisedHand.findOne({
      where: { sessionId, participantId, status: "pending" },
      transaction: t,
    });

    if (existingRaisedHand) {
      await t.rollback();
      return sendConflict(res, "Participant already has a pending raised hand request.");
    }

    const newRaisedHand = await RaisedHand.create(
      {
        sessionId,
        participantId,
        // raisedAt and status have default values
      },
      { transaction: t },
    );

    await t.commit();
    // Emit raiseHandReceived event
    if (io && sessionId && newRaisedHand && participant) {
      const eventData = {
        ...newRaisedHand.toJSON(),
        userContext: {
          participantId: participant.participantId,
          userId: participant.userId,
          role: participant.role,
        },
      };
      io.to(sessionId).emit("raiseHandReceived", eventData);
    }
    return sendSuccess(res, "Hand raised successfully", newRaisedHand);
  } catch (error) {
    console.error("Error raising hand:", error);
    await t.rollback();
    return sendServerError(res, "Internal server error", error.message);
  }
};

// List Raised Hands (for instructor)
export const listRaisedHands = async (req, res) => {
  const io = req.app.get("io");

  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return sendValidationError(res, "Session ID is required");
    }

    const session = await LiveSession.findByPk(sessionId);
    if (!session) {
      return sendNotFound(res, "Session not found.");
    }
    // Add authorization: ensure req.user is instructor for this session

    const raisedHands = await RaisedHand.findAll({
      where: { sessionId, status: "pending" }, // Or include 'accepted' if needed
      include: [
        {
          model: LiveSessionParticipant,
          attributes: ["userId", "role"], // Include any other participant details needed
          // TODO: include User model here to get user name if LiveSessionParticipant has userId linked to a User table
        },
      ],
      order: [["raisedAt", "ASC"]],
    });

    return sendSuccess(res, "Raised hands retrieved successfully", raisedHands);
  } catch (error) {
    console.error("Error listing raised hands:", error);
    return sendServerError(res, "Internal server error", error.message);
  }
};

// Respond to Raised Hand (Accept/Reject by instructor)
export const respondToRaisedHand = async (req, res) => {
  const io = req.app.get("io");

  const t = await sequelize.transaction();
  try {
    const { sessionId, raisedHandId } = req.params;
    const { action } = req.body; // action: 'accept' or 'reject'

    if (!sessionId || !raisedHandId || !["accept", "reject"].includes(action)) {
      await t.rollback();
      return sendValidationError(res, "Session ID, Raised Hand ID, and a valid action ('accept' or 'reject') are required");
    }

    const session = await LiveSession.findByPk(sessionId, { transaction: t });
    if (!session || session.status !== "active") {
      await t.rollback();
      return sendValidationError(res, "Cannot respond to raised hand in a session that is not active or does not exist.");
    }
    // Add authorization: ensure req.user is instructor for this session (placeholder)

    const raisedHand = await RaisedHand.findOne({
      where: { raisedHandId, sessionId },
      include: [LiveSessionParticipant], // Kept same as original, assuming it populates raisedHand.liveSessionParticipant
      transaction: t,
    });

    if (!raisedHand) {
      await t.rollback();
      return sendNotFound(res, "Raised hand request not found");
    }

    if (raisedHand.status !== "pending") {
      await t.rollback();
      return sendConflict(res, `Cannot ${action} a raised hand that is already ${raisedHand.status}.`);
    }

    raisedHand.status = action === "accept" ? "accepted" : "rejected";
    raisedHand.respondedAt = new Date();
    await raisedHand.save({ transaction: t });

    const participant = raisedHand.liveSessionParticipant; // This is the accepted participant
    let updatedOtherStudentsInfo = []; // To store info for event emission

    if (action === "accept" && participant) {
      // 1. Unmute the accepted participant
      if (participant.isMuted) {
        // Only update if currently muted
        participant.isMuted = false;
        await participant.save({ transaction: t });
      }

      // 2. Mute all other 'student' participants in the session
      const otherStudentParticipants = await LiveSessionParticipant.findAll({
        where: {
          sessionId,
          role: "student",
          participantId: { [Op.ne]: participant.participantId }, // Op needs to be imported from sequelize
        },
        transaction: t,
      });

      for (const student of otherStudentParticipants) {
        if (!student.isMuted) {
          // Only mute if not already muted
          student.isMuted = true;
          await student.save({ transaction: t });
          updatedOtherStudentsInfo.push({
            participantId: student.participantId,
            userId: student.userId,
            isMuted: student.isMuted, // will be true
          });
        }
      }
    } else if (action === "reject") {
      // Optional: If rejected, and participant was unmuted, instructor might want to mute them.
      // Current logic doesn't auto-mute on reject, which seems fine.
    }

    await t.commit(); // Commit transaction

    // Emit events AFTER commit
    if (io && sessionId && raisedHand && participant) {
      // Ensure participant is not null
      const responseEventData = {
        ...raisedHand.toJSON(),
        userContext: {
          participantId: participant.participantId,
          userId: participant.userId,
          role: participant.role,
        },
      };
      io.to(sessionId).emit("raiseHandResponse", responseEventData);

      if (action === "accept") {
        // Event for the accepted participant (unmuted)
        io.to(sessionId).emit("participantMediaUpdated", {
          participantId: participant.participantId,
          userId: participant.userId,
          mediaType: "mic",
          isMuted: participant.isMuted, // This will be false
          sessionId,
        });

        // Events for other students who were muted
        for (const studentInfo of updatedOtherStudentsInfo) {
          io.to(sessionId).emit("participantMediaUpdated", {
            participantId: studentInfo.participantId,
            userId: studentInfo.userId,
            mediaType: "mic",
            isMuted: studentInfo.isMuted, // This will be true
            sessionId,
          });
        }
      }
    }

    return sendSuccess(res, `Raised hand ${action === "accept" ? "accepted" : "rejected"} successfully`, raisedHand);
  } catch (error) {
    console.error("Error responding to raised hand:", error);
    await t.rollback(); // Ensure rollback on any error
    return sendServerError(res, "Internal server error", error.message);
  }
};

// End Raised Hand Interaction (reset to audience)
export const endRaisedHandInteraction = async (req, res) => {
  const io = req.app.get("io");

  const t = await sequelize.transaction();
  try {
    const { sessionId, raisedHandId } = req.params;
    // const { participantId } = req.body; // Or get participantId from raisedHandId

    if (!sessionId || !raisedHandId) {
      return sendValidationError(res, "Session ID and Raised Hand ID are required");
    }

    const session = await LiveSession.findByPk(sessionId, { transaction: t });
    if (!session || session.status !== "active") {
      await t.rollback();
      return sendValidationError(res, "Cannot end interaction in a session that is not active or does not exist.");
    }
    // Add authorization: ensure req.user is instructor for this session

    const raisedHand = await RaisedHand.findOne({
      where: { raisedHandId, sessionId },
      include: [LiveSessionParticipant],
      transaction: t,
    });

    if (!raisedHand) {
      await t.rollback();
      return sendNotFound(res, "Raised hand request not found.");
    }

    if (raisedHand.status !== "accepted") {
      await t.rollback();
      return sendConflict(res, "Can only end interaction for an 'accepted' raised hand.");
    }

    raisedHand.status = "addressed"; // Or 'ended', 'completed'
    await raisedHand.save({ transaction: t });

    const participant = raisedHand.liveSessionParticipant;
    if (participant) {
      // Re-mute the participant after interaction ends
      participant.isMuted = true;
      // participant.isCameraOn = false; // Optionally turn off camera too
      await participant.save({ transaction: t });
    }

    await t.commit();
    // Emit raiseHandInteractionEnded event
    if (io && sessionId && raisedHand && participant) {
      const endedEventData = {
        ...raisedHand.toJSON(),
        userContext: {
          participantId: participant.participantId,
          userId: participant.userId,
          role: participant.role,
        },
      };
      io.to(sessionId).emit("raiseHandInteractionEnded", endedEventData);

      io.to(sessionId).emit("participantMediaUpdated", {
        participantId: participant.participantId,
        userId: participant.userId,
        mediaType: "mic",
        isMuted: participant.isMuted,
        sessionId,
      });
    }
    return sendSuccess(res, "Raised hand interaction ended successfully.", raisedHand);
  } catch (error) {
    console.error("Error ending raised hand interaction:", error);
    await t.rollback();
    return sendServerError(res, "Internal server error", error.message);
  }
};

// Leave Live Session (self-leave by participant)
export const leaveLiveSession = async (req, res) => {
  const io = req.app.get("io");

  const t = await sequelize.transaction();
  try {
    const { sessionId } = req.params;
    const userId = req.user?.userId; // Get userId from authenticated user

    if (!sessionId) {
      return sendValidationError(res, "Session ID is required");
    }

    if (!userId) {
      return sendValidationError(res, "User authentication required");
    }

    // Verify session exists and get session details
    const session = await LiveSession.findByPk(sessionId, { transaction: t });
    if (!session) {
      await t.rollback();
      return sendNotFound(res, "Live session not found");
    }

    // Find the participant record for this user in this session
    const participant = await LiveSessionParticipant.findOne({
      where: {
        sessionId,
        userId,
        leftAt: null, // Only find participants who haven't left yet
      },
      transaction: t,
    });

    if (!participant) {
      await t.rollback();
      return sendNotFound(res, "You are not currently in this session or have already left");
    }

    // Update participant record to mark as left
    participant.leftAt = new Date();
    await participant.save({ transaction: t });

    // Platform-specific leave actions (optional)
    try {
      if (session.platform === "agora") {
        // For Agora, participant leaving is typically handled client-side
        // Server-side actions are usually not required
        console.log(
          `Agora session ${sessionId}: Participant ${userId} left. Client-side disconnect expected.`,
        );
      } else if (session.platform === "zoom") {
        // For Zoom, participant leaving is handled client-side
        // No server-side API action typically required
        console.log(
          `Zoom session ${sessionId}: Participant ${userId} left. Client-side disconnect expected.`,
        );
      }
    } catch (platformError) {
      // Log platform errors but don't fail the leave operation
      console.error(
        `Platform-specific leave action error for ${session.platform}:`,
        platformError,
      );
    }

    await t.commit();

    // Emit Socket.IO event to notify other participants
    if (io && sessionId && participant) {
      io.to(sessionId).emit("participantLeft", {
        participantId: participant.participantId,
        userId: participant.userId,
        role: participant.role,
        leftAt: participant.leftAt,
        sessionId,
      });
    }

    return sendSuccess(res, "Successfully left the live session", {
      sessionId,
      participantId: participant.participantId,
      userId: participant.userId,
      leftAt: participant.leftAt,
      platform: session.platform,
    });
  } catch (error) {
    console.error("Error leaving live session:", error);
    await t.rollback();
    return sendServerError(res, "Internal server error", error.message);
  }
};
