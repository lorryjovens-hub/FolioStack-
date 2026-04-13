const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const config = require('../config');

const Deployment = sequelize.define('Deployment', {
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
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  slug: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
  },
  customDomain: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('pending', 'building', 'deployed', 'failed', 'archived'),
    defaultValue: 'pending',
  },
  buildLog: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  buildTime: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  deployedUrl: {
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
  commitSha: {
    type: DataTypes.STRING(40),
    allowNull: true,
  },
  branch: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  envVars: {
    type: DataTypes.JSONB,
    defaultValue: {},
  },
  settings: {
    type: DataTypes.JSONB,
    defaultValue: {
      buildCommand: 'npm run build',
      outputDir: 'dist',
      nodeVersion: '18',
    },
  },
  sslEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  views: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  lastDeployedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'deployments',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['user_id'] },
    { fields: ['status'] },
    { fields: ['slug'], unique: true },
    { fields: ['deployed_url'] },
    { fields: ['created_at'] },
  ],
});

Deployment.prototype.generateUrl = function() {
  if (this.customDomain) {
    return `https://${this.customDomain}`;
  }
  return `${config.deploy.baseUrl.replace('/api', '')}/sites/${this.slug}`;
};

Deployment.associate = (models) => {
  Deployment.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
  Deployment.hasMany(models.Work, { foreignKey: 'deploymentId', as: 'works' });
};

module.exports = Deployment;
