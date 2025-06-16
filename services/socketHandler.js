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

    // You can add more custom events here as needed
    // e.g., chat messages, polls, screen sharing notifications, etc.
  });

  console.log("Socket.IO initialized and listening for connections.");
};

export default initializeSocketIO;
