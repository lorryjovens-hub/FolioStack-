const express = require('express');
const config = require('../config');
const { authenticate } = require('../middleware/auth');
const { successResponse, ApiError } = require('../utils/response');
const { User } = require('../models');
const logger = require('../config/logger');

const router = express.Router();

router.get('/',
  authenticate,
  async (req, res, next) => {
    try {
      const user = await User.findByPk(req.user.id);

      if (!user) {
        throw ApiError.notFound('User not found');
      }

      return successResponse(res, { settings: user.settings });
    } catch (error) {
      next(error);
    }
  }
);

router.patch('/',
  authenticate,
  async (req, res, next) => {
    try {
      const { theme, language, notifications, privacy, preferences } = req.body;

      const user = await User.findByPk(req.user.id);

      if (!user) {
        throw ApiError.notFound('User not found');
      }

      const currentSettings = user.settings || {};

      user.settings = {
        ...currentSettings,
        theme: theme !== undefined ? theme : currentSettings.theme,
        language: language !== undefined ? language : currentSettings.language,
        notifications: notifications !== undefined ? notifications : currentSettings.notifications,
        privacy: privacy !== undefined ? privacy : currentSettings.privacy,
        preferences: preferences !== undefined ? preferences : currentSettings.preferences,
      };

      await user.save();

      logger.info({ message: 'Settings updated', userId: user.id });

      return successResponse(res, { settings: user.settings }, 'Settings updated successfully');
    } catch (error) {
      next(error);
    }
  }
);

router.get('/theme',
  authenticate,
  async (req, res, next) => {
    try {
      const user = await User.findByPk(req.user.id);

      if (!user) {
        throw ApiError.notFound('User not found');
      }

      const theme = user.settings?.theme || 'dark';

      return successResponse(res, { theme });
    } catch (error) {
      next(error);
    }
  }
);

router.patch('/theme',
  authenticate,
  async (req, res, next) => {
    try {
      const { theme } = req.body;

      if (!['dark', 'light'].includes(theme)) {
        throw ApiError.badRequest('Invalid theme. Must be "dark" or "light"');
      }

      const user = await User.findByPk(req.user.id);

      if (!user) {
        throw ApiError.notFound('User not found');
      }

      user.settings = {
        ...user.settings,
        theme,
      };

      await user.save();

      logger.info({ message: 'Theme updated', userId: user.id, theme });

      return successResponse(res, { theme }, 'Theme updated successfully');
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
