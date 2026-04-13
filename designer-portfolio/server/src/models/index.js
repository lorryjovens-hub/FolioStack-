const { sequelize } = require('../config/database');

const User = require('./User');
const Work = require('./Work');
const Deployment = require('./Deployment');
const AnalyticsEvent = require('./AnalyticsEvent');

User.associate({ Work, Deployment, AnalyticsEvent });
Work.associate({ User, Deployment, AnalyticsEvent });
Deployment.associate({ User, Work });
AnalyticsEvent.associate({ User, Work, Deployment });

async function initializeModels() {
  try {
    await sequelize.authenticate();
    console.log('All models have been loaded successfully.');
    return true;
  } catch (error) {
    console.error('Unable to load models:', error);
    return false;
  }
}

async function syncModels(options = {}) {
  try {
    await sequelize.sync(options);
    console.log('All models have been synchronized.');
    return true;
  } catch (error) {
    console.error('Unable to sync models:', error);
    return false;
  }
}

module.exports = {
  sequelize,
  User,
  Work,
  Deployment,
  AnalyticsEvent,
  initializeModels,
  syncModels,
};
