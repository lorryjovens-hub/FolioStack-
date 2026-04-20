import express from 'express';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/helpers.js';
import { ApiResponse } from '../utils/response.js';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

router.get('/profile', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      profile: true
    }
  });
  
  if (!user) {
    return ApiResponse.notFound(res, '用户不存在');
  }
  
  return ApiResponse.success(res, {
    id: user.id,
    email: user.email,
    username: user.username,
    nickname: user.nickname || user.profile?.nickname,
    bio: user.bio || user.profile?.bio,
    avatarUrl: user.avatarUrl,
    phone: user.phone,
    phoneVerified: user.phoneVerified,
    emailVerified: user.emailVerified,
    profile: user.profile
  });
}));

router.put('/profile', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { nickname, bio, website, location, company, position, skills, socialLinks } = req.body;
  
  const existingProfile = await prisma.userProfile.findUnique({
    where: { userId }
  });
  
  let profile;
  if (existingProfile) {
    profile = await prisma.userProfile.update({
      where: { userId },
      data: { nickname, bio, website, location, company, position, skills, socialLinks }
    });
  } else {
    profile = await prisma.userProfile.create({
      data: { userId, nickname, bio, website, location, company, position, skills, socialLinks }
    });
  }
  
  await prisma.user.update({
    where: { id: userId },
    data: { nickname, bio }
  });
  
  await prisma.auditLog.create({
    data: {
      userId,
      action: 'UPDATE_PROFILE',
      module: 'USER_CENTER',
      details: JSON.stringify({ updatedFields: Object.keys(req.body) }),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    }
  });
  
  return ApiResponse.success(res, profile, '个人资料更新成功');
}));

router.put('/avatar', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { avatarUrl } = req.body;
  
  if (!avatarUrl) {
    return ApiResponse.error(res, '头像URL不能为空', 400);
  }
  
  await prisma.user.update({
    where: { id: userId },
    data: { avatarUrl }
  });
  
  return ApiResponse.success(res, { avatarUrl }, '头像更新成功');
}));

router.post('/change-password', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { currentPassword, newPassword } = req.body;
  
  if (!currentPassword || !newPassword) {
    return ApiResponse.error(res, '请填写当前密码和新密码', 400);
  }
  
  if (newPassword.length < 8) {
    return ApiResponse.error(res, '新密码长度至少8位', 400);
  }
  
  const user = await prisma.user.findUnique({ where: { id: userId } });
  
  const bcrypt = await import('bcryptjs');
  const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);
  
  if (!isValidPassword) {
    return ApiResponse.error(res, '当前密码错误', 401);
  }
  
  const hashedNewPassword = await bcrypt.hash(newPassword, 12);
  
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: hashedNewPassword }
  });
  
  await prisma.auditLog.create({
    data: {
      userId,
      action: 'CHANGE_PASSWORD',
      module: 'SECURITY',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    }
  });
  
  return ApiResponse.success(res, null, '密码修改成功');
}));

router.post('/bind-phone', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { phone, code } = req.body;
  
  if (!phone || !code) {
    return ApiResponse.error(res, '请提供手机号和验证码', 400);
  }
  
  const redis = (await import('../config/redis.js')).default;
  const cachedCode = await redis.get(`verify_phone:${phone}`);
  
  if (!cachedCode || cachedCode !== code) {
    return ApiResponse.error(res, '验证码错误或已过期', 400);
  }
  
  await prisma.user.update({
    where: { id: userId },
    data: { phone, phoneVerified: true }
  });
  
  await redis.del(`verify_phone:${phone}`);
  
  await prisma.auditLog.create({
    data: {
      userId,
      action: 'BIND_PHONE',
      module: 'SECURITY',
      details: JSON.stringify({ phone }),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    }
  });
  
  return ApiResponse.success(res, null, '手机号绑定成功');
}));

router.post('/bind-email', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { email, code } = req.body;
  
  if (!email || !code) {
    return ApiResponse.error(res, '请提供邮箱和验证码', 400);
  }
  
  const redis = (await import('../config/redis.js')).default;
  const cachedCode = await redis.get(`verify_email:${email}`);
  
  if (!cachedCode || cachedCode !== code) {
    return ApiResponse.error(res, '验证码错误或已过期', 400);
  }
  
  const existingEmail = await prisma.user.findFirst({
    where: { email, id: { not: userId } }
  });
  
  if (existingEmail) {
    return ApiResponse.error(res, '该邮箱已被其他账号使用', 400);
  }
  
  await prisma.user.update({
    where: { id: userId },
    data: { email, emailVerified: true }
  });
  
  await redis.del(`verify_email:${email}`);
  
  await prisma.auditLog.create({
    data: {
      userId,
      action: 'BIND_EMAIL',
      module: 'SECURITY',
      details: JSON.stringify({ email }),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    }
  });
  
  return ApiResponse.success(res, null, '邮箱绑定成功');
}));

