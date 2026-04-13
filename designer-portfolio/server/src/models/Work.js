const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Work = sequelize.define('Work', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  type: {
    type: DataTypes.ENUM('link', 'file', 'github', 'deployed'),
    defaultValue: 'link',
  },
  url: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  thumbnail: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  filePath: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  fileSize: {
    type: DataTypes.BIGINT,
    allowNull: true,
  },
  fileType: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  githubUrl: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  githubRepo: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  tags: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: [],
  },
  category: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('draft', 'published', 'archived'),
    defaultValue: 'published',
  },
  featured: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  viewCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  likeCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {},
  },
  deployedUrl: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  deploymentId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'deployments',
      key: 'id',
    },
  },
}, {
  tableName: 'works',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['user_id'] },
    { fields: ['status'] },
    { fields: ['featured'] },
    { fields: ['created_at'] },
    { fields: ['tags'], using: 'gin' },
  ],
});

Work.associate = (models) => {
  Work.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
  Work.hasMany(models.AnalyticsEvent, { foreignKey: 'workId', as: 'analyticsEvents' });
  Work.belongsTo(models.Deployment, { foreignKey: 'deploymentId', as: 'deployment' });
};

module.exports = Work;
