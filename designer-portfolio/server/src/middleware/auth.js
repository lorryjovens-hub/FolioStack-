const jwt = require('jsonwebtoken');
const config = require('../config');
const logger = require('../config/logger');
const { ApiError } = require('../utils/response');
const { getRedisClient } = require('../config/redis');

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw ApiError.unauthorized('No token provided');
    }

    const token = authHeader.substring(7);

    const redisClient = getRedisClient();
    const isBlacklisted = await redisClient.get(`blacklist:${token}`);
    if (isBlacklisted) {
      throw ApiError.unauthorized('Token has been revoked');
    }

    const decoded = jwt.verify(token, config.jwt.secret);

    req.user = {
      id: decoded.id,
      email: decoded.email,
      username: decoded.username,
      role: decoded.role,
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(ApiError.unauthorized('Token has expired'));
    }
    if (error.name === 'JsonWebTokenError') {
      return next(ApiError.unauthorized('Invalid token'));
    }
    next(error);
  }
}

function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized('Not authenticated'));
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(req.user.role)) {
      logger.warn({
        message: 'Access denied due to insufficient permissions',
        userId: req.user.id,
        userRole: req.user.role,
        requiredRoles: allowedRoles,
        path: req.path,
      });
      return next(ApiError.forbidden('Insufficient permissions'));
    }

    next();
  };
}

function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    req.user = {
      id: decoded.id,
      email: decoded.email,
      username: decoded.username,
      role: decoded.role,
    };
  } catch (error) {
  }

  next();
}

function generateToken(user, type = 'access') {
  const expiresIn = type === 'refresh'
    ? config.jwt.refreshExpiresIn
    : config.jwt.expiresIn;

  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role || 'user',
    },
    config.jwt.secret,
    { expiresIn }
  );
}

async function revokeToken(token) {
  try {
    const decoded = jwt.verify(token, config.jwt.secret, { ignoreExpiration: true });
    const redisClient = getRedisClient();
    const ttl = decoded.exp - Math.floor(Date.now() / 1000);
    if (ttl > 0) {
      await redisClient.setex(`blacklist:${token}`, ttl, 'revoked');
    }
    return true;
  } catch (error) {
    return false;
  }
}

module.exports = {
  authenticate,
  authorize,
  optionalAuth,
  generateToken,
  revokeToken,
};
