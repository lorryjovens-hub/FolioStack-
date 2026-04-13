const winston = require('winston');
const path = require('path');
const fs = require('fs');
const config = require('./index');

const logDir = path.dirname(config.log.file);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }
    if (stack) {
      log += `\n${stack}`;
    }
    return log;
  })
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }
    if (stack) {
      log += `\n${stack}`;
    }
    return log;
  })
);

const transports = [
  new winston.transports.Console({
    format: consoleFormat,
  }),
];

if (config.isProduction || config.log.file) {
  transports.push(
    new winston.transports.File({
      filename: config.log.file,
      level: config.log.level,
      format: logFormat,
      maxsize: config.log.maxSize,
      maxFiles: config.log.maxFiles,
      tailable: true,
    }),
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      format: logFormat,
      maxsize: config.log.maxSize,
      maxFiles: config.log.maxFiles,
    })
  );
}

const logger = winston.createLogger({
  level: config.log.level,
  format: logFormat,
  defaultMeta: { service: 'foliostack-api' },
  transports,
  exitOnError: false,
});

module.exports = logger;
