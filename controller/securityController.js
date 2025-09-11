import SecurityAlert from '../model/securityAlert.js';
import User from '../model/user.js';
import { Op } from 'sequelize';
import sequelize from '../config/db.js';

export const createSecurityAlert = async (req, res) => {
  try {
    const {
      alertType,
      severity = 'medium',
      userId,
      ipAddress,
      userAgent,
      location,
      description,
      metadata,
    } = req.body;

    const alert = await SecurityAlert.create({
      alertType,
      severity,
      userId,
      ipAddress,
      userAgent,
      location,
      description,
      metadata: metadata ? JSON.stringify(metadata) : null,
    });

    // Populate user information
    const populatedAlert = await SecurityAlert.findByPk(alert.alertId, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['userId', 'username', 'email', 'role'],
        },
        {
          model: User,
          as: 'resolver',
          attributes: ['userId', 'username'],
        },
      ],
    });

    res.status(201).json({
      success: true,
      message: 'Security alert created successfully',
      data: populatedAlert,
    });
  } catch (error) {
    console.error('Error creating security alert:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create security alert',
      error: error.message,
    });
  }
};

export const getSecurityAlerts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      alertType,
      severity,
      status = 'active',
      userId,
      startDate,
      endDate,
      sortBy = 'alertTriggered',
      sortOrder = 'DESC',
    } = req.query;

    const offset = (page - 1) * limit;
    const whereClause = {};

    if (alertType) whereClause.alertType = alertType;
    if (severity) whereClause.severity = severity;
    if (status) whereClause.status = status;
    if (userId) whereClause.userId = userId;

    if (startDate || endDate) {
      whereClause.alertTriggered = {};
      if (startDate) whereClause.alertTriggered[Op.gte] = new Date(startDate);
      if (endDate) whereClause.alertTriggered[Op.lte] = new Date(endDate);
    }

    const { count, rows } = await SecurityAlert.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['userId', 'username', 'email', 'role'],
        },
        {
          model: User,
          as: 'resolver',
          attributes: ['userId', 'username'],
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
    console.error('Error fetching security alerts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch security alerts',
      error: error.message,
    });
  }
};

export const updateAlertStatus = async (req, res) => {
  try {
    const { alertId } = req.params;
    const { status, resolutionNotes } = req.body;
    const resolvedBy = req.user.userId;

    const alert = await SecurityAlert.findByPk(alertId);
    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Security alert not found',
      });
    }

    const updateData = {
      status,
      lastUpdated: new Date(),
    };

    if (status === 'resolved' || status === 'dismissed') {
      updateData.resolvedBy = resolvedBy;
      updateData.resolvedAt = new Date();
      if (resolutionNotes) {
        updateData.resolutionNotes = resolutionNotes;
      }
    }

    await alert.update(updateData);

    // Fetch updated alert with resolver info
    const updatedAlert = await SecurityAlert.findByPk(alertId, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['userId', 'username', 'email', 'role'],
        },
        {
          model: User,
          as: 'resolver',
          attributes: ['userId', 'username'],
        },
      ],
    });

    res.json({
      success: true,
      message: 'Alert status updated successfully',
      data: updatedAlert,
    });
  } catch (error) {
    console.error('Error updating alert status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update alert status',
      error: error.message,
    });
  }
};

