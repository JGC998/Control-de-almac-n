import { PrismaClient } from '@prisma/client';

// Esta variable 'db' será tu nuevo 'dataManager'
// Se encarga de la conexión y es segura para concurrencia.
export const db = new PrismaClient();
