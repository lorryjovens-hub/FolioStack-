const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, changePasswordValidation, paginationValidation } = require('../middleware/validation');
const { successResponse, ApiError, paginatedResponse } = require('../utils/response');
const { User, Work, Deployment } = require('../models');
const logger = require('../config/logger');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(config.upload.dir, 'avatars'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `${uuidv4()}${ext}`;
    cb(null, filename);
  },
});

const avatarUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'));
    }
  },
});

router.get('/',
  authenticate,
  authorize('admin'),
  paginationValidation,
  async (req, res, next) => {
    try {
      const page = req.query.page || 1;
      const limit = req.query.limit || 20;
      const offset = (page - 1) * limit;

      const { count, rows: users } = await User.findAndCountAll({
        attributes: { exclude: ['password', 'resetPasswordToken', 'resetPasswordExpires'] },
        limit,
        offset,
        order: [['createdAt', 'DESC']],
      });

      return paginatedResponse(res, users, page, limit, count, 'Users retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
);

router.get('/:id',
  authenticate,
  async (req, res, next) => {
    try {
      const user = await User.findByPk(req.params.id, {
        attributes: { exclude: ['password', 'resetPasswordToken', 'resetPasswordExpires'] },
        include: [
          {
            model: Work,
            as: 'works',
            where: { status: 'published' },
            required: false,
            limit: 10,
            order: [['createdAt', 'DESC']],
          },
        ],
      });

      if (!user) {
        throw ApiError.notFound('User not found');
      }

      return successResponse(res, { user });
    } catch (error) {
      next(error);
    }
  }
);

router.get('/me/profile',
  authenticate,
  async (req, res, next) => {
    try {
      const user = await User.findByPk(req.user.id, {
        attributes: { exclude: ['password', 'resetPasswordToken', 'resetPasswordExpires'] },
        include: [
          {
            model: Work,
            as: 'works',
            limit: 10,
            order: [['createdAt', 'DESC']],
          },
          {
            model: Deployment,
            as: 'deployments',
            limit: 10,
            order: [['createdAt', 'DESC']],
          },
        ],
      });

      if (!user) {
        throw ApiError.notFound('User not found');
      }

      const stats = {
        totalWorks: await Work.count({ where: { userId: req.user.id } }),
        publishedWorks: await Work.count({ where: { userId: req.user.id, status: 'published' } }),
        totalDeployments: await Deployment.count({ where: { userId: req.user.id } }),
        activeDeployments: await Deployment.count({ where: { userId: req.user.id, status: 'deployed' } }),
      };

      return successResponse(res, { user, stats });
    } catch (error) {
      next(error);
    }
  }
);

router.patch('/me/profile',
  authenticate,
  async (req, res, next) => {
    try {
      const { username, bio, settings } = req.body;

      const user = await User.findByPk(req.user.id);

      if (!user) {
        throw ApiError.notFound('User not found');
      }

      if (username && username !== user.username) {
        const existingUser = await User.findOne({ where: { username } });
        if (existingUser) {
          throw ApiError.conflict('Username already taken');
        }
        user.username = username;
      }

      if (bio !== undefined) {
        user.bio = bio;
      }

      if (settings) {
        user.settings = { ...user.settings, ...settings };
      }

      await user.save();

      logger.info({ message: 'Profile updated', userId: user.id });

      return successResponse(res, { user }, 'Profile updated successfully');
    } catch (error) {
      next(error);
    }
  }
);

router.post('/me/avatar',
  authenticate,
  avatarUpload.single('avatar'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        throw ApiError.badRequest('No file uploaded');
      }

      const user = await User.findByPk(req.user.id);

      if (!user) {
        throw ApiError.notFound('User not found');
      }

      if (user.avatar) {
        const oldAvatarPath = path.join(config.upload.dir, 'avatars', path.basename(user.avatar));
        const fs = require('fs');
        if (fs.existsSync(oldAvatarPath)) {
          fs.unlinkSync(oldAvatarPath);
        }
      }

      const avatarUrl = `/uploads/avatars/${req.file.filename}`;
      user.avatar = avatarUrl;
      await user.save();

      logger.info({ message: 'Avatar updated', userId: user.id, avatar: avatarUrl });

      return successResponse(res, { avatar: avatarUrl }, 'Avatar updated successfully');
    } catch (error) {
      next(error);
    }
  }
);

router.post('/me/change-password',
  authenticate,
  validate(changePasswordValidation),
  async (req, res, next) => {
    try {
      const { currentPassword, newPassword } = req.body;

      const user = await User.findByPk(req.user.id);

      if (!user) {
        throw ApiError.notFound('User not found');
      }

      const isPasswordValid = await user.comparePassword(currentPassword);

      if (!isPasswordValid) {
        throw ApiError.unauthorized('Current password is incorrect');
      }

      user.password = newPassword;
      await user.save();

      logger.info({ message: 'Password changed', userId: user.id });

      return successResponse(res, null, 'Password changed successfully');
    } catch (error) {
      next(error);
    }
  }
);

router.delete('/me/account',
  authenticate,
  async (req, res, next) => {
    try {
      const user = await User.findByPk(req.user.id);

      if (!user) {
        throw ApiError.notFound('User not found');
      }

      await user.destroy();

      logger.info({ message: 'Account deleted', userId: user.id });

      return successResponse(res, null, 'Account deleted successfully');
    } catch (error) {
      next(error);
    }
  }
);

router.patch('/:id',
  authenticate,
  authorize('admin'),
  async (req, res, next) => {
    try {
      const { isActive, role } = req.body;

      const user = await User.findByPk(req.params.id);

      if (!user) {
        throw ApiError.notFound('User not found');
      }

      if (isActive !== undefined) {
        user.isActive = isActive;
      }

      if (role && ['user', 'admin', 'moderator'].includes(role)) {
        user.role = role;
      }

      await user.save();

      logger.info({ message: 'User updated by admin', adminId: req.user.id, userId: user.id });

      return successResponse(res, { user }, 'User updated successfully');
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
