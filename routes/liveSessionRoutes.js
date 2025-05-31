import express from "express";
import { authenticateToken, isTeacher, isStudent, isSessionInstructor } from "../middleware/authMiddleware.js";
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

router.post("/createLiveSession", authenticateToken, isTeacher, createLiveSession);

// Routes for new live session functionalities
router.put("/:sessionId/start", authenticateToken, isSessionInstructor, startLiveSession);
router.put("/:sessionId/end", authenticateToken, isSessionInstructor, endLiveSession);
router.get("/:sessionId", authenticateToken, getLiveSessionDetails);
router.get("/sessions", authenticateToken, listSessions);
router.post("/:sessionId/join", authenticateToken, joinLiveSession);
router.post("/:sessionId/leave", authenticateToken, leaveLiveSession);

// Participant Control Routes
router.put("/:sessionId/participants/:participantUserId/mic", authenticateToken, isSessionInstructor, toggleParticipantMic);
router.put("/:sessionId/participants/:participantUserId/camera", authenticateToken, isSessionInstructor, toggleParticipantCamera);
router.delete("/:sessionId/participants/:participantUserId", authenticateToken, isSessionInstructor, removeParticipantFromSession);

// Raise Hand Workflow Routes
router.post("/:sessionId/raise-hand", authenticateToken, isStudent, raiseHand); // Student raises hand
router.get("/:sessionId/raised-hands", authenticateToken, isSessionInstructor, listRaisedHands); // Instructor lists raised hands
router.put("/:sessionId/raised-hands/:raisedHandId/respond", authenticateToken, isSessionInstructor, respondToRaisedHand); // Instructor accepts/rejects
router.put("/:sessionId/raised-hands/:raisedHandId/end-interaction", authenticateToken, isSessionInstructor, endRaisedHandInteraction); // Instructor ends interaction

export default router;
