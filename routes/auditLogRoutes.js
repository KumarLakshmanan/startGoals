import express from 'express';
import {
  logActivity,
  getAuditLogs,
  getAuditLogById,
  getAuditStats,
  deleteAuditLogs,
  exportAuditLogs,
} from '../controller/auditLogController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// All audit routes require authentication
router.use(authenticateToken);

// Log activity (for internal use)
router.post('/log', logActivity);

// Get audit logs with filtering and pagination
router.get('/', getAuditLogs);

// Get specific audit log
router.get('/:auditId', getAuditLogById);

// Get audit statistics
router.get('/stats/overview', getAuditStats);

// Delete audit logs (bulk)
router.delete('/', deleteAuditLogs);

// Export audit logs
router.get('/export/download', exportAuditLogs);

export default router;