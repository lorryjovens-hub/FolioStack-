const express = require('express');
const config = require('../config');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { validate, workValidation, importUrlValidation, importGithubValidation, paginationValidation, idValidation } = require('../middleware/validation');
const { successResponse, createdResponse, paginatedResponse, ApiError } = require('../utils/response');
const { Work, User, Deployment, AnalyticsEvent } = require('../models');
const { extractDomain, slugify } = require('../utils/helpers');
const logger = require('../config/logger');
const cheerio = require('cheerio');
const axios = require('axios');

const router = express.Router();

router.get('/',
  optionalAuth,
  paginationValidation,
  async (req, res, next) => {
    try {
      const page = req.query.page || 1;
      const limit = req.query.limit || 20;
      const offset = (page - 1) * limit;
      const { status, category, tag, featured, userId } = req.query;

      const where = {};
      if (status) where.status = status;
      if (category) where.category = category;
      if (tag) where.tags = { [Work.sequelize.Sequelize.Op.contains]: [tag] };
      if (featured !== undefined) where.featured = featured === 'true';
      if (userId) where.userId = userId;

      const { count, rows: works } = await Work.findAndCountAll({
        where,
        include: [
          { model: User, as: 'user', attributes: ['id', 'username', 'avatar'] },
        ],
        limit,
        offset,
        order: [['createdAt', 'DESC']],
      });

      return paginatedResponse(res, works, page, limit, count, 'Works retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
);

router.get('/:id',
  optionalAuth,
  idValidation,
  async (req, res, next) => {
    try {
      const work = await Work.findByPk(req.params.id, {
        include: [
          { model: User, as: 'user', attributes: ['id', 'username', 'avatar', 'bio'] },
          { model: Deployment, as: 'deployment', attributes: ['id', 'name', 'deployedUrl', 'status'] },
        ],
      });

      if (!work) {
        throw ApiError.notFound('Work not found');
      }

      if (work.status !== 'published' && (!req.user || req.user.id !== work.userId)) {
        throw ApiError.notFound('Work not found');
      }

      if (req.user) {
        AnalyticsEvent.create({
          userId: req.user.id,
          workId: work.id,
          eventType: 'work_view',
          ip: req.ip,
          userAgent: req.get('user-agent'),
          referrer: req.get('referer'),
        });

        await Work.update(
          { viewCount: work.viewCount + 1 },
          { where: { id: work.id } }
        );
      }

      return successResponse(res, { work });
    } catch (error) {
      next(error);
    }
  }
);

router.post('/',
  authenticate,
  validate(workValidation),
  async (req, res, next) => {
    try {
      const { title, description, url, tags, category, status, metadata } = req.body;

      const work = await Work.create({
        userId: req.user.id,
        title,
        description,
        url,
        tags: tags || [],
        category,
        status: status || 'published',
        type: url ? 'link' : 'file',
        metadata: metadata || {},
      });

      logger.info({ message: 'Work created', workId: work.id, userId: req.user.id });

      return createdResponse(res, { work }, 'Work created successfully');
    } catch (error) {
      next(error);
    }
  }
);

router.patch('/:id',
  authenticate,
  idValidation,
  validate(workValidation),
  async (req, res, next) => {
    try {
      const work = await Work.findByPk(req.params.id);

      if (!work) {
        throw ApiError.notFound('Work not found');
      }

      if (work.userId !== req.user.id && req.user.role !== 'admin') {
        throw ApiError.forbidden('You do not have permission to edit this work');
      }

      const { title, description, url, tags, category, status, metadata, thumbnail } = req.body;

      if (title !== undefined) work.title = title;
      if (description !== undefined) work.description = description;
      if (url !== undefined) work.url = url;
      if (tags !== undefined) work.tags = tags;
      if (category !== undefined) work.category = category;
      if (status !== undefined) work.status = status;
      if (metadata !== undefined) work.metadata = { ...work.metadata, ...metadata };
      if (thumbnail !== undefined) work.thumbnail = thumbnail;

      await work.save();

      logger.info({ message: 'Work updated', workId: work.id, userId: req.user.id });

      return successResponse(res, { work }, 'Work updated successfully');
    } catch (error) {
      next(error);
    }
  }
);

router.delete('/:id',
  authenticate,
  idValidation,
  async (req, res, next) => {
    try {
      const work = await Work.findByPk(req.params.id);

      if (!work) {
        throw ApiError.notFound('Work not found');
      }

      if (work.userId !== req.user.id && req.user.role !== 'admin') {
        throw ApiError.forbidden('You do not have permission to delete this work');
      }

      await work.destroy();

      logger.info({ message: 'Work deleted', workId: work.id, userId: req.user.id });

      return successResponse(res, null, 'Work deleted successfully');
    } catch (error) {
      next(error);
    }
  }
);

router.post('/import-url',
  authenticate,
  validate(importUrlValidation),
  async (req, res, next) => {
    try {
      const { url } = req.body;

      const existingWork = await Work.findOne({
        where: { userId: req.user.id, url },
      });

      if (existingWork) {
        throw ApiError.conflict('This URL has already been imported', { existingWorkId: existingWork.id });
      }

      let metadata = {};
      let title = '';
      let thumbnail = '';

      try {
        const proxySettings = req.headers['x-use-proxy'];
        let proxyConfig = {};
        if (proxySettings === 'true' && req.headers['x-proxy-server']) {
          proxyConfig = {
            proxy: {
              host: req.headers['x-proxy-server'].split(':')[0],
              port: parseInt(req.headers['x-proxy-server'].split(':')[1]),
            },
          };
        }

        const response = await axios.get(url, {
          timeout: 10000,
          ...proxyConfig,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        });

        const $ = cheerio.load(response.data);
        title = $('title').text().trim() || new URL(url).hostname;
        const ogImage = $('meta[property="og:image"]').attr('content');
        thumbnail = ogImage || '';
        const description = $('meta[name="description"]').attr('content') || '';

        metadata = {
          domain: extractDomain(url),
          title,
          description,
          thumbnail,
          importedAt: new Date().toISOString(),
          source: 'url',
        };
      } catch (fetchError) {
        logger.warn({ message: 'Failed to fetch URL metadata', url, error: fetchError.message });
        title = new URL(url).hostname;
        metadata = {
          domain: extractDomain(url),
          importedAt: new Date().toISOString(),
          source: 'url',
          fetchError: fetchError.message,
        };
      }

      const work = await Work.create({
        userId: req.user.id,
        title,
        url,
        type: 'link',
        thumbnail,
        tags: [],
        status: 'published',
        metadata,
      });

      logger.info({ message: 'Work imported from URL', workId: work.id, userId: req.user.id, url });

      return createdResponse(res, { work }, 'Work imported successfully');
    } catch (error) {
      if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        return next(ApiError.badRequest('Unable to reach the provided URL'));
      }
      next(error);
    }
  }
);

router.post('/import-github',
  authenticate,
  validate(importGithubValidation),
  async (req, res, next) => {
    try {
      const { url } = req.body;

      const githubRegex = /github\.com\/([\w-]+)\/([\w-.]+)/i;
      const match = url.match(githubRegex);

      if (!match) {
        throw ApiError.badRequest('Invalid GitHub repository URL');
      }

      const [, owner, repo] = match;
      const cleanRepo = repo.replace(/\.git$/, '');

      const existingWork = await Work.findOne({
        where: { userId: req.user.id, githubUrl: url },
      });

      if (existingWork) {
        throw ApiError.conflict('This GitHub repository has already been imported', { existingWorkId: existingWork.id });
      }

      let metadata = {};

      try {
        const apiUrl = `https://api.github.com/repos/${owner}/${cleanRepo}`;
        const response = await axios.get(apiUrl, {
          timeout: 10000,
          headers: {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'FolioStack',
          },
        });

        const repoData = response.data;

        metadata = {
          owner: owner,
          repo: cleanRepo,
          description: repoData.description,
          stars: repoData.stargazers_count,
          forks: repoData.forks_count,
          language: repoData.language,
          topics: repoData.topics || [],
          homepage: repoData.homepage,
          license: repoData.license?.name,
          updatedAt: repoData.updated_at,
          importedAt: new Date().toISOString(),
          source: 'github',
        };

        const deployedUrl = `https://${owner}-${cleanRepo}.vercel.app` ||
                           `https://${owner}-${cleanRepo}.netlify.app` ||
                           repoData.homepage;

        const work = await Work.create({
          userId: req.user.id,
          title: repoData.name,
          description: repoData.description,
          url: deployedUrl || url,
          githubUrl: url,
          githubRepo: `${owner}/${cleanRepo}`,
          type: 'github',
          thumbnail: repoData.owner.avatar_url,
          tags: repoData.topics || [],
          status: 'published',
          metadata,
        });

        logger.info({ message: 'Work imported from GitHub', workId: work.id, userId: req.user.id, repo: `${owner}/${cleanRepo}` });

        return createdResponse(res, { work }, 'GitHub repository imported successfully');
      } catch (apiError) {
        if (apiError.response?.status === 404) {
          throw ApiError.notFound('GitHub repository not found');
        }
        if (apiError.response?.status === 403) {
          throw ApiError.badRequest('GitHub API rate limit exceeded. Please try again later.');
        }
        throw apiError;
      }
    } catch (error) {
      next(error);
    }
  }
);

router.post('/import-zip',
  authenticate,
  async (req, res, next) => {
    try {
      const { filePath, count } = req.body;

      const work = await Work.create({
        userId: req.user.id,
        title: 'Imported from ZIP',
        description: `Imported ${count || 1} items from ZIP archive`,
        type: 'file',
        filePath,
        status: 'published',
      });

      logger.info({ message: 'Works imported from ZIP', workId: work.id, userId: req.user.id, count });

      return createdResponse(res, { work }, 'ZIP archive imported successfully');
    } catch (error) {
      next(error);
    }
  }
);

router.post('/:id/like',
  authenticate,
  idValidation,
  async (req, res, next) => {
    try {
      const work = await Work.findByPk(req.params.id);

      if (!work) {
        throw ApiError.notFound('Work not found');
      }

      await Work.update(
        { likeCount: work.likeCount + 1 },
        { where: { id: work.id } }
      );

      await AnalyticsEvent.create({
        userId: req.user.id,
        workId: work.id,
        eventType: 'work_like',
        ip: req.ip,
        userAgent: req.get('user-agent'),
      });

      return successResponse(res, { likeCount: work.likeCount + 1 }, 'Work liked successfully');
    } catch (error) {
      next(error);
    }
  }
);

router.post('/:id/share',
  authenticate,
  idValidation,
  async (req, res, next) => {
    try {
      const work = await Work.findByPk(req.params.id);

      if (!work) {
        throw ApiError.notFound('Work not found');
      }

      await AnalyticsEvent.create({
        userId: req.user.id,
        workId: work.id,
        eventType: 'work_share',
        metadata: req.body,
        ip: req.ip,
        userAgent: req.get('user-agent'),
      });

      return successResponse(res, null, 'Share tracked successfully');
    } catch (error) {
      next(error);
    }
  }
);

router.get('/user/:userId',
  paginationValidation,
  async (req, res, next) => {
    try {
      const page = req.query.page || 1;
      const limit = req.query.limit || 20;
      const offset = (page - 1) * limit;

      const user = await User.findByPk(req.params.userId, {
        attributes: ['id', 'username', 'avatar', 'bio'],
      });

      if (!user) {
        throw ApiError.notFound('User not found');
      }

      const { count, rows: works } = await Work.findAndCountAll({
        where: { userId: req.params.userId, status: 'published' },
        include: [
          { model: User, as: 'user', attributes: ['id', 'username', 'avatar'] },
        ],
        limit,
        offset,
        order: [['createdAt', 'DESC']],
      });

      return paginatedResponse(res, { user, works }, page, limit, count, 'User works retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
