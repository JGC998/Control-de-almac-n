// src/lib/manejadores-api.js
import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache'; // Import revalidatePath
import { manejarErrorApi } from '@/utils/utilidades';

export function crearManejadoresCRUD(modelName, options = {}, revalidationPath) { // Renamed parameter
  const model = db[modelName];

  const GET = async (request) => {
    try {
      const { searchParams } = new URL(request.url);
      const pageParam = searchParams.get('page');
      const limitParam = searchParams.get('limit');

      // Si hay parámetros de paginación, devolvemos estructura paginada
      if (pageParam || limitParam) {
        const page = parseInt(pageParam || '1');
        const limit = parseInt(limitParam || '50');
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
          meta: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
          }
        });
      }

      // Comportamiento legado: devolver array completo
      const records = await model.findMany(options.findMany || {});
      return NextResponse.json(records);
    } catch (e) {
      return manejarErrorApi(e);
    }
  };

  const POST = async (request) => {
    try {
      const data = await request.json();

      // Lógica de mapeo opcional antes de crear
      const finalData = options.mapearCrear ? options.mapearCrear(data) : data;

      const newRecord = await model.create({ data: finalData });

      // Intentar registrar en Audit Log (si es posible identificar la entidad)
      // Usamos dynamic import para evitar dependencias circulares si fuera necesario, 
      // y try-catch silencioso para no romper flujo principal
      try {
        const { logCreate } = await import('@/lib/audit');
        // Usamos modelName como nombre de entidad (ej: 'cliente', 'producto')
        // Capitalizamos la primera letra para consistencia
        const entityName = modelName.charAt(0).toUpperCase() + modelName.slice(1);
        await logCreate(entityName, newRecord.id, newRecord, 'System');
      } catch (logError) {
        console.error('Audit Log failed in Generic Handler:', logError);
      }

      if (revalidationPath) { // Call revalidatePath if a path is provided
        revalidatePath(revalidationPath);
      }
      return NextResponse.json(newRecord, { status: 201 });
    } catch (e) {
      return manejarErrorApi(e);
    }
  };

  // Dejamos preparados PUT y DELETE para el futuro
  return { GET, POST };
}
