import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const AdminSession = sequelize.define('AdminSession', {
  sessionId: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'userId',
    },
  },
  sessionToken: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
  },
  ipAddress: {
    type: DataTypes.STRING(45),
    allowNull: true,
  },
  userAgent: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  deviceInfo: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  location: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  loginTime: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  lastActivity: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  loginMethod: {
    type: DataTypes.ENUM('password', 'google', 'microsoft', 'sso'),
    defaultValue: 'password',
  },
  riskScore: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Security risk score (0-100)',
  },
  geoLocation: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'JSON string with latitude, longitude, city, country',
  },
}, {
  tableName: 'admin_sessions',
  timestamps: true,
  updatedAt: false,
  indexes: [
    {
      fields: ['userId'],
    },
    {
      fields: ['sessionToken'],
    },
    {
      fields: ['isActive'],
    },
    {
      fields: ['expiresAt'],
    },
    {
      fields: ['lastActivity'],
    },
    {
      fields: ['ipAddress'],
    },
  ],
});

export default AdminSession;