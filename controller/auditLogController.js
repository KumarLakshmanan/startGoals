import AuditLog from '../model/auditLog.js';
import User from '../model/user.js';
import { Op } from 'sequelize';
import sequelize from '../config/db.js';

export const logActivity = async (req, res) => {
  try {
    const {
      action,
      entityType,
      entityId,
      oldValues,
      newValues,
      severity = 'low',
      status = 'success',
      metadata,
    } = req.body;

    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required',
      });
    }

    const auditLog = await AuditLog.create({
      userId,
      action,
      entityType,
      entityId,
      oldValues: oldValues ? JSON.stringify(oldValues) : null,
      newValues: newValues ? JSON.stringify(newValues) : null,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      sessionId: req.sessionID,
      severity,
      status,
      metadata: metadata ? JSON.stringify(metadata) : null,
    });

    res.status(201).json({
      success: true,
      message: 'Activity logged successfully',
      data: auditLog,
    });
  } catch (error) {
    console.error('Error logging activity:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to log activity',
      error: error.message,
    });
  }
};

export const getAuditLogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      userId,
      action,
      entityType,
      entityId,
      severity,
      status,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = req.query;

    const offset = (page - 1) * limit;

    const whereClause = {};
    if (userId) whereClause.userId = userId;
    if (action) whereClause.action = action;
    if (entityType) whereClause.entityType = entityType;
    if (entityId) whereClause.entityId = entityId;
    if (severity) whereClause.severity = severity;
    if (status) whereClause.status = status;

    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) whereClause.createdAt[Op.gte] = new Date(startDate);
      if (endDate) whereClause.createdAt[Op.lte] = new Date(endDate);
    }

    const { count, rows } = await AuditLog.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['userId', 'username', 'email', 'role'],
        },
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sortBy, sortOrder.toUpperCase()]],
    });

    res.json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch audit logs',
      error: error.message,
    });
  }
};

export const getAuditLogById = async (req, res) => {
  try {
    const { auditId } = req.params;

    const auditLog = await AuditLog.findByPk(auditId, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['userId', 'username', 'email', 'role'],
        },
      ],
    });

    if (!auditLog) {
      return res.status(404).json({
        success: false,
        message: 'Audit log not found',
      });
    }

    res.json({
      success: true,
      data: auditLog,
    });
  } catch (error) {
    console.error('Error fetching audit log:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch audit log',
      error: error.message,
    });
  }
};

export const getAuditStats = async (req, res) => {
  try {
    const { period = '24h' } = req.query;

    let dateFilter;
    const now = new Date();

    switch (period) {
      case '1h':
        dateFilter = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '24h':
        dateFilter = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        dateFilter = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    const [totalLogs, criticalLogs, failedLogs, userActivity] = await Promise.all([
      AuditLog.count({ where: { createdAt: { [Op.gte]: dateFilter } } }),
      AuditLog.count({
        where: {
          createdAt: { [Op.gte]: dateFilter },
          severity: 'critical'
        }
      }),
      AuditLog.count({
        where: {
          createdAt: { [Op.gte]: dateFilter },
          status: 'failure'
        }
      }),
      AuditLog.findAll({
        attributes: [
          'userId',
          [sequelize.fn('COUNT', sequelize.col('auditId')), 'activityCount'],
        ],
        where: { createdAt: { [Op.gte]: dateFilter } },
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['username', 'email'],
          },
        ],
        group: ['userId', 'user.userId'],
        order: [[sequelize.fn('COUNT', sequelize.col('auditId')), 'DESC']],
        limit: 10,
      }),
    ]);

    res.json({
      success: true,
      data: {
        totalLogs,
        criticalLogs,
        failedLogs,
        userActivity,
        period,
      },
    });
  } catch (error) {
    console.error('Error fetching audit stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch audit statistics',
      error: error.message,
    });
  }
};

export const deleteAuditLogs = async (req, res) => {
  try {
    const { auditIds } = req.body;

    if (!auditIds || !Array.isArray(auditIds)) {
      return res.status(400).json({
        success: false,
        message: 'Audit IDs array is required',
      });
    }

    const deletedCount = await AuditLog.destroy({
      where: {
        auditId: auditIds,
      },
    });

    res.json({
      success: true,
      message: `${deletedCount} audit logs deleted successfully`,
      data: { deletedCount },
    });
  } catch (error) {
    console.error('Error deleting audit logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete audit logs',
      error: error.message,
    });
  }
};

export const exportAuditLogs = async (req, res) => {
  try {
    const {
      format = 'csv',
      startDate,
      endDate,
      userId,
      action,
      entityType,
    } = req.query;

    const whereClause = {};
    if (userId) whereClause.userId = userId;
    if (action) whereClause.action = action;
    if (entityType) whereClause.entityType = entityType;

    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) whereClause.createdAt[Op.gte] = new Date(startDate);
      if (endDate) whereClause.createdAt[Op.lte] = new Date(endDate);
    }

    const auditLogs = await AuditLog.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['username', 'email', 'role'],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    // Generate export based on format
    if (format === 'csv') {
      const csvData = auditLogs.map(log => ({
        'Audit ID': log.auditId,
        'User': log.user?.username || 'Unknown',
        'Email': log.user?.email || 'Unknown',
        'Action': log.action,
        'Entity Type': log.entityType,
        'Entity ID': log.entityId || 'N/A',
        'Severity': log.severity,
        'Status': log.status,
        'IP Address': log.ipAddress || 'N/A',
        'Timestamp': log.createdAt,
      }));

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="audit-logs.csv"');
      res.send(csvData);
    } else {
      res.json({
        success: true,
        data: auditLogs,
        format: 'json',
      });
    }
  } catch (error) {
    console.error('Error exporting audit logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export audit logs',
      error: error.message,
    });
  }
};