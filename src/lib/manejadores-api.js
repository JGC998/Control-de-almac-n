// src/lib/manejadores-api.js
import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { manejarErrorApi } from '@/utils/utilidades';
import { logApiError } from '@/lib/logger';

export function handlePrismaError(error, { notFound, conflict, hasRelated } = {}) {
  if (error.code === 'P2025') {
    return NextResponse.json({ message: notFound || 'Registro no encontrado' }, { status: 404 });
  }
  if (error.code === 'P2002') {
    return NextResponse.json({ message: conflict || 'Ya existe un registro con esos datos' }, { status: 409 });
  }
  if (error.code === 'P2003') {
    return NextResponse.json({ message: hasRelated || 'No se puede eliminar: tiene registros relacionados' }, { status: 409 });
  }
  logApiError(error, 'handlePrismaError');
  return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
}

/**
 * Convierte campos Decimal de Prisma a Number para serialización JSON.
 * @param {object} obj - Objeto devuelto por Prisma
 * @param {string[]} fields - Nombres de los campos Decimal a convertir
 */
export function serializeDecimals(obj, fields) {
  return { ...obj, ...Object.fromEntries(fields.map(f => [f, obj[f] != null ? Number(obj[f]) : null])) };
}

export function crearManejadoresCRUD(modelName, options = {}, revalidationPath) {
  const model = db[modelName];

  const GET = async (request) => {
    try {
      const { searchParams } = new URL(request.url);
      const pageParam = searchParams.get('page');
      const limitParam = searchParams.get('limit');

      if (pageParam || limitParam) {
        const page  = Math.max(1, parseInt(pageParam  || '1',  10));
        const limit = Math.min(500, Math.max(1, parseInt(limitParam || '50', 10)));
        const skip = (page - 1) * limit;

        const [records, total] = await Promise.all([
          model.findMany({
            ...(options.findMany || {}),
            take: limit,
            skip: skip,
          }),
          model.count({ where: options.findMany?.where || {} })
        ]);

        return NextResponse.json({
          data: records,
          meta: { total, page, limit, totalPages: Math.ceil(total / limit) }
        });
      }

      const records = await model.findMany({ take: 500, ...(options.findMany || {}) });
      // BACK-02: Advertir al cliente cuando el resultado puede estar truncado a 500
      const headers = records.length === 500 ? { 'X-Results-Truncated': 'true; max=500' } : {};
      return NextResponse.json(records, { headers });
    } catch (e) {
      return manejarErrorApi(e);
    }
  };

  const POST = async (request) => {
    try {
      const data = await request.json();

      if (options.zodSchema) {
        const result = options.zodSchema.safeParse(data);
        if (!result.success) {
          return NextResponse.json(
            { message: 'Datos inválidos', errors: result.error.flatten().fieldErrors },
            { status: 400 }
          );
        }
      }

      const finalData = options.mapearCrear ? options.mapearCrear(data) : data;
      const newRecord = await model.create({ data: finalData });

      // BACK-03: Fire-and-forget real — no bloquea la respuesta al cliente
      import('@/lib/audit')
        .then(({ logCreate }) => {
          const entityName = modelName.charAt(0).toUpperCase() + modelName.slice(1);
          return logCreate(entityName, newRecord.id, newRecord, 'System');
        })
        .catch(e => logApiError(e, 'Audit Log failed'));

      if (revalidationPath) revalidatePath(revalidationPath);
      return NextResponse.json(newRecord, { status: 201 });
    } catch (e) {
      return manejarErrorApi(e);
    }
  };

  return { GET, POST };
}
