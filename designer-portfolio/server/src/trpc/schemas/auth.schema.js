const { z } = require('zod');

const registerSchema = z.object({
  email: z.string().email('请输入有效的邮箱地址'),
  password: z.string().min(8, '密码至少8位').max(128, '密码最多128位'),
  username: z.string().min(3, '用户名至少3个字符').max(20, '用户名最多20个字符')
    .regex(/^[a-zA-Z0-9_-]+$/, '用户名只能包含字母、数字、下划线和连字符'),
});

const loginSchema = z.object({
  email: z.string().email('请输入有效的邮箱地址'),
  password: z.string().min(1, '请输入密码'),
});

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, '请提供刷新令牌'),
});

const getMeSchema = z.object({});

const userResponseSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  username: z.string(),
  avatarUrl: z.string().nullable().optional(),
  role: z.string().optional(),
  isActive: z.boolean().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

const authResponseSchema = z.object({
  user: userResponseSchema,
  token: z.string(),
  refreshToken: z.string(),
});

const refreshResponseSchema = z.object({
  token: z.string(),
  refreshToken: z.string(),
});

module.exports = {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  getMeSchema,
  userResponseSchema,
  authResponseSchema,
  refreshResponseSchema,
};
