import express from "express";
import {
  isStudent,
  isSessionInstructor,
} from "../middleware/authMiddleware.js";
import {
  createLiveSession,
  startLiveSession,
  endLiveSession,
  getLiveSessionDetails,
  listSessions,
  joinLiveSession,
  leaveLiveSession,
  toggleParticipantMic,
  toggleParticipantCamera,
  removeParticipantFromSession,
  raiseHand,
  listRaisedHands,
  respondToRaisedHand,
  endRaisedHandInteraction,
} from "../controller/liveSessionController.js";

const router = express.Router();

router.post("/createLiveSession", isStudent, createLiveSession);

// Routes for new live session functionalities
router.put("/:sessionId/start", isSessionInstructor, startLiveSession);
router.put("/:sessionId/end", isSessionInstructor, endLiveSession);
router.get("/:sessionId", isStudent, getLiveSessionDetails);
router.get("/sessions", isStudent, listSessions);
router.post("/:sessionId/join", isStudent, joinLiveSession);
router.post("/:sessionId/leave", isStudent, leaveLiveSession);

// Participant Control Routes
router.put(
  "/:sessionId/participants/:participantUserId/mic",
  isSessionInstructor,
  toggleParticipantMic,
);
router.put(
  "/:sessionId/participants/:participantUserId/camera",
  isSessionInstructor,
  toggleParticipantCamera,
);
router.delete(
  "/:sessionId/participants/:participantUserId",
  isSessionInstructor,
  removeParticipantFromSession,
);

// Raise Hand Workflow Routes
router.post("/:sessionId/raise-hand", isStudent, isStudent, raiseHand); // Student raises hand
router.get("/:sessionId/raised-hands", isSessionInstructor, listRaisedHands); // Instructor lists raised hands
router.put(
  "/:sessionId/raised-hands/:raisedHandId/respond",
  isSessionInstructor,
  respondToRaisedHand,
); // Instructor accepts/rejects
router.put(
  "/:sessionId/raised-hands/:raisedHandId/end-interaction",
  isSessionInstructor,
  endRaisedHandInteraction,
); // Instructor ends interaction

export default router;
