import AdminSession from '../model/adminSession.js';
import User from '../model/user.js';
import { Op } from 'sequelize';
import sequelize from '../config/db.js';

export const createSession = async (req, res) => {
  try {
    const { userId, sessionToken, ipAddress, userAgent, deviceInfo, location, loginMethod = 'password' } = req.body;

    // Calculate expiration time (24 hours from now)
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Calculate risk score based on various factors
    let riskScore = 0;

    // Check for suspicious login patterns
    const recentSessions = await AdminSession.findAll({
      where: {
        userId,
        createdAt: { [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
      order: [['createdAt', 'DESC']],
      limit: 5,
    });

    // Risk factors
    if (recentSessions.length > 3) riskScore += 20; // Multiple recent logins
    if (location && recentSessions.some(s => s.location !== location)) riskScore += 30; // Different location
    if (deviceInfo && recentSessions.some(s => s.deviceInfo !== deviceInfo)) riskScore += 25; // Different device

    const session = await AdminSession.create({
      userId,
      sessionToken,
      ipAddress,
      userAgent,
      deviceInfo,
      location,
      expiresAt,
      loginMethod,
      riskScore: Math.min(riskScore, 100),
    });

    res.status(201).json({
      success: true,
      message: 'Session created successfully',
      data: session,
    });
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create session',
      error: error.message,
    });
  }
};

export const getUserSessions = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10, activeOnly = false } = req.query;

    const offset = (page - 1) * limit;
    const whereClause = { userId };

    if (activeOnly === 'true') {
      whereClause.isActive = true;
      whereClause.expiresAt = { [Op.gt]: new Date() };
    }

    const { count, rows } = await AdminSession.findAndCountAll({
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
      order: [['createdAt', 'DESC']],
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
    console.error('Error fetching user sessions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user sessions',
      error: error.message,
    });
  }
};

export const getAllSessions = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      userId,
      isActive,
      riskLevel,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = req.query;

    const offset = (page - 1) * limit;
    const whereClause = {};

    if (userId) whereClause.userId = userId;
    if (isActive !== undefined) whereClause.isActive = isActive === 'true';
    if (riskLevel) {
      switch (riskLevel) {
        case 'low':
          whereClause.riskScore = { [Op.lt]: 30 };
          break;
        case 'medium':
          whereClause.riskScore = { [Op.between]: [30, 70] };
          break;
        case 'high':
          whereClause.riskScore = { [Op.gte]: 70 };
          break;
      }
    }

    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) whereClause.createdAt[Op.gte] = new Date(startDate);
      if (endDate) whereClause.createdAt[Op.lte] = new Date(endDate);
    }

    const { count, rows } = await AdminSession.findAndCountAll({
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
    console.error('Error fetching sessions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sessions',
      error: error.message,
    });
  }
};

export const updateSessionActivity = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await AdminSession.findByPk(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
      });
    }

    await session.update({
      lastActivity: new Date(),
    });

    res.json({
      success: true,
      message: 'Session activity updated',
    });
  } catch (error) {
    console.error('Error updating session activity:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update session activity',
      error: error.message,
    });
  }
};

export const terminateSession = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await AdminSession.findByPk(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
      });
    }

    await session.update({
      isActive: false,
      expiresAt: new Date(), // Expire immediately
    });

    res.json({
      success: true,
      message: 'Session terminated successfully',
    });
  } catch (error) {
    console.error('Error terminating session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to terminate session',
      error: error.message,
    });
  }
};

export const terminateUserSessions = async (req, res) => {
  try {
    const { userId } = req.params;
    const { exceptCurrent = false, currentSessionId } = req.body;

    const whereClause = { userId };

    if (exceptCurrent && currentSessionId) {
      whereClause.sessionId = { [Op.ne]: currentSessionId };
    }

    const [affectedRows] = await AdminSession.update(
      {
        isActive: false,
        expiresAt: new Date(),
      },
      {
        where: whereClause,
      }
    );

    res.json({
      success: true,
      message: `${affectedRows} sessions terminated successfully`,
      data: { terminatedCount: affectedRows },
    });
  } catch (error) {
    console.error('Error terminating user sessions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to terminate user sessions',
      error: error.message,
    });
  }
};

export const getSessionStats = async (req, res) => {
  try {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [totalSessions, activeSessions, expiredSessions, highRiskSessions] = await Promise.all([
      AdminSession.count(),
      AdminSession.count({
        where: {
          isActive: true,
          expiresAt: { [Op.gt]: now },
        },
      }),
      AdminSession.count({
        where: {
          expiresAt: { [Op.lt]: now },
        },
      }),
      AdminSession.count({
        where: {
          riskScore: { [Op.gte]: 70 },
          createdAt: { [Op.gte]: last7d },
        },
      }),
    ]);

    // Get recent login activity
    const recentLogins = await AdminSession.findAll({
      where: {
        createdAt: { [Op.gte]: last24h },
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['username', 'role'],
        },
      ],
      order: [['createdAt', 'DESC']],
      limit: 10,
    });

    res.json({
      success: true,
      data: {
        totalSessions,
        activeSessions,
        expiredSessions,
        highRiskSessions,
        recentLogins,
      },
    });
  } catch (error) {
    console.error('Error fetching session stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch session statistics',
      error: error.message,
    });
  }
};

export const cleanupExpiredSessions = async (req, res) => {
  try {
    const [affectedRows] = await AdminSession.update(
      { isActive: false },
      {
        where: {
          expiresAt: { [Op.lt]: new Date() },
          isActive: true,
        },
      }
    );

    res.json({
      success: true,
      message: `${affectedRows} expired sessions cleaned up`,
      data: { cleanedCount: affectedRows },
    });
  } catch (error) {
    console.error('Error cleaning up expired sessions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cleanup expired sessions',
      error: error.message,
    });
  }
};