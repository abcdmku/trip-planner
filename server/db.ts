import { PrismaClient } from '@prisma/client';

declare global {
  var __tripPlannerPrisma__: PrismaClient | undefined;
}

export const prisma =
  globalThis.__tripPlannerPrisma__ ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalThis.__tripPlannerPrisma__ = prisma;
}
