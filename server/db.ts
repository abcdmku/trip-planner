import { PrismaPg } from '@prisma/adapter-pg';
import { env } from './config';
import { PrismaClient } from './prisma-client';

declare global {
  var __tripPlannerPrisma__: PrismaClient | undefined;
}

export const prisma =
  globalThis.__tripPlannerPrisma__ ??
  new PrismaClient({
    adapter: new PrismaPg({ connectionString: env.DATABASE_URL }),
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalThis.__tripPlannerPrisma__ = prisma;
}
