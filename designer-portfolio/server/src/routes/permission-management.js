import express from 'express';
import { authenticateToken, requirePermission } from '../middleware/auth.js';
import { asyncHandler } from '../utils/helpers.js';
import { ApiResponse } from '../utils/response.js';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticateToken);
router.use(requirePermission('permission', 'manage'));

router.get('/roles', asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search } = req.query;
  
  const where = {};
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { displayName: { contains: search } }
    ];
  }
  
  const [roles, total] = await Promise.all([
    prisma.role.findMany({
      where,
      include: {
        _count: { select: { users: true, permissions: true } }
      },
      orderBy: { createdAt: 'desc' },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit)
    }),
    prisma.role.count({ where })
  ]);
  
  return ApiResponse.success(res, {
    roles,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / parseInt(limit))
    }
  });
}));

router.get('/roles/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const role = await prisma.role.findUnique({
    where: { id },
    include: {
      permissions: {
        include: { permission: true }
      },
      users: {
        include: { user: { select: { id: true, username: true, email: true } } },
        take: 10
      }
    }
  });
  
  if (!role) {
    return ApiResponse.notFound(res, '角色不存在');
  }
  
  return ApiResponse.success(res, role);
}));

router.post('/roles', requirePermission('role', 'create'), asyncHandler(async (req, res) => {
  const { name, displayName, description, permissions: permissionIds } = req.body;
  
  if (!name || !displayName) {
    return ApiResponse.error(res, '角色名称和显示名称不能为空', 400);
  }
  
  const existingRole = await prisma.role.findUnique({ where: { name } });
  if (existingRole) {
    return ApiResponse.error(res, '角色名称已存在', 400);
  }
  
  const role = await prisma.role.create({
    data: {
      name,
      displayName,
      description
    }
  });
  
  if (permissionIds && permissionIds.length > 0) {
    await prisma.rolePermission.createMany({
      data: permissionIds.map(permissionId => ({
        roleId: role.id,
        permissionId
      }))
    });
  }
  
  await prisma.auditLog.create({
    data: {
      userId: req.user.id,
      action: 'CREATE_ROLE',
      module: 'PERMISSION_MANAGEMENT',
      resourceType: 'ROLE',
      resourceId: role.id,
      details: JSON.stringify({ name, displayName }),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    }
  });
  
  return ApiResponse.success(res, role, '角色创建成功');
}));

router.put('/roles/:id', requirePermission('role', 'update'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { displayName, description, permissions: permissionIds } = req.body;
  
  const role = await prisma.role.findUnique({ where: { id } });
  if (!role) {
    return ApiResponse.notFound(res, '角色不存在');
  }
  
  if (role.isSystem) {
    return ApiResponse.error(res, '系统内置角色不允许修改', 403);
  }
  
  const updateData = {};
  if (displayName !== undefined) updateData.displayName = displayName;
  if (description !== undefined) updateData.description = description;
  
  const updatedRole = await prisma.role.update({
    where: { id },
    data: updateData
  });
  
  if (permissionIds !== undefined) {
    await prisma.rolePermission.deleteMany({ where: { roleId: id } });
    
    if (permissionIds.length > 0) {
      await prisma.rolePermission.createMany({
        data: permissionIds.map(permissionId => ({
          roleId: id,
          permissionId
        }))
      });
    }
  }
  
  await prisma.auditLog.create({
    data: {
      userId: req.user.id,
      action: 'UPDATE_ROLE',
      module: 'PERMISSION_MANAGEMENT',
      resourceType: 'ROLE',
      resourceId: id,
      details: JSON.stringify(updateData),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    }
  });
  
  return ApiResponse.success(res, updatedRole, '角色更新成功');
}));

router.delete('/roles/:id', requirePermission('role', 'delete'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const role = await prisma.role.findUnique({
    where: { id },
    include: { _count: { select: { users: true } } }
  });
  
  if (!role) {
    return ApiResponse.notFound(res, '角色不存在');
  }
  
  if (role.isSystem) {
    return ApiResponse.error(res, '系统内置角色不允许删除', 403);
  }
  
  if (role._count.users > 0) {
    return ApiResponse.error(res, `该角色下还有 ${role._count.users} 个用户，无法删除`, 400);
  }
  
  await prisma.role.delete({ where: { id } });
  
  await prisma.auditLog.create({
    data: {
      userId: req.user.id,
      action: 'DELETE_ROLE',
      module: 'PERMISSION_MANAGEMENT',
      resourceType: 'ROLE',
      resourceId: id,
      details: JSON.stringify({ roleName: role.name }),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    }
  });
  
  return ApiResponse.success(res, null, '角色删除成功');
}));

router.get('/permissions', asyncHandler(async (req, res) => {
  const { module } = req.query;
  
  const where = {};
  if (module) {
    where.module = module.toUpperCase();
  }
  
  const permissions = await prisma.permission.findMany({
    where,
    orderBy: ['module', 'action']
  });
  
  const groupedByModule = permissions.reduce((acc, perm) => {
    if (!acc[perm.module]) {
      acc[perm.module] = [];
    }
    acc[perm.module].push(perm);
    return acc;
  }, {});
  
  return ApiResponse.success(res, {
    permissions,
    groupedByModule
  });
}));

router.post('/permissions/init', requirePermission('permission', 'manage'), asyncHandler(async (req, res) => {
  const defaultPermissions = [
    { name: 'user:create', displayName: '创建用户', module: 'USER', action: 'CREATE' },
    { name: 'user:read', displayName: '查看用户', module: 'USER', action: 'READ' },
    { name: 'user:update', displayName: '更新用户', module: 'USER', action: 'UPDATE' },
    { name: 'user:delete', displayName: '删除用户', module: 'USER', action: 'DELETE' },
    { name: 'role:create', displayName: '创建角色', module: 'ROLE', action: 'CREATE' },
    { name: 'role:read', displayName: '查看角色', module: 'ROLE', action: 'READ' },
    { name: 'role:update', displayName: '更新角色', module: 'ROLE', action: 'UPDATE' },
    { name: 'role:delete', displayName: '删除角色', module: 'ROLE', action: 'DELETE' },
    { name: 'permission:manage', displayName: '管理权限', module: 'PERMISSION', action: 'MANAGE' },
    { name: 'work:create', displayName: '创建作品', module: 'WORK', action: 'CREATE' },
    { name: 'work:read', displayName: '查看作品', module: 'WORK', action: 'READ' },
    { name: 'work:update', displayName: '更新作品', module: 'WORK', action: 'UPDATE' },
    { name: 'work:delete', displayName: '删除作品', module: 'WORK', action: 'DELETE' },
    { name: 'audit:read', displayName: '查看审计日志', module: 'AUDIT', action: 'READ' },
    { name: 'system:config', displayName: '系统配置', module: 'SYSTEM', action: 'CONFIG' },
    { name: 'analytics:view', displayName: '查看分析数据', module: 'ANALYTICS', action: 'VIEW' }
  ];
  
  let createdCount = 0;
  
  for (const perm of defaultPermissions) {
    const existing = await prisma.permission.findUnique({
      where: { name: perm.name }
    });
    
    if (!existing) {
      await prisma.permission.create({ data: perm });
      createdCount++;
    }
  }
  
  return ApiResponse.success(res, { createdCount }, `成功初始化 ${createdCount} 个权限`);
}));

router.get('/users/:userId/roles', asyncHandler(async (req, res) => {
  const { userId } = req.params;
  
  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    include: { role: true },
    orderBy: { assignedAt: 'desc' }
  });
  
  return ApiResponse.success(res, userRoles.map(ur => ur.role));
}));

router.put('/users/:userId/roles', requirePermission('role', 'assign'), asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { roleIds } = req.body;
  
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return ApiResponse.notFound(res, '用户不存在');
  }
  
  await prisma.userRole.deleteMany({ where: { userId } });
  
  if (roleIds && roleIds.length > 0) {
    for (const roleId of roleIds) {
      const role = await prisma.role.findUnique({ where: { id: roleId } });
      if (!role) {
        return ApiResponse.error(res, `角色 ${roleId} 不存在`, 400);
      }
      
      await prisma.userRole.create({
        data: {
          userId,
          roleId,
          assignedBy: req.user.id
        }
      });
    }
  }
  
  await prisma.auditLog.create({
    data: {
      userId: req.user.id,
      action: 'ASSIGN_ROLES',
      module: 'PERMISSION_MANAGEMENT',
      resourceType: 'USER',
      resourceId: userId,
      details: JSON.stringify({ assignedRoles: roleIds }),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    }
  });
  
  return ApiResponse.success(res, null, '角色分配成功');
}));

router.get('/admins', asyncHandler(async (req, res) => {
  const admins = await prisma.userRole.findMany({
    where: {
      role: { name: { in: ['admin', 'super_admin'] } }
    },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          email: true,
          nickname: true,
          avatarUrl: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true
        }
      },
      role: true
    },
    orderBy: { assignedAt: 'desc' }
  });
  
  const uniqueAdmins = [];
  const seenUserIds = new Set();
  
  for (const admin of admins) {
    if (!seenUserIds.has(admin.userId)) {
      seenUserIds.add(admin.userId);
      uniqueAdmins.push({
        ...admin.user,
        roles: admins.filter(a => a.userId === admin.userId).map(a => a.role)
      });
    }
  }
  
  return ApiResponse.success(res, uniqueAdmins));
}));

router.get('/audit-logs', asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const { userId, action, module, startDate, endDate, status } = req.query;
  
  const where = {};
  if (userId) where.userId = userId;
  if (action) where.action = action;
  if (module) where.module = module;
  if (status) where.status = status;
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate);
  }
  
  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: { id: true, username: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    }),
    prisma.auditLog.count({ where })
  ]);
  
  return ApiResponse.success(res, {
    logs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  });
}));

router.get('/audit-logs/stats', asyncHandler(async (req, res) => {
  const last30Days = new Date();
  last30Days.setDate(last30Days.getDate() - 30);
  
  const [
    totalLogs,
    successLogs,
    failedLogs,
    actionStats,
    moduleStats,
    dailyStats
  ] = await Promise.all([
    prisma.auditLog.count(),
    prisma.auditLog.count({ where: { status: 'success' } }),
    prisma.auditLog.count({ where: { status: 'error' } }),
    prisma.auditLog.groupBy({
      by: ['action'],
      _count: true,
      where: { createdAt: { gte: last30Days } },
      orderBy: { _count: { action: 'desc' } },
      take: 10
    }),
    prisma.auditLog.groupBy({
      by: ['module'],
      _count: true,
      where: { createdAt: { gte: last30Days } }
    }),
    prisma.$queryRaw`
      SELECT DATE(created_at) as date, COUNT(*) as count 
      FROM audit_logs 
      WHERE created_at >= ${last30Days}
      GROUP BY DATE(created_at)
      ORDER BY date DESC
      LIMIT 30
    `
  ]);
  
  return ApiResponse.success(res, {
    overview: {
      total: totalLogs,
      success: successLogs,
      failed: failedLogs,
      successRate: totalLogs > 0 ? ((successLogs / totalLogs) * 100).toFixed(2) : 0
    },
    topActions: actionStats,
    byModule: moduleStats,
    dailyTrend: dailyStats
  });
}));

export default router;