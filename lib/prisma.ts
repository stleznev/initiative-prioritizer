/**
 * Prisma client wrapper. This file ensures that only one instance of
 * PrismaClient is instantiated during development to avoid exhausting
 * database connections on hot reloads. In production, a new client is
 * created for each request.
 */
import { PrismaClient } from '@prisma/client';

// Add prisma to the global object on development to reuse across hot reloads
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
