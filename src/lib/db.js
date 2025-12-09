import { PrismaClient } from '@prisma/client';

// Patrón Singleton para evitar múltiples instancias de Prisma Client
// en desarrollo con hot-reloading de Next.js
const globalForPrisma = globalThis;

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = db;
}
