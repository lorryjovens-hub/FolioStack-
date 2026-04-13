const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AnalyticsEvent = sequelize.define('AnalyticsEvent', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  workId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'works',
      key: 'id',
    },
  },
  deploymentId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'deployments',
      key: 'id',
    },
  },
  eventType: {
    type: DataTypes.ENUM(
      'page_view',
      'work_view',
      'work_like',
      'work_share',
      'work_download',
      'deployment_view',
      'deployment_click',
      'user_signup',
      'user_login'
    ),
    allowNull: false,
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {},
  },
  ip: {
    type: DataTypes.STRING(45),
    allowNull: true,
  },
  userAgent: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  referrer: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  country: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  city: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  device: {
    type: DataTypes.ENUM('desktop', 'mobile', 'tablet', 'other'),
    allowNull: true,
  },
  browser: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  os: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
}, {
  tableName: 'analytics_events',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['user_id'] },
    { fields: ['work_id'] },
    { fields: ['deployment_id'] },
    { fields: ['event_type'] },
    { fields: ['created_at'] },
    { fields: ['user_id', 'event_type'] },
    { fields: ['work_id', 'event_type'] },
  ],
});

AnalyticsEvent.associate = (models) => {
  AnalyticsEvent.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
  AnalyticsEvent.belongsTo(models.Work, { foreignKey: 'workId', as: 'work' });
  AnalyticsEvent.belongsTo(models.Deployment, { foreignKey: 'deploymentId', as: 'deployment' });
};

module.exports = AnalyticsEvent;