router.get('/oauth-accounts', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  
  const accounts = await prisma.oAuthAccount.findMany({
    where: { userId },
    select: {
      id: true,
      provider: true,
      providerId: true,
      createdAt: true
    }
  });
  
  return ApiResponse.success(res, accounts);
}));

router.post('/oauth-bind/:provider', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { provider } = req.params;
  const { providerId, accessToken, refreshToken, expiresIn } = req.body;
  
  const validProviders = ['github', 'google', 'wechat', 'qq'];
  if (!validProviders.includes(provider)) {
    return ApiResponse.error(res, '不支持的第三方平台', 400);
  }
  
  const existingBinding = await prisma.oAuthAccount.findUnique({
    where: { provider_providerId: { provider, providerId } }
  });
  
  if (existingBinding) {
    return ApiResponse.error(res, '该账号已绑定其他用户', 400);
  }
  
  const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000) : null;
  
  await prisma.oAuthAccount.create({
    data: {
      userId,
      provider,
      providerId,
      accessToken,
      refreshToken,
      expiresAt
    }
  });
  
  await prisma.auditLog.create({
    data: {
      userId,
      action: 'OAUTH_BIND',
      module: 'SECURITY',
      details: JSON.stringify({ provider }),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    }
  });
  
  return ApiResponse.success(res, null, `${provider}账号绑定成功`);
}));

router.delete('/oauth-unbind/:provider', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { provider } = req.params;
  
  const account = await prisma.oAuthAccount.findFirst({
    where: { userId, provider }
  });
  
  if (!account) {
    return ApiResponse.notFound(res, '未找到该平台的绑定记录');
  }
  
  const oauthCount = await prisma.oAuthAccount.count({
    where: { userId }
  });
  
  const user = await prisma.user.findUnique({ where: { id: userId } });
  
  if (oauthCount <= 1 && !user.passwordHash && !user.phoneVerified && !user.emailVerified) {
    return ApiResponse.error(res, '无法解绑最后一个登录方式，请先设置密码或绑定其他账号', 400);
  }
  
  await prisma.oAuthAccount.delete({ where: { id: account.id } });
  
  await prisma.auditLog.create({
    data: {
      userId,
      action: 'OAUTH_UNBIND',
      module: 'SECURITY',
      details: JSON.stringify({ provider }),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    }
  });
  
  return ApiResponse.success(res, null, `${provider}账号解绑成功`);
}));

router.get('/notification-preferences', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  
  let prefs = await prisma.notificationPreference.findUnique({
    where: { userId }
  });
  
  if (!prefs) {
    prefs = await prisma.notificationPreference.create({
      data: { userId }
    });
  }
  
  return ApiResponse.success(res, prefs);
}));

router.put('/notification-preferences', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const allowedFields = [
    'emailNotifications', 'pushNotifications', 'smsNotifications',
    'marketingEmails', 'securityAlerts', 'systemUpdates',
    'projectUpdates', 'commentNotifications', 
    'likeNotifications', 'followNotifications'
  ];
  
  const updateData = {};
  for (const field of allowedFields) {
    if (field in req.body) {
      updateData[field] = req.body[field];
    }
  }
  
  let prefs = await prisma.notificationPreference.findUnique({
    where: { userId }
  });
  
  if (prefs) {
    prefs = await prisma.notificationPreference.update({
      where: { userId },
      data: updateData
    });
  } else {
    prefs = await prisma.notificationPreference.create({
      data: { userId, ...updateData }
    });
  }
  
  return ApiResponse.success(res, prefs, '通知偏好设置已更新');
}));

router.get('/notifications', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const isRead = req.query.isRead;
  
  const where = { userId };
  if (isRead !== undefined) {
    where.isRead = isRead === 'true';
  }
  
  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    }),
    prisma.notification.count({ where })
  ]);
  
  return ApiResponse.success(res, {
    notifications,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  });
}));

router.put('/notifications/:id/read', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  
  const notification = await prisma.notification.findFirst({
    where: { id, userId }
  });
  
  if (!notification) {
    return ApiResponse.notFound(res, '通知不存在');
  }
  
  await prisma.notification.update({
    where: { id },
    data: { isRead: true, readAt: new Date() }
  });
  
  return ApiResponse.success(res, null, '通知已标记为已读');
}));

router.put('/notifications/read-all', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  
  await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true, readAt: new Date() }
  });
  
  return ApiResponse.success(res, null, '所有通知已标记为已读');
}));

router.delete('/notifications/:id', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  
  const notification = await prisma.notification.findFirst({
    where: { id, userId }
  });
  
  if (!notification) {
    return ApiResponse.notFound(res, '通知不存在');
  }
  
  await prisma.notification.delete({ where: { id } });
  
  return ApiResponse.success(res, null, '通知已删除');
}));

router.get('/unread-count', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  
  const count = await prisma.notification.count({
    where: { userId, isRead: false }
  });
  
  return ApiResponse.success(res, { count });
}));

export default router;