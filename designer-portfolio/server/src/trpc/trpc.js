const { initTRPC, TRPCError } = require('@trpc/server');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

const config = require('../config');

const t = initTRPC.context().create();

const middleware = t.middleware;
const router = t.router;
const publicProcedure = t.procedure;

const isAuthenticated = middleware(async (opts) => {
  const { ctx } = opts;

  if (!ctx || !ctx.token) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: '未提供认证令牌',
    });
  }

  try {
    const decoded = jwt.verify(ctx.token, config.jwt.secret);

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        username: true,
        avatarUrl: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: '用户不存在',
      });
    }

    if (!user.isActive) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: '账户已被禁用',
      });
    }

    return opts.next({
      ctx: {
        ...ctx,
        user,
      },
    });
  } catch (error) {
    if (error instanceof TRPCError) {
      throw error;
    }
    if (error.name === 'TokenExpiredError') {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: '令牌已过期，请重新登录',
      });
    }
    if (error.name === 'JsonWebTokenError') {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: '无效的认证令牌',
      });
    }
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: '认证验证失败',
    });
  }
});

const protectedProcedure = t.procedure.use(isAuthenticated);

module.exports = {
  router,
  publicProcedure,
  protectedProcedure,
  t,
};
