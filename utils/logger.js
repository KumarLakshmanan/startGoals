import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const LOG_FILE = path.join(logsDir, 'admin-activity.log');

/**
 * Log admin activity to file
 * @param {Object} logData - Log data
 * @param {string} logData.userId - Admin user ID
 * @param {string} logData.userName - Admin user name
 * @param {string} logData.userRole - Admin role
 * @param {string} logData.action - Action performed
 * @param {string} logData.module - Module affected
 * @param {string} logData.details - Action details
 * @param {string} logData.targetId - Target ID (optional)
 * @param {string} logData.targetType - Target type (optional)
 * @param {string} logData.ipAddress - IP address
 * @param {string} logData.userAgent - User agent
 * @param {string} logData.sessionId - Session ID
 */
export const logAdminActivity = (logData) => {
  try {
    const logEntry = {
      timestamp: new Date().toISOString(),
      logId: Date.now().toString(),
      ...logData,
      risk: calculateRiskLevel(logData.action, logData.module),
    };

    const logLine = JSON.stringify(logEntry) + '\n';

    // Append to log file
    fs.appendFileSync(LOG_FILE, logLine);

    // Also log to console for development
    console.log(`[ADMIN LOG] ${logData.action}: ${logData.details}`);

  } catch (error) {
    console.error('Failed to log admin activity:', error);
  }
};

/**
 * Read admin activity logs from file
 * @param {Object} filters - Filter options
 * @returns {Array} Array of log entries
 */
export const readAdminLogs = (filters = {}) => {
  try {
    if (!fs.existsSync(LOG_FILE)) {
      return [];
    }

    const logData = fs.readFileSync(LOG_FILE, 'utf8');
    const lines = logData.trim().split('\n');
    let logs = lines.map(line => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    }).filter(log => log !== null);

    // Apply filters
    if (filters.userId) {
      logs = logs.filter(log => log.userId === filters.userId);
    }
    if (filters.action) {
      logs = logs.filter(log => log.action.toLowerCase().includes(filters.action.toLowerCase()));
    }
    if (filters.module) {
      logs = logs.filter(log => log.module === filters.module);
    }
    if (filters.dateFrom && filters.dateTo) {
      logs = logs.filter(log => {
        const logDate = new Date(log.timestamp);
        return logDate >= new Date(filters.dateFrom) && logDate <= new Date(filters.dateTo);
      });
    }
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      logs = logs.filter(log =>
        log.details.toLowerCase().includes(searchLower) ||
        log.userName.toLowerCase().includes(searchLower) ||
        log.action.toLowerCase().includes(searchLower)
      );
    }

    return logs;
  } catch (error) {
    console.error('Failed to read admin logs:', error);
    return [];
  }
};

/**
 * Calculate risk level for an action
 * @param {string} action - Action performed
 * @param {string} module - Module affected
 * @returns {string} Risk level (low, medium, high)
 */
const calculateRiskLevel = (action, module) => {
  const highRiskActions = ['delete', 'ban', 'suspend', 'password_change'];
  const mediumRiskActions = ['create', 'update', 'approve'];
  const highRiskModules = ['admin_management', 'settings', 'payments'];

  if (highRiskActions.some(riskAction => action.includes(riskAction))) {
    return 'high';
  }
  if (mediumRiskActions.some(riskAction => action.includes(riskAction)) ||
      highRiskModules.includes(module)) {
    return 'medium';
  }
  return 'low';
};

/**
 * Get log statistics
 * @param {Array} logs - Array of log entries
 * @returns {Object} Statistics object
 */
export const getLogStatistics = (logs) => {
  const stats = {
    totalLogs: logs.length,
    riskDistribution: {
      low: logs.filter(l => l.risk === 'low').length,
      medium: logs.filter(l => l.risk === 'medium').length,
      high: logs.filter(l => l.risk === 'high').length,
    },
    actionDistribution: {},
    moduleDistribution: {},
    uniqueUsers: [...new Set(logs.map(l => l.userId))].length,
    uniqueIPs: [...new Set(logs.map(l => l.ipAddress))].length,
  };

  // Action distribution
  logs.forEach(log => {
    stats.actionDistribution[log.action] = (stats.actionDistribution[log.action] || 0) + 1;
  });

  // Module distribution
  logs.forEach(log => {
    stats.moduleDistribution[log.module] = (stats.moduleDistribution[log.module] || 0) + 1;
  });

  return stats;
};

/**
 * Clean old logs (keep last 30 days)
 */
export const cleanOldLogs = () => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const logs = readAdminLogs();
    const recentLogs = logs.filter(log => new Date(log.timestamp) > thirtyDaysAgo);

    if (recentLogs.length < logs.length) {
      // Rewrite file with only recent logs
      const logData = recentLogs.map(log => JSON.stringify(log)).join('\n') + '\n';
      fs.writeFileSync(LOG_FILE, logData);
      console.log(`Cleaned ${logs.length - recentLogs.length} old log entries`);
    }
  } catch (error) {
    console.error('Failed to clean old logs:', error);
  }
};