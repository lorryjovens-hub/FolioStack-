require('dotenv').config();

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3002,
  apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:3002/api',

  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    name: process.env.DB_NAME || 'foliostack',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    pool: {
      max: parseInt(process.env.DB_POOL_MAX, 10) || 20,
      min: parseInt(process.env.DB_POOL_MIN, 10) || 5,
      acquire: parseInt(process.env.DB_POOL_ACQUIRE, 10) || 30000,
      idle: parseInt(process.env.DB_POOL_IDLE, 10) || 10000,
    },
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB, 10) || 0,
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },

  upload: {
    dir: process.env.UPLOAD_DIR || './uploads',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 52428800,
    maxZipSize: parseInt(process.env.MAX_ZIP_SIZE, 10) || 104857600,
    allowedImageTypes: (process.env.ALLOWED_IMAGE_TYPES || 'image/jpeg,image/png,image/gif,image/webp').split(','),
    allowedVideoTypes: (process.env.ALLOWED_VIDEO_TYPES || 'video/mp4,video/webm,video/ogg').split(','),
    allowedDocumentTypes: (process.env.ALLOWED_DOCUMENT_TYPES || 'application/pdf,application/zip,application/x-rar-compressed').split(','),
  },

  storage: {
    type: process.env.STORAGE_TYPE || 'local',
    s3: {
      bucket: process.env.AWS_S3_BUCKET || '',
      region: process.env.AWS_S3_REGION || 'us-east-1',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
  },

  proxy: {
    http: process.env.HTTP_PROXY || '',
    https: process.env.HTTPS_PROXY || '',
    noProxy: (process.env.NO_PROXY || 'localhost,127.0.0.1').split(','),
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000,
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
  },

  cors: {
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:3000', 'http://localhost:3001'],
    credentials: process.env.CORS_CREDENTIALS !== 'false',
  },

  log: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || './logs/app.log',
    maxSize: parseInt(process.env.LOG_MAX_SIZE, 10) || 10485760,
    maxFiles: parseInt(process.env.LOG_MAX_FILES, 10) || 5,
  },

  deploy: {
    baseUrl: process.env.DEPLOY_BASE_URL || 'https://foliostack.app',
    dir: process.env.DEPLOY_DIR || './deployments',
  },

  ai: {
    apiKey: process.env.AI_API_KEY || '',
    apiEndpoint: process.env.AI_API_ENDPOINT || '',
  },

  analytics: {
    enabled: process.env.ANALYTICS_ENABLED !== 'false',
    retentionDays: parseInt(process.env.ANALYTICS_RETENTION_DAYS, 10) || 90,
  },

  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS, 10) || 12,
    sessionSecret: process.env.SESSION_SECRET || 'default-session-secret',
    csrfSecret: process.env.CSRF_SECRET || 'default-csrf-secret',
  },

  email: {
    smtp: {
      host: process.env.SMTP_HOST || '',
      port: parseInt(process.env.SMTP_PORT, 10) || 587,
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
      from: process.env.SMTP_FROM || 'noreply@foliostack.app',
    },
  },

  oauth: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      callbackUrl: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3002/api/auth/google/callback',
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID || '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
      callbackUrl: process.env.GITHUB_CALLBACK_URL || 'http://localhost:3002/api/auth/github/callback',
    },
  },

  features: {
    enableRegistration: process.env.ENABLE_REGISTRATION !== 'false',
    enableSocialLogin: process.env.ENABLE_SOCIAL_LOGIN === 'true',
    enableAiFeatures: process.env.ENABLE_AI_FEATURES === 'true',
    enableDeployFeatures: process.env.ENABLE_DEPLOY_FEATURES !== 'false',
  },
};

config.isProduction = config.env === 'production';
config.isDevelopment = config.env === 'development';
config.isTest = config.env === 'test';

module.exports = config;
