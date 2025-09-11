import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const SecurityAlert = sequelize.define('SecurityAlert', {
  alertId: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  alertType: {
    type: DataTypes.ENUM(
      'failed_login',
      'suspicious_ip',
      'multiple_failed_attempts',
      'unusual_login_time',
      'unusual_location',
      'brute_force_attempt',
      'suspicious_activity',
      'security_breach',
      'data_access_violation',
      'admin_privilege_escalation'
    ),
    allowNull: false,
  },
  severity: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
    allowNull: false,
    defaultValue: 'medium',
  },
  status: {
    type: DataTypes.ENUM('active', 'investigating', 'resolved', 'dismissed'),
    allowNull: false,
    defaultValue: 'active',
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'userId',
    },
  },
  ipAddress: {
    type: DataTypes.STRING(45),
    allowNull: true,
  },
  userAgent: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  location: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  metadata: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'JSON string with additional alert data',
  },
  resolvedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'userId',
    },
  },
  resolvedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  resolutionNotes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  alertTriggered: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  lastUpdated: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'security_alerts',
  timestamps: true,
  updatedAt: 'lastUpdated',
  indexes: [
    {
      fields: ['alertType'],
    },
    {
      fields: ['severity'],
    },
    {
      fields: ['status'],
    },
    {
      fields: ['userId'],
    },
    {
      fields: ['ipAddress'],
    },
    {
      fields: ['alertTriggered'],
    },
    {
      fields: ['status', 'severity'],
    },
  ],
});

export default SecurityAlert;