const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const { authenticate } = require('../middleware/auth');
const { successResponse, createdResponse, ApiError } = require('../utils/response');
const logger = require('../config/logger');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(config.upload.dir, 'files');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `${uuidv4()}${ext}`;
    cb(null, filename);
  },
});

const fileUpload = multer({
  storage,
  limits: { fileSize: config.upload.maxFileSize },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      ...config.upload.allowedImageTypes,
      ...config.upload.allowedVideoTypes,
      ...config.upload.allowedDocumentTypes,
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} is not allowed`));
    }
  },
});

router.post('/file',
  authenticate,
  fileUpload.single('file'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        throw ApiError.badRequest('No file uploaded');
      }

      const fileInfo = {
        id: uuidv4(),
        originalName: req.file.originalname,
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype,
        url: `/uploads/files/${req.file.filename}`,
        uploadedAt: new Date().toISOString(),
      };

      logger.info({ message: 'File uploaded', fileId: fileInfo.id, userId: req.user.id, filename: req.file.originalname });

      return createdResponse(res, { file: fileInfo }, 'File uploaded successfully');
    } catch (error) {
      next(error);
    }
  }
);

router.post('/multiple',
  authenticate,
  fileUpload.array('files', 10),
  async (req, res, next) => {
    try {
      if (!req.files || req.files.length === 0) {
        throw ApiError.badRequest('No files uploaded');
      }

      const files = req.files.map(file => ({
        id: uuidv4(),
        originalName: file.originalname,
        filename: file.filename,
        size: file.size,
        mimetype: file.mimetype,
        url: `/uploads/files/${file.filename}`,
        uploadedAt: new Date().toISOString(),
      }));

      logger.info({ message: 'Multiple files uploaded', count: files.length, userId: req.user.id });

      return createdResponse(res, { files }, `${files.length} files uploaded successfully`);
    } catch (error) {
      next(error);
    }
  }
);

router.post('/image',
  authenticate,
  fileUpload.single('image'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        throw ApiError.badRequest('No image uploaded');
      }

      const allowedImageTypes = config.upload.allowedImageTypes;
      if (!allowedImageTypes.includes(req.file.mimetype)) {
        throw ApiError.badRequest('Only image files are allowed');
      }

      const imageInfo = {
        id: uuidv4(),
        originalName: req.file.originalname,
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype,
        url: `/uploads/files/${req.file.filename}`,
        uploadedAt: new Date().toISOString(),
      };

      logger.info({ message: 'Image uploaded', imageId: imageInfo.id, userId: req.user.id });

      return createdResponse(res, { image: imageInfo }, 'Image uploaded successfully');
    } catch (error) {
      next(error);
    }
  }
);

router.delete('/file/:filename',
  authenticate,
  async (req, res, next) => {
    try {
      const { filename } = req.params;
      const filePath = path.join(config.upload.dir, 'files', filename);

      if (!fs.existsSync(filePath)) {
        throw ApiError.notFound('File not found');
      }

      fs.unlinkSync(filePath);

      logger.info({ message: 'File deleted', filename, userId: req.user.id });

      return successResponse(res, null, 'File deleted successfully');
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