export const getSecurityStats = async (req, res) => {
  try {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get alert counts by time period
    const [totalAlerts, alerts24h, alerts7d, alerts30d] = await Promise.all([
      SecurityAlert.count(),
      SecurityAlert.count({ where: { alertTriggered: { [Op.gte]: last24h } } }),
      SecurityAlert.count({ where: { alertTriggered: { [Op.gte]: last7d } } }),
      SecurityAlert.count({ where: { alertTriggered: { [Op.gte]: last30d } } }),
    ]);

    // Get alerts by severity
    const severityStats = await SecurityAlert.findAll({
      attributes: [
        'severity',
        [sequelize.fn('COUNT', sequelize.col('alertId')), 'count'],
      ],
      group: ['severity'],
      raw: true,
    });

    // Get alerts by status
    const statusStats = await SecurityAlert.findAll({
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('alertId')), 'count'],
      ],
      group: ['status'],
      raw: true,
    });

    // Get alerts by type
    const typeStats = await SecurityAlert.findAll({
      attributes: [
        'alertType',
        [sequelize.fn('COUNT', sequelize.col('alertId')), 'count'],
      ],
      group: ['alertType'],
      order: [[sequelize.fn('COUNT', sequelize.col('alertId')), 'DESC']],
      limit: 10,
      raw: true,
    });

    // Get recent critical alerts
    const recentCritical = await SecurityAlert.findAll({
      where: {
        severity: 'critical',
        alertTriggered: { [Op.gte]: last7d },
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['userId', 'username', 'email'],
        },
      ],
      order: [['alertTriggered', 'DESC']],
      limit: 5,
    });

    // Get top suspicious IPs
    const suspiciousIPs = await SecurityAlert.findAll({
      attributes: [
        'ipAddress',
        [sequelize.fn('COUNT', sequelize.col('alertId')), 'alertCount'],
      ],
      where: {
        ipAddress: { [Op.not]: null },
        alertTriggered: { [Op.gte]: last30d },
      },
      group: ['ipAddress'],
      order: [[sequelize.fn('COUNT', sequelize.col('alertId')), 'DESC']],
      limit: 10,
      raw: true,
    });

    res.json({
      success: true,
      data: {
        overview: {
          totalAlerts,
          alerts24h,
          alerts7d,
          alerts30d,
        },
        severityStats,
        statusStats,
        typeStats,
        recentCritical,
        suspiciousIPs,
      },
    });
  } catch (error) {
    console.error('Error fetching security stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch security statistics',
      error: error.message,
    });
  }
};

export const getSecurityDashboard = async (req, res) => {
  try {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get active alerts count
    const activeAlerts = await SecurityAlert.count({
      where: { status: 'active' },
    });

    // Get critical alerts in last 24h
    const criticalAlerts24h = await SecurityAlert.count({
      where: {
        severity: 'critical',
        alertTriggered: { [Op.gte]: last24h },
      },
    });

    // Get failed login attempts trend (mock data for now)
    const failedLoginTrend = [
      { date: '2024-01-01', count: 5 },
      { date: '2024-01-02', count: 12 },
      { date: '2024-01-03', count: 8 },
      { date: '2024-01-04', count: 15 },
      { date: '2024-01-05', count: 6 },
      { date: '2024-01-06', count: 9 },
      { date: '2024-01-07', count: 11 },
    ];

    // Get recent alerts
    const recentAlerts = await SecurityAlert.findAll({
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['userId', 'username', 'email'],
        },
      ],
      order: [['alertTriggered', 'DESC']],
      limit: 10,
    });

    res.json({
      success: true,
      data: {
        activeAlerts,
        criticalAlerts24h,
        failedLoginTrend,
        recentAlerts,
      },
    });
  } catch (error) {
    console.error('Error fetching security dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch security dashboard data',
      error: error.message,
    });
  }
};

export const bulkUpdateAlerts = async (req, res) => {
  try {
    const { alertIds, status, resolutionNotes } = req.body;
    const resolvedBy = req.user.userId;

    const updateData = {
      status,
      lastUpdated: new Date(),
    };

    if (status === 'resolved' || status === 'dismissed') {
      updateData.resolvedBy = resolvedBy;
      updateData.resolvedAt = new Date();
      if (resolutionNotes) {
        updateData.resolutionNotes = resolutionNotes;
      }
    }

    const [affectedRows] = await SecurityAlert.update(updateData, {
      where: {
        alertId: { [Op.in]: alertIds },
      },
    });

    res.json({
      success: true,
      message: `${affectedRows} alerts updated successfully`,
      data: { updatedCount: affectedRows },
    });
  } catch (error) {
    console.error('Error bulk updating alerts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to bulk update alerts',
      error: error.message,
    });
  }
};