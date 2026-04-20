const logger = require('../config/logger');
const { ApiError } = require('../utils/response');
const config = require('../config');

function notFoundHandler(req, res, next) {
  const error = new ApiError(404, `Route ${req.method} ${req.originalUrl} not found`);
  next(error);
}

function errorHandler(err, req, res, next) {
  if (err instanceof ApiError) {
    logger.warn({
      message: err.message,
      statusCode: err.statusCode,
      path: req.path,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return res.status(err.statusCode).json({
      success: false,
      error: {
        message: err.message,
        code: err.statusCode,
        ...(err.details && { details: err.details }),
      },
    });
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Validation error',
        code: 400,
        details: err.message,
      },
    });
  }

  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Invalid or expired token',
        code: 401,
      },
    });
  }

  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      error: {
        message: 'Request payload too large',
        code: 413,
      },
    });
  }

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      error: {
        message: 'File size too large',
        code: 413,
      },
    });
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Unexpected file field',
        code: 400,
      },
    });
  }

  logger.error({
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    body: req.body,
    params: req.params,
    query: req.query,
  });

  if (config && config.isProduction) {
    return res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error',
        code: 500,
      },
    });
  }

  res.status(500).json({
    success: false,
    error: {
      message: err.message || 'Internal server error',
      code: 500,
      stack: err.stack,
    },
  });
}

module.exports = {
  notFoundHandler,
  errorHandler,
};
