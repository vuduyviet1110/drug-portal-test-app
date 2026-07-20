import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const createPrismaClient = () => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is missing');
  }

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

let schemaReady: Promise<void> | null = null;

/** Apply additive schema changes at runtime (serverless has no build-time DB access). */
export function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      try {
        await prisma.$executeRawUnsafe(
          `ALTER TABLE "SystemConfig" ADD COLUMN IF NOT EXISTS "autoResolvedProxyUrl" TEXT`,
        );
      } catch (err) {
        console.warn('[Schema] ensureSchema failed:', (err as Error).message);
      }
    })();
  }
  return schemaReady;
}
