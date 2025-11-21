import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// POST /api/precios/bulk-update
export async function POST(request) {
  try {
    const { percentage, material } = await request.json();

    if (percentage === undefined || percentage === null) {
      return NextResponse.json({ message: 'El porcentaje es requerido' }, { status: 400 });
    }

    // Calculamos el factor multiplicador (ej: 10% -> 1.10, -5% -> 0.95)
    const factor = 1 + (parseFloat(percentage) / 100);
    
    let result = 0;

    // IMPORTANTE: Usamos executeRawUnsafe para que SQLite reconozca bien los nombres
    if (!material || material === 'TODOS') {
        // Actualizar TODOS
        result = await db.$executeRawUnsafe(`UPDATE TarifaMaterial SET precio = precio * ${factor}`);
    } else {
        // Actualizar SOLO un material específico
        // NOTA: En SQL puro los strings van entre comillas simples
        result = await db.$executeRawUnsafe(`UPDATE TarifaMaterial SET precio = precio * ${factor} WHERE material = '${material}'`);
    }

    // En SQLite con Prisma, el resultado suele ser el número de filas afectadas
    // Si devuelve un objeto, intentamos sacar el contador
    const count = typeof result === 'number' ? result : (result?.count || 0);

    return NextResponse.json({ 
        message: 'Precios actualizados correctamente', 
        count: count 
    });

  } catch (error) {
    console.error('Error en bulk-update:', error);
    return NextResponse.json({ message: `Error interno: ${error.message}` }, { status: 500 });
  }
}