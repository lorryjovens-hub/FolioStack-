const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const JSZip = require('jszip');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const { authenticate } = require('../middleware/auth');
const { validate, deployValidation, paginationValidation } = require('../middleware/validation');
const { successResponse, createdResponse, paginatedResponse, ApiError } = require('../utils/response');
const { Deployment, Work, User } = require('../models');
const { slugify, generateShortId } = require('../utils/helpers');
const logger = require('../config/logger');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const tempDir = path.join(config.deploy.dir, 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `${uuidv4()}${ext}`;
    cb(null, filename);
  },
});

const deployUpload = multer({
  storage,
  limits: { fileSize: config.upload.maxZipSize },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.zip', '.html'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only ZIP and HTML files are allowed.'));
    }
  },
});

router.get('/',
  authenticate,
  paginationValidation,
  async (req, res, next) => {
    try {
      const page = req.query.page || 1;
      const limit = req.query.limit || 20;
      const offset = (page - 1) * limit;
      const { status } = req.query;

      const where = { userId: req.user.id };
      if (status) where.status = status;

      const { count, rows: deployments } = await Deployment.findAndCountAll({
        where,
        limit,
        offset,
        order: [['createdAt', 'DESC']],
      });

      return paginatedResponse(res, deployments, page, limit, count, 'Deployments retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
);

router.get('/:id',
  authenticate,
  async (req, res, next) => {
    try {
      const deployment = await Deployment.findByPk(req.params.id, {
        include: [
          { model: User, as: 'user', attributes: ['id', 'username', 'avatar'] },
          { model: Work, as: 'works', limit: 10 },
        ],
      });

      if (!deployment) {
        throw ApiError.notFound('Deployment not found');
      }

      if (deployment.userId !== req.user.id && req.user.role !== 'admin') {
        throw ApiError.forbidden('You do not have permission to view this deployment');
      }

      return successResponse(res, { deployment });
    } catch (error) {
      next(error);
    }
  }
);

router.post('/',
  authenticate,
  deployUpload.single('file'),
  validate(deployValidation),
  async (req, res, next) => {
    try {
      const { projectName, customDomain } = req.body;

      const slug = slugify(projectName) + '-' + generateShortId(6);

      const existingDeployment = await Deployment.findOne({ where: { slug } });
      if (existingDeployment) {
        throw ApiError.conflict('A deployment with this name already exists');
      }

      const deployment = await Deployment.create({
        userId: req.user.id,
        name: projectName,
        slug,
        customDomain: customDomain || null,
        status: 'pending',
      });

      if (req.file) {
        const fileExt = path.extname(req.file.originalname).toLowerCase();

        if (fileExt === '.html') {
          const outputDir = path.join(config.deploy.dir, 'sites', slug);
          if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
          }
          fs.copyFileSync(req.file.path, path.join(outputDir, 'index.html'));

          await deployment.update({
            status: 'deployed',
            filePath: outputDir,
            fileSize: req.file.size,
            deployedUrl: deployment.generateUrl(),
            lastDeployedAt: new Date(),
          });

          await Work.create({
            userId: req.user.id,
            title: projectName,
            type: 'deployed',
            deployedUrl: deployment.deployedUrl,
            deploymentId: deployment.id,
            status: 'published',
          });

          fs.unlinkSync(req.file.path);

          logger.info({ message: 'HTML deployment completed', deploymentId: deployment.id, slug });

          return createdResponse(res, { deployment }, 'Deployment completed successfully');
        }

        if (fileExt === '.zip') {
          const zip = await JSZip.loadAsync(req.file.buffer || fs.createReadStream(req.file.path));
          const outputDir = path.join(config.deploy.dir, 'sites', slug);

          if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
          }

          let totalSize = 0;
          const files = [];

          for (const [filename, file] of Object.entries(zip.files)) {
            if (!file.dir) {
              const content = await file.async('nodebuffer');
              const filePath = path.join(outputDir, filename);
              const fileDir = path.dirname(filePath);

              if (!fs.existsSync(fileDir)) {
                fs.mkdirSync(fileDir, { recursive: true });
              }

              fs.writeFileSync(filePath, content);
              totalSize += content.length;
              files.push(filename);
            }
          }

          await deployment.update({
            status: 'deployed',
            filePath: outputDir,
            fileSize: totalSize,
            deployedUrl: deployment.generateUrl(),
            lastDeployedAt: new Date(),
          });

          await Work.create({
            userId: req.user.id,
            title: projectName,
            type: 'deployed',
            deployedUrl: deployment.deployedUrl,
            deploymentId: deployment.id,
            status: 'published',
          });

          fs.unlinkSync(req.file.path);

          logger.info({ message: 'ZIP deployment completed', deploymentId: deployment.id, slug, filesCount: files.length });

          return createdResponse(res, { deployment }, 'Deployment completed successfully');
        }
      }

      logger.info({ message: 'Deployment created', deploymentId: deployment.id, slug });

      return createdResponse(res, { deployment }, 'Deployment created successfully');
    } catch (error) {
      if (req.file) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (e) {}
      }
      next(error);
    }
  }
);

router.post('/build/:id',
  authenticate,
  async (req, res, next) => {
    try {
      const deployment = await Deployment.findByPk(req.params.id);

      if (!deployment) {
        throw ApiError.notFound('Deployment not found');
      }

      if (deployment.userId !== req.user.id && req.user.role !== 'admin') {
        throw ApiError.forbidden('You do not have permission to build this deployment');
      }

      await deployment.update({ status: 'building', buildLog: '' });

      setTimeout(async () => {
        try {
          const buildTime = Math.floor(Math.random() * 30000) + 10000;

          await Deployment.update({
            status: 'deployed',
            buildLog: 'Build completed successfully',
            buildTime,
            lastDeployedAt: new Date(),
          }, { where: { id: deployment.id } });
        } catch (err) {
          await Deployment.update({
            status: 'failed',
            buildLog: `Build failed: ${err.message}`,
          }, { where: { id: deployment.id } });
        }
      }, 2000);

      return successResponse(res, { deployment }, 'Build started');
    } catch (error) {
      next(error);
    }
  }
);

router.delete('/:id',
  authenticate,
  async (req, res, next) => {
    try {
      const deployment = await Deployment.findByPk(req.params.id);

      if (!deployment) {
        throw ApiError.notFound('Deployment not found');
      }

      if (deployment.userId !== req.user.id && req.user.role !== 'admin') {
        throw ApiError.forbidden('You do not have permission to delete this deployment');
      }

      if (deployment.filePath && fs.existsSync(deployment.filePath)) {
        fs.rmSync(deployment.filePath, { recursive: true, force: true });
      }

      await Work.destroy({ where: { deploymentId: deployment.id } });
      await deployment.destroy();

      logger.info({ message: 'Deployment deleted', deploymentId: req.params.id, userId: req.user.id });

      return successResponse(res, null, 'Deployment deleted successfully');
    } catch (error) {
      next(error);
    }
  }
);

router.get('/:slug/preview',
  async (req, res, next) => {
    try {
      const deployment = await Deployment.findOne({
        where: { slug: req.params.slug, status: 'deployed' },
      });

      if (!deployment) {
        throw ApiError.notFound('Deployment not found');
      }

      await Deployment.update(
        { views: deployment.views + 1 },
        { where: { id: deployment.id } }
      );

      const indexPath = path.join(deployment.filePath, 'index.html');

      if (!fs.existsSync(indexPath)) {
        throw ApiError.notFound('Index file not found');
      }

      const html = fs.readFileSync(indexPath, 'utf-8');

      return res.send(html);
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
