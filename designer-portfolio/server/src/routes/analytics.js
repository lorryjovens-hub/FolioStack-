const express = require('express');
const { Op } = require('sequelize');
const config = require('../config');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { validate, paginationValidation } = require('../middleware/validation');
const { successResponse, paginatedResponse, ApiError } = require('../utils/response');
const { AnalyticsEvent, Work, Deployment, User } = require('../models');
const logger = require('../config/logger');

const router = express.Router();

router.get('/events',
  authenticate,
  paginationValidation,
  async (req, res, next) => {
    try {
      const page = req.query.page || 1;
      const limit = req.query.limit || 50;
      const offset = (page - 1) * limit;
      const { eventType, workId, startDate, endDate } = req.query;

      const where = { userId: req.user.id };
      if (eventType) where.eventType = eventType;
      if (workId) where.workId = workId;
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt[Op.gte] = new Date(startDate);
        if (endDate) where.createdAt[Op.lte] = new Date(endDate);
      }

      const { count, rows: events } = await AnalyticsEvent.findAndCountAll({
        where,
        limit,
        offset,
        order: [['createdAt', 'DESC']],
      });

      return paginatedResponse(res, events, page, limit, count, 'Events retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
);

router.get('/stats/overview',
  authenticate,
  async (req, res, next) => {
    try {
      const { startDate, endDate } = req.query;

      const dateFilter = {};
      if (startDate) dateFilter[Op.gte] = new Date(startDate);
      if (endDate) dateFilter[Op.lte] = new Date(endDate);

      const eventFilter = Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {};

      const [
        totalViews,
        totalWorks,
        totalDeployments,
        recentEvents
      ] = await Promise.all([
        AnalyticsEvent.count({
          where: { userId: req.user.id, eventType: 'work_view', ...eventFilter }
        }),
        Work.count({ where: { userId: req.user.id } }),
        Deployment.count({ where: { userId: req.user.id } }),
        AnalyticsEvent.findAll({
          where: { userId: req.user.id, ...eventFilter },
          limit: 10,
          order: [['createdAt', 'DESC']],
        }),
      ]);

      const topWorks = await AnalyticsEvent.findAll({
        where: { userId: req.user.id, eventType: 'work_view', ...eventFilter },
        attributes: [
          'workId',
          [AnalyticsEvent.sequelize.fn('COUNT', AnalyticsEvent.sequelize.col('workId')), 'views']
        ],
        include: [{
          model: Work,
          as: 'work',
          attributes: ['id', 'title', 'thumbnail'],
        }],
        group: ['workId', 'work.id'],
        order: [[AnalyticsEvent.sequelize.literal('views'), 'DESC']],
        limit: 5,
      });

      const eventsByDay = await AnalyticsEvent.findAll({
        where: { userId: req.user.id, ...eventFilter },
        attributes: [
          [AnalyticsEvent.sequelize.fn('DATE', AnalyticsEvent.sequelize.col('createdAt')), 'date'],
          [AnalyticsEvent.sequelize.fn('COUNT', '*'), 'count'],
        ],
        group: [AnalyticsEvent.sequelize.fn('DATE', AnalyticsEvent.sequelize.col('createdAt'))],
        order: [[AnalyticsEvent.sequelize.fn('DATE', AnalyticsEvent.sequelize.col('createdAt')), 'DESC']],
        limit: 30,
      });

      const eventsByType = await AnalyticsEvent.findAll({
        where: { userId: req.user.id, ...eventFilter },
        attributes: [
          'eventType',
          [AnalyticsEvent.sequelize.fn('COUNT', '*'), 'count'],
        ],
        group: ['eventType'],
      });

      return successResponse(res, {
        overview: {
          totalViews,
          totalWorks,
          totalDeployments,
        },
        topWorks,
        eventsByDay,
        eventsByType,
        recentEvents,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get('/stats/works/:workId',
  authenticate,
  async (req, res, next) => {
    try {
      const work = await Work.findByPk(req.params.workId);

      if (!work) {
        throw ApiError.notFound('Work not found');
      }

      if (work.userId !== req.user.id && req.user.role !== 'admin') {
        throw ApiError.forbidden('You do not have permission to view these analytics');
      }

      const { startDate, endDate } = req.query;

      const dateFilter = {};
      if (startDate) dateFilter[Op.gte] = new Date(startDate);
      if (endDate) dateFilter[Op.lte] = new Date(endDate);

      const eventFilter = Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {};

      const [
        views,
        likes,
        shares,
        downloads,
        viewsByDay,
        referrers,
        devices,
      ] = await Promise.all([
        AnalyticsEvent.count({
          where: { workId: req.params.workId, eventType: 'work_view', ...eventFilter }
        }),
        AnalyticsEvent.count({
          where: { workId: req.params.workId, eventType: 'work_like', ...eventFilter }
        }),
        AnalyticsEvent.count({
          where: { workId: req.params.workId, eventType: 'work_share', ...eventFilter }
        }),
        AnalyticsEvent.count({
          where: { workId: req.params.workId, eventType: 'work_download', ...eventFilter }
        }),
        AnalyticsEvent.findAll({
          where: { workId: req.params.workId, eventType: 'work_view', ...eventFilter },
          attributes: [
            [AnalyticsEvent.sequelize.fn('DATE', AnalyticsEvent.sequelize.col('createdAt')), 'date'],
            [AnalyticsEvent.sequelize.fn('COUNT', '*'), 'count'],
          ],
          group: [AnalyticsEvent.sequelize.fn('DATE', AnalyticsEvent.sequelize.col('createdAt'))],
          order: [[AnalyticsEvent.sequelize.fn('DATE', AnalyticsEvent.sequelize.col('createdAt')), 'DESC']],
          limit: 30,
        }),
        AnalyticsEvent.findAll({
          where: { workId: req.params.workId, eventType: 'work_view', ...eventFilter },
          attributes: ['referrer'],
          group: ['referrer'],
          limit: 10,
        }),
        AnalyticsEvent.findAll({
          where: { workId: req.params.workId, eventType: 'work_view', ...eventFilter },
          attributes: ['device', [AnalyticsEvent.sequelize.fn('COUNT', '*'), 'count']],
          group: ['device'],
        }),
      ]);

      return successResponse(res, {
        work: {
          id: work.id,
          title: work.title,
          thumbnail: work.thumbnail,
        },
        stats: {
          views,
          likes,
          shares,
          downloads,
        },
        viewsByDay,
        referrers,
        devices,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post('/track',
  optionalAuth,
  async (req, res, next) => {
    try {
      if (!config.analytics.enabled) {
        return successResponse(res, null, 'Analytics disabled');
      }

      const { eventType, workId, deploymentId, metadata } = req.body;

      if (!eventType) {
        throw ApiError.badRequest('Event type is required');
      }

      const event = await AnalyticsEvent.create({
        userId: req.user?.id,
        workId: workId || null,
        deploymentId: deploymentId || null,
        eventType,
        metadata: metadata || {},
        ip: req.ip,
        userAgent: req.get('user-agent'),
        referrer: req.get('referer'),
      });

      return successResponse(res, { eventId: event.id }, 'Event tracked');
    } catch (error) {
      next(error);
    }
  }
);

router.get('/stats/realtime',
  authenticate,
  async (req, res, next) => {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

      const recentViews = await AnalyticsEvent.count({
        where: {
          userId: req.user.id,
          eventType: 'work_view',
          createdAt: { [Op.gte]: oneHourAgo },
        },
      });

      const activeVisitors = await AnalyticsEvent.findAll({
        where: {
          userId: req.user.id,
          createdAt: { [Op.gte]: oneHourAgo },
        },
        attributes: ['ip', 'userAgent'],
        group: ['ip', 'userAgent'],
      });

      return successResponse(res, {
        recentViews,
        activeVisitors: activeVisitors.length,
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
