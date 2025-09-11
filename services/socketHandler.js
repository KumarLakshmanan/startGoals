// d:\nodejs\startGoals\services\socketHandler.js

// Store active users/participants per session
const sessionParticipants = {}; // { sessionId: { socketId: { userId, role, ...otherDetails } } }

const initializeSocketIO = (io) => {
  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Event: User joins a live session room
    socket.on("joinSession", ({ sessionId, userId, role }) => {
      socket.join(sessionId);
      console.log(
        `User ${userId} (Socket ${socket.id}) joined session ${sessionId} as ${role}`,
      );

      if (!sessionParticipants[sessionId]) {
        sessionParticipants[sessionId] = {};
      }
      sessionParticipants[sessionId][socket.id] = { userId, role };

      // Notify others in the room that a new user has joined
      socket
        .to(sessionId)
        .emit("participantJoined", { userId, role, socketId: socket.id });

      // Send current participant list to the new user
      socket.emit(
        "currentParticipants",
        Object.values(sessionParticipants[sessionId]),
      );
    });

    // Event: User leaves a live session room (can be explicit or on disconnect)
    const handleLeaveSession = (sessionId) => {
      if (
        sessionId &&
        sessionParticipants[sessionId] &&
        sessionParticipants[sessionId][socket.id]
      ) {
        const { userId, role } = sessionParticipants[sessionId][socket.id];
        delete sessionParticipants[sessionId][socket.id];
        if (Object.keys(sessionParticipants[sessionId]).length === 0) {
          delete sessionParticipants[sessionId];
        }
        socket
          .to(sessionId)
          .emit("participantLeft", { userId, role, socketId: socket.id });
        console.log(
          `User ${userId} (Socket ${socket.id}) left session ${sessionId}`,
        );
      }
    };

    socket.on("leaveSession", ({ sessionId }) => {
      handleLeaveSession(sessionId);
      socket.leave(sessionId);
    });

    // Event: Handle disconnection
    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.id}`);
      // Find which session the disconnected socket was part of and notify others
      for (const sessionId in sessionParticipants) {
        if (sessionParticipants[sessionId][socket.id]) {
          handleLeaveSession(sessionId);
          break;
        }
      }
    });

    // --- Real-time Event Sync ---

    // Event: New hand raised
    socket.on("newRaiseHand", ({ sessionId, raisedHandData }) => {
      // raisedHandData could be the full object from the DB
      io.to(sessionId).emit("raiseHandReceived", raisedHandData);
      console.log(`Hand raised in session ${sessionId}:`, raisedHandData);
    });

    // Event: Raised hand response (accepted/rejected/addressed)
    socket.on("respondRaiseHand", ({ sessionId, responseData }) => {
      // responseData could be { raisedHandId, status, participantId, ... }
      io.to(sessionId).emit("raiseHandResponse", responseData);
      console.log(
        `Response to raised hand in session ${sessionId}:`,
        responseData,
      );
    });

    // Event: Mic/Camera permission change
    socket.on(
      "mediaPermissionChange",
      ({ sessionId, participantId, mediaType, status }) => {
        // mediaType: 'mic' or 'camera', status: true (on/unmuted) or false (off/muted)
        io.to(sessionId).emit("participantMediaUpdated", {
          participantId,
          mediaType,
          status,
        });
        console.log(
          `Media permission change in ${sessionId} for ${participantId}: ${mediaType} ${status}`,
        );
      },
    );

    // Event: Participant removed from session
    socket.on("participantRemoved", ({ sessionId, participantId }) => {
      io.to(sessionId).emit("participantWasRemoved", { participantId });
      console.log(
        `Participant ${participantId} removed from session ${sessionId}`,
      );
      // Potentially force disconnect the removed participant's socket if still connected
      // This requires mapping participantId to socketId, which sessionParticipants helps with.
      for (const sid in sessionParticipants[sessionId]) {
        if (sessionParticipants[sessionId][sid].userId === participantId) {
          const targetSocket = io.sockets.sockets.get(sid);
          if (targetSocket) {
            targetSocket.emit("forceDisconnect", {
              message: "You have been removed from the session.",
            });
            targetSocket.disconnect(true);
          }
          break;
        }
      }
    });

    // --- Course Chat Events ---

    // Event: User joins a course chat room
    socket.on("joinCourseChat", ({ courseId, userId }) => {
      socket.join(`course-chat-${courseId}`);
      console.log(`User ${userId} (Socket ${socket.id}) joined course chat ${courseId}`);

      // Notify others in the course chat that a user has joined
      socket.to(`course-chat-${courseId}`).emit("userJoinedChat", { userId, socketId: socket.id });
    });

    // Event: User leaves a course chat room
    socket.on("leaveCourseChat", ({ courseId, userId }) => {
      socket.leave(`course-chat-${courseId}`);
      console.log(`User ${userId} (Socket ${socket.id}) left course chat ${courseId}`);

      // Notify others in the course chat that a user has left
      socket.to(`course-chat-${courseId}`).emit("userLeftChat", { userId, socketId: socket.id });
    });

    // Event: New course chat message
    socket.on("sendCourseMessage", ({ courseId, messageData }) => {
      console.log(`New message in course chat ${courseId}:`, messageData);

      // Broadcast the message to all users in the course chat room
      io.to(`course-chat-${courseId}`).emit("newCourseMessage", messageData);
    });

    // Event: Course message deleted
    socket.on("deleteCourseMessage", ({ courseId, messageId, deletedBy }) => {
      console.log(`Message ${messageId} deleted in course chat ${courseId} by ${deletedBy}`);

      // Broadcast the deletion to all users in the course chat room
      io.to(`course-chat-${courseId}`).emit("courseMessageDeleted", { messageId, deletedBy });
    });

    // Event: Typing indicator
    socket.on("userTyping", ({ courseId, userId, isTyping }) => {
      socket.to(`course-chat-${courseId}`).emit("userTypingStatus", { userId, isTyping });
    });

    // --- Lesson Chat Events ---

    // Event: User joins a lesson chat room
    socket.on("joinLessonChat", ({ lessonId, userId }) => {
      socket.join(`lesson-chat-${lessonId}`);
      console.log(`User ${userId} (Socket ${socket.id}) joined lesson chat ${lessonId}`);

      // Notify others in the lesson chat that a user has joined
      socket.to(`lesson-chat-${lessonId}`).emit("userJoinedLessonChat", { userId, socketId: socket.id });
    });

    // Event: User leaves a lesson chat room
    socket.on("leaveLessonChat", ({ lessonId, userId }) => {
      socket.leave(`lesson-chat-${lessonId}`);
      console.log(`User ${userId} (Socket ${socket.id}) left lesson chat ${lessonId}`);

      // Notify others in the lesson chat that a user has left
      socket.to(`lesson-chat-${lessonId}`).emit("userLeftLessonChat", { userId, socketId: socket.id });
    });

    // Event: New lesson chat message
    socket.on("sendLessonMessage", ({ lessonId, messageData }) => {
      console.log(`New message in lesson chat ${lessonId}:`, messageData);

      // Broadcast the message to all users in the lesson chat room
      io.to(`lesson-chat-${lessonId}`).emit("newLessonMessage", messageData);
    });

    // Event: Lesson message deleted
    socket.on("deleteLessonMessage", ({ lessonId, messageId, deletedBy }) => {
      console.log(`Message ${messageId} deleted in lesson chat ${lessonId} by ${deletedBy}`);

      // Broadcast the deletion to all users in the lesson chat room
      io.to(`lesson-chat-${lessonId}`).emit("lessonMessageDeleted", { messageId, deletedBy });
    });

    // Event: Typing indicator for lesson chat
    socket.on("userTypingLesson", ({ lessonId, userId, isTyping }) => {
      socket.to(`lesson-chat-${lessonId}`).emit("userTypingLessonStatus", { userId, isTyping });
    });

    // You can add more custom events here as needed
    // e.g., polls, screen sharing notifications, etc.
  });

  console.log("Socket.IO initialized and listening for connections.");
};

export default initializeSocketIO;
