import express from 'express';
import {
  createSession,
  getUserSessions,
  getAllSessions,
  updateSessionActivity,
  terminateSession,
  terminateUserSessions,
  getSessionStats,
  cleanupExpiredSessions,
} from '../controller/adminSessionController.js';
import { authenticateToken, isAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// All session routes require authentication
router.use(authenticateToken);

// Create new session (internal use)
router.post('/', createSession);

// Get sessions for specific user
router.get('/user/:userId', getUserSessions);

// Get all sessions (admin only)
router.get('/', isAdmin, getAllSessions);

// Update session activity
router.patch('/:sessionId/activity', updateSessionActivity);

// Terminate specific session
router.patch('/:sessionId/terminate', terminateSession);

// Terminate all sessions for a user
router.patch('/user/:userId/terminate-all', terminateUserSessions);

// Get session statistics (admin only)
router.get('/stats/overview', isAdmin, getSessionStats);

// Cleanup expired sessions (admin only)
router.post('/cleanup', isAdmin, cleanupExpiredSessions);

export default router;