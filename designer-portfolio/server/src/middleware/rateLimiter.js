const rateLimit = require('express-rate-limit');
const config = require('../config');
const logger = require('../config/logger');

const createRateLimiter = (options = {}) => {
  return rateLimit({
    windowMs: options.windowMs || config.rateLimit.windowMs,
    max: options.max || config.rateLimit.maxRequests,
    message: {
      success: false,
      error: {
        message: 'Too many requests, please try again later',
        code: 429,
      },
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next, options) => {
      logger.warn({
        message: 'Rate limit exceeded',
        ip: req.ip,
        path: req.path,
        method: req.method,
      });
      res.status(429).json(options.message);
    },
    keyGenerator: (req) => {
      return req.ip || req.headers['x-forwarded-for'] || 'unknown';
    },
    ...options,
  });
};

const rateLimiter = createRateLimiter();

const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    error: {
      message: 'Too many authentication attempts, please try again after 15 minutes',
      code: 429,
    },
  },
});

const apiLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 100,
  message: {
    success: false,
    error: {
      message: 'API rate limit exceeded, please slow down',
      code: 429,
    },
  },
});

const uploadLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 20,
  message: {
    success: false,
    error: {
      message: 'Upload rate limit exceeded, please wait',
      code: 429,
    },
  },
});

module.exports = {
  rateLimiter,
  authLimiter,
  apiLimiter,
  uploadLimiter,
  createRateLimiter,
};
