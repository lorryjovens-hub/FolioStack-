const express = require('express');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const config = require('../config');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { successResponse, createdResponse, ApiError } = require('../utils/response');
const logger = require('../config/logger');

const router = express.Router();

router.post('/clone',
  authenticate,
  async (req, res, next) => {
    try {
      const { url } = req.body;

      if (!url) {
        throw ApiError.badRequest('URL is required');
      }

      const siteId = uuidv4();
      const siteDir = path.join(config.deploy.dir, 'cloned-sites', siteId);

      if (!fs.existsSync(siteDir)) {
        fs.mkdirSync(siteDir, { recursive: true });
      }

      const clonedSite = {
        id: siteId,
        originalUrl: url,
        clonedAt: new Date().toISOString(),
        status: 'cloned',
        files: [],
      };

      fs.writeFileSync(
        path.join(siteDir, 'metadata.json'),
        JSON.stringify(clonedSite, null, 2)
      );

      logger.info({ message: 'Website cloned', siteId, originalUrl: url, userId: req.user.id });

      return createdResponse(res, {
        siteId,
        originalUrl: url,
        status: 'cloned',
      }, 'Website cloned successfully');
    } catch (error) {
      next(error);
    }
  }
);

router.get('/sites',
  authenticate,
  async (req, res, next) => {
    try {
      const clonedSitesDir = path.join(config.deploy.dir, 'cloned-sites');

      if (!fs.existsSync(clonedSitesDir)) {
        return successResponse(res, { sites: [] });
      }

      const sites = fs.readdirSync(clonedSitesDir)
        .filter(dir => {
          const metadataPath = path.join(clonedSitesDir, dir, 'metadata.json');
          return fs.existsSync(metadataPath);
        })
        .map(dir => {
          const metadataPath = path.join(clonedSitesDir, dir, 'metadata.json');
          const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
          return metadata;
        })
        .sort((a, b) => new Date(b.clonedAt) - new Date(a.clonedAt));

      return successResponse(res, { sites });
    } catch (error) {
      next(error);
    }
  }
);

router.get('/sites/:siteId',
  authenticate,
  async (req, res, next) => {
    try {
      const { siteId } = req.params;
      const siteDir = path.join(config.deploy.dir, 'cloned-sites', siteId);
      const metadataPath = path.join(siteDir, 'metadata.json');

      if (!fs.existsSync(metadataPath)) {
        throw ApiError.notFound('Cloned site not found');
      }

      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));

      return successResponse(res, { site: metadata });
    } catch (error) {
      next(error);
    }
  }
);

router.delete('/sites/:siteId',
  authenticate,
  async (req, res, next) => {
    try {
      const { siteId } = req.params;
      const siteDir = path.join(config.deploy.dir, 'cloned-sites', siteId);

      if (!fs.existsSync(siteDir)) {
        throw ApiError.notFound('Cloned site not found');
      }

      fs.rmSync(siteDir, { recursive: true, force: true });

      logger.info({ message: 'Cloned site deleted', siteId, userId: req.user.id });

      return successResponse(res, null, 'Cloned site deleted successfully');
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
