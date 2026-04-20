const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { TRPCError } = require('@trpc/server');

const { router, publicProcedure, protectedProcedure } = require('../trpc');
const prisma = require('../../lib/prisma');
const config = require('../../config');
const logger = require('../../config/logger');
const {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  getMeSchema,
} = require('../schemas/auth.schema');

const ACCESS_TOKEN_EXPIRES = '15m';
const REFRESH_TOKEN_EXPIRES_DAYS = 7;

function generateAccessToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role || 'user',
    },
    config.jwt.secret,
    { expiresIn: ACCESS_TOKEN_EXPIRES }
  );
}

function generateRefreshToken() {
  return crypto.randomBytes(64).toString('hex');
}

function formatUserResponse(user) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    avatarUrl: user.avatarUrl || null,
    role: user.role || 'user',
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

const authRouter = router({
  register: publicProcedure
    .input(registerSchema)
    .mutation(async ({ input }) => {
      const { email, password, username } = input;

      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [{ email }, { username }],
        },
      });

      if (existingUser) {
        if (existingUser.email === email) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: '该邮箱已被注册',
          });
        }
        throw new TRPCError({
          code: 'CONFLICT',
          message: '该用户名已被使用',
        });
      }

      const passwordHash = await bcrypt.hash(password, config.security.bcryptRounds);

      const user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          username,
        },
      });

      const token = generateAccessToken(user);
      const refreshTokenValue = generateRefreshToken();
      const expiresAt = new Date(
        Date.now() + REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000
      );

      await prisma.refreshToken.create({
        data: {
          userId: user.id,
          token: refreshTokenValue,
          expiresAt,
        },
      });

      logger.info({
        message: 'New user registered via tRPC',
        userId: user.id,
        username: user.username,
      });

      return {
        user: formatUserResponse(user),
        token,
        refreshToken: refreshTokenValue,
      };
    }),

  login: publicProcedure
    .input(loginSchema)
    .mutation(async ({ input }) => {
      const { email, password } = input;

      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: '邮箱或密码错误',
        });
      }

      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

      if (!isPasswordValid) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: '邮箱或密码错误',
        });
      }

      if (!user.isActive) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: '账户已被禁用',
        });
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      const token = generateAccessToken(user);
      const refreshTokenValue = generateRefreshToken();
      const expiresAt = new Date(
        Date.now() + REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000
      );

      await prisma.refreshToken.create({
        data: {
          userId: user.id,
          token: refreshTokenValue,
          expiresAt,
        },
      });

      logger.info({
        message: 'User logged in via tRPC',
        userId: user.id,
        username: user.username,
      });

      return {
        user: formatUserResponse(user),
        token,
        refreshToken: refreshTokenValue,
      };
    }),

  refreshToken: publicProcedure
    .input(refreshTokenSchema)
    .mutation(async ({ input }) => {
      const { refreshToken } = input;

      const storedToken = await prisma.refreshToken.findUnique({
        where: { token: refreshToken },
        include: { user: true },
      });

      if (!storedToken) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: '无效的刷新令牌',
        });
      }

      if (storedToken.expiresAt < new Date()) {
        await prisma.refreshToken.delete({
          where: { id: storedToken.id },
        });
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: '刷新令牌已过期，请重新登录',
        });
      }

      if (!storedToken.user.isActive) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: '账户已被禁用',
        });
      }

      await prisma.refreshToken.delete({
        where: { id: storedToken.id },
      });

      const token = generateAccessToken(storedToken.user);
      const newRefreshTokenValue = generateRefreshToken();
      const expiresAt = new Date(
        Date.now() + REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000
      );

      await prisma.refreshToken.create({
        data: {
          userId: storedToken.user.id,
          token: newRefreshTokenValue,
          expiresAt,
        },
      });

      return {
        token,
        refreshToken: newRefreshTokenValue,
      };
    }),

  logout: publicProcedure
    .input(refreshTokenSchema)
    .mutation(async ({ input, ctx }) => {
      const { refreshToken } = input;

      const storedToken = await prisma.refreshToken.findUnique({
        where: { token: refreshToken },
      });

      if (storedToken) {
        await prisma.refreshToken.delete({
          where: { id: storedToken.id },
        });
      }

      if (ctx && ctx.user) {
        await prisma.refreshToken.deleteMany({
          where: { userId: ctx.user.id },
        });

        logger.info({
          message: 'User logged out via tRPC',
          userId: ctx.user.id,
        });
      }

      return { success: true };
    }),

  getMe: protectedProcedure
    .input(getMeSchema)
    .query(async ({ ctx }) => {
      return {
        user: formatUserResponse(ctx.user),
      };
    }),
});

module.exports = { authRouter };
