import { z } from 'zod';
import { config as loadEnv } from 'dotenv';

loadEnv();

const envSchema = z
  .object({
    // Server
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().default(3000),
    HOST: z.string().default('0.0.0.0'),
    API_PREFIX: z.string().default('/api/v1'),

    // Database
    DATABASE_URL: z.string().url(),

    // Redis
    REDIS_HOST: z.string().default('localhost'),
    REDIS_PORT: z.coerce.number().default(6379),
    REDIS_URL: z.string().url().optional(),
    REDIS_PASSWORD: z.string().optional(),

    // JWT
    JWT_SECRET: z.string().min(32).optional(),
    JWT_ACCESS_SECRET: z.string().min(32).optional(),
    JWT_REFRESH_SECRET: z.string().min(32),

    // Security
    CORS_ORIGIN: z.string().default('http://localhost:3000'),
    BCRYPT_ROUNDS: z.coerce.number().default(12),
    SWAGGER_ENABLED: z.coerce.boolean().default(true),

    // Logging
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  })
  .superRefine((data, ctx) => {
    if (!data.JWT_SECRET && !data.JWT_ACCESS_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Either JWT_SECRET or JWT_ACCESS_SECRET must be provided',
        path: ['JWT_SECRET'],
      });
    }
  });

const parsedEnv = envSchema.parse(process.env);

export const env = {
  ...parsedEnv,
  JWT_SECRET: parsedEnv.JWT_SECRET ?? parsedEnv.JWT_ACCESS_SECRET!,
} as const;

export type Env = typeof env;
