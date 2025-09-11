import express from 'express';
import {
  createSecurityAlert,
  getSecurityAlerts,
  updateAlertStatus,
  getSecurityStats,
  getSecurityDashboard,
  bulkUpdateAlerts,
} from '../controller/securityController.js';
import { authenticateToken, isAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// All security routes require authentication and admin privileges
router.use(authenticateToken);
router.use(isAdmin);

// Create security alert (internal use)
router.post('/alerts', createSecurityAlert);

// Get security alerts with filtering and pagination
router.get('/alerts', getSecurityAlerts);

// Update alert status
router.patch('/alerts/:alertId/status', updateAlertStatus);

// Bulk update alerts
router.patch('/alerts/bulk-update', bulkUpdateAlerts);

// Get security statistics
router.get('/stats', getSecurityStats);

// Get security dashboard data
router.get('/dashboard', getSecurityDashboard);

export default router;