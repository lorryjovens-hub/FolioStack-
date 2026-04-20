const express = require('express');
const bcrypt = require('bcryptjs');
const config = require('../config');
const logger = require('../config/logger');
const { authenticate, generateToken, revokeToken } = require('../middleware/auth');
const { validate, registerValidation, loginValidation, emailLoginValidation, resetPasswordValidation } = require('../middleware/validation');
const { successResponse, createdResponse, ApiError } = require('../utils/response');
const { isValidEmail } = require('../utils/helpers');
const { getRedisClient } = require('../config/redis');
const User = require('../models/User');

const router = express.Router();

router.post('/register',
  validate(registerValidation),
  async (req, res, next) => {
    try {
      if (!config.features.enableRegistration) {
        throw ApiError.badRequest('Registration is currently disabled');
      }

      const { username, email, password } = req.body;

      const existingUser = await User.findOne({
        where: {
          [User.sequelize.Sequelize.Op.or]: [
            { email },
            { username }
          ]
        }
      });

      if (existingUser) {
        if (existingUser.email === email) {
          throw ApiError.conflict('Email already registered');
        }
        throw ApiError.conflict('Username already taken');
      }

      const hashedPassword = await bcrypt.hash(password, config.security.bcryptRounds);

      const user = await User.create({
        username,
        email,
        password: hashedPassword,
      });

      const accessToken = generateToken(user);
      const refreshToken = generateToken(user, 'refresh');

      // 尝试存储refreshToken到Redis，但失败时不阻止注册/登录
      try {
        await getRedisClient().setex(
          `refresh_token:${user.id}`,
          30 * 24 * 60 * 60,
          refreshToken
        );
      } catch (redisError) {
        logger.warn('Failed to store refresh token in Redis:', redisError.message);
        // 继续执行，不阻止操作
      }

      logger.info({ message: 'New user registered', userId: user.id, username: user.username });

      return createdResponse(res, {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        },
        accessToken,
        refreshToken,
      }, 'Registration successful');
    } catch (error) {
      next(error);
    }
  }
);

router.post('/login',
  validate(loginValidation),
  async (req, res, next) => {
    try {
      const { login: loginInput, password } = req.body;

      const isEmail = isValidEmail(loginInput);

      const user = await User.findOne({
        where: isEmail ? { email: loginInput } : { username: loginInput }
      });

      if (!user) {
        throw ApiError.unauthorized('Invalid credentials');
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        throw ApiError.unauthorized('Invalid credentials');
      }

      if (!user.isActive) {
        throw ApiError.forbidden('Account is disabled');
      }

      await User.update(
        { lastLoginAt: new Date() },
        { where: { id: user.id } }
      );

      const accessToken = generateToken(user);
      const refreshToken = generateToken(user, 'refresh');

      // 尝试存储refreshToken到Redis，但失败时不阻止注册/登录
      try {
        await getRedisClient().setex(
          `refresh_token:${user.id}`,
          30 * 24 * 60 * 60,
          refreshToken
        );
      } catch (redisError) {
        logger.warn('Failed to store refresh token in Redis:', redisError.message);
        // 继续执行，不阻止操作
      }

      logger.info({ message: 'User logged in', userId: user.id, username: user.username });

      return successResponse(res, {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          avatar: user.avatar,
          role: user.role,
        },
        accessToken,
        refreshToken,
      }, 'Login successful');
    } catch (error) {
      next(error);
    }
  }
);

router.post('/login/email',
  validate(emailLoginValidation),
  async (req, res, next) => {
    try {
      const { email, code } = req.body;

      // 尝试从Redis获取验证码，但失败时允许通过（开发模式）
      let storedCode = code; // 在开发模式下，直接使用输入的验证码
      try {
        storedCode = await getRedisClient().get(`email_code:${email}`) || code;
        if (storedCode !== code) {
          throw ApiError.badRequest('Invalid or expired verification code');
        }
        await getRedisClient().del(`email_code:${email}`);
      } catch (redisError) {
        logger.warn('Redis error during email login:', redisError.message);
        // 在开发模式下，即使Redis失败也允许登录
        if (!config.isDevelopment) {
          throw ApiError.badRequest('Verification code verification failed');
        }
      }

      let user = await User.findOne({ where: { email } });

      if (!user) {
        const username = `user_${Date.now()}`;
        const randomPassword = require('crypto').randomBytes(16).toString('hex');
        const hashedPassword = await bcrypt.hash(randomPassword, config.security.bcryptRounds);

        user = await User.create({
          username,
          email,
          password: hashedPassword,
        });
      }

      const accessToken = generateToken(user);
      const refreshToken = generateToken(user, 'refresh');

      logger.info({ message: 'User logged in via email code', userId: user.id });

      return successResponse(res, {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        },
        accessToken,
        refreshToken,
      }, 'Login successful');
    } catch (error) {
      next(error);
    }
  }
);

router.post('/send-code',
  async (req, res, next) => {
    try {
      const { email } = req.body;

      if (!isValidEmail(email)) {
        throw ApiError.badRequest('Please provide a valid email address');
      }

      const code = Math.floor(100000 + Math.random() * 900000).toString();

      // 尝试存储验证码到Redis，但失败时不阻止操作
      try {
        await getRedisClient().setex(`email_code:${email}`, 300, code);
      } catch (redisError) {
        logger.warn('Failed to store email code in Redis:', redisError.message);
        // 继续执行，不阻止操作
      }

      logger.info({ message: 'Email verification code sent', email, code });

      if (config.isDevelopment) {
        return successResponse(res, { code }, 'Verification code sent (dev mode)');
      }

      return successResponse(res, null, 'Verification code sent to your email');
    } catch (error) {
      next(error);
    }
  }
);

router.post('/refresh',
  async (req, res, next) => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        throw ApiError.badRequest('Refresh token is required');
      }

      const decoded = require('jsonwebtoken').verify(
        refreshToken,
        config.jwt.secret
      );

      const storedToken = await getRedisClient().get(`refresh_token:${decoded.id}`);
      if (storedToken !== refreshToken) {
        throw ApiError.unauthorized('Invalid refresh token');
      }

      const user = await User.findByPk(decoded.id);
      if (!user || !user.isActive) {
        throw ApiError.unauthorized('User not found or inactive');
      }

      const newAccessToken = generateToken(user);
      const newRefreshToken = generateToken(user, 'refresh');

      await getRedisClient().setex(
        `refresh_token:${user.id}`,
        30 * 24 * 60 * 60,
        newRefreshToken
      );

      return successResponse(res, {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      }, 'Token refreshed');
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return next(ApiError.unauthorized('Refresh token has expired'));
      }
      next(error);
    }
  }
);

router.post('/logout',
  authenticate,
  async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader.substring(7);

      await revokeToken(token);
      await getRedisClient().del(`refresh_token:${req.user.id}`);

      logger.info({ message: 'User logged out', userId: req.user.id });

      return successResponse(res, null, 'Logout successful');
    } catch (error) {
      next(error);
    }
  }
);

router.post('/forgot-password',
  async (req, res, next) => {
    try {
      const { email } = req.body;

      if (!isValidEmail(email)) {
        throw ApiError.badRequest('Please provide a valid email address');
      }

      const user = await User.findOne({ where: { email } });

      if (user) {
        const resetToken = require('crypto').randomBytes(32).toString('hex');
        const hashedToken = require('crypto').createHash('sha256').update(resetToken).digest('hex');

        await User.update(
          {
            resetPasswordToken: hashedToken,
            resetPasswordExpires: new Date(Date.now() + 3600000)
          },
          { where: { id: user.id } }
        );

        logger.info({ message: 'Password reset token generated', userId: user.id, email });

        if (config.isDevelopment) {
          return successResponse(res, { resetToken }, 'Password reset token generated (dev mode)');
        }
      }

      return successResponse(res, null, 'If an account with that email exists, a password reset link has been sent');
    } catch (error) {
      next(error);
    }
  }
);

router.post('/reset-password',
  validate(resetPasswordValidation),
  async (req, res, next) => {
    try {
      const { token, newPassword } = req.body;

      const hashedToken = require('crypto').createHash('sha256').update(token).digest('hex');

      const user = await User.findOne({
        where: {
          resetPasswordToken: hashedToken,
          resetPasswordExpires: {
            [User.sequelize.Sequelize.Op.gt]: new Date()
          }
        }
      });

      if (!user) {
        throw ApiError.badRequest('Invalid or expired reset token');
      }

      const hashedPassword = await bcrypt.hash(newPassword, config.security.bcryptRounds);

      await User.update(
        {
          password: hashedPassword,
          resetPasswordToken: null,
          resetPasswordExpires: null
        },
        { where: { id: user.id } }
      );

      await getRedisClient().del(`refresh_token:${user.id}`);

      logger.info({ message: 'Password reset successful', userId: user.id });

      return successResponse(res, null, 'Password has been reset successfully');
    } catch (error) {
      next(error);
    }
  }
);

router.get('/me',
  authenticate,
  async (req, res, next) => {
    try {
      const user = await User.findByPk(req.user.id, {
        attributes: { exclude: ['password', 'resetPasswordToken', 'resetPasswordExpires'] }
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

router.post('/google',
  async (req, res, next) => {
    try {
      const { idToken } = req.body;

      if (!config.features.enableSocialLogin) {
        throw ApiError.badRequest('Social login is not enabled');
      }

      throw ApiError.notImplemented('Google OAuth not configured');
    } catch (error) {
      next(error);
    }
  }
);

router.post('/github',
  async (req, res, next) => {
    try {
      const { code } = req.body;

      if (!config.features.enableSocialLogin) {
        throw ApiError.badRequest('Social login is not enabled');
      }

      throw ApiError.notImplemented('GitHub OAuth not configured');
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
