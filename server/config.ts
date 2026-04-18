import { z } from 'zod';
import { resolveBackendPort } from './runtime-ports';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  GOOGLE_CLIENT_ID: z.string().min(1, 'GOOGLE_CLIENT_ID is required'),
  GOOGLE_CLIENT_SECRET: z.string().min(1, 'GOOGLE_CLIENT_SECRET is required'),
  APP_URL: z.string().url('APP_URL must be a valid URL'),
  SESSION_SECRET: z.string().min(16, 'SESSION_SECRET must be at least 16 characters'),
});

export type ServerEnv = z.infer<typeof envSchema>;

export const env: ServerEnv = envSchema.parse(process.env);

export const isProduction = env.NODE_ENV === 'production';

export const listenPort = Number(
  resolveBackendPort({
    nodeEnv: env.NODE_ENV,
    configuredPort: String(env.PORT),
    appUrl: env.APP_URL,
  }),
);
