const logger = require('../config/logger');
const { generateUUID } = require('../utils/helpers');

function requestLogger(req, res, next) {
  const requestId = generateUUID();
  req.requestId = requestId;

  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logLevel = res.statusCode >= 400 ? 'warn' : 'info';

    const logData = {
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      referer: req.get('referer') || req.get('referrer'),
      contentLength: res.get('content-length') || 0,
    };

    if (req.user && req.user.id) {
      logData.userId = req.user.id;
    }

    if (req.query && Object.keys(req.query).length > 0) {
      logData.query = req.query;
    }

    if (req.body && Object.keys(req.body).length > 0 && !req.body.password) {
      logData.body = req.body;
    }

    logger[logLevel](logData);
  });

  res.setHeader('X-Request-Id', requestId);
  next();
}

function errorLogger(err, req, res, next) {
  logger.error({
    requestId: req.requestId,
    message: err.message,
    stack: err.stack,
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  next(err);
}

module.exports = {
  requestLogger,
  errorLogger,
};
