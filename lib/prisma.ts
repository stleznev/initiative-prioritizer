import { PrismaClient } from '@prisma/client';

// Ensure that we reuse a single PrismaClient instance across the entire
// application.  In development it is attached to the global object to
// prevent spawning multiple instances with hot reload.  In production
// the client is only created once per runtime.
const globalForPrisma = global as unknown as { prisma?: PrismaClient };

const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
