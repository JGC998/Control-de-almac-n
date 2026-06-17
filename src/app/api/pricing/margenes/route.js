import { NextResponse } from 'next/server';
import { logApiError } from '@/lib/logger';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { clearMargenesCache } from '@/lib/config-cache';
import { reglaMargenSchema, validateData } from '@/lib/validations';

export const dynamic = 'force-dynamic';

// GET /api/pricing/margenes - Obtiene todas las reglas de margen
export async function GET() {
  try {
    const data = await db.reglaMargen.findMany({ take: 100 });
    return NextResponse.json(data);
  } catch (error) {
    logApiError(error, 'GET /api/pricing/margenes');
    return NextResponse.json({ message: 'Error al obtener márgenes' }, { status: 500 });
  }
}

// POST /api/pricing/margenes - Crea una nueva regla de margen
export async function POST(request) {
  try {
    const data = await request.json();
    const validation = validateData(reglaMargenSchema, data);
    if (!validation.success) {
      return NextResponse.json({ message: 'Datos inválidos', errors: validation.errors }, { status: 400 });
    }
    const { descripcion, multiplicador, gastoFijo, tierCliente } = validation.data;

    const nuevaRegla = await db.reglaMargen.create({
      data: {
        descripcion,
        tipo: data.tipo || descripcion,
        base: validation.data.base || descripcion,
        multiplicador,
        gastoFijo: gastoFijo ?? 0,
        tierCliente: tierCliente ?? null,
      },
    });

    // Audit Log
    try {
      const { logCreate } = await import('@/lib/audit');
      await logCreate('ReglaMargen', nuevaRegla.id, nuevaRegla, 'Admin');
    } catch (e) { logApiError(e); }

    clearMargenesCache();
    revalidatePath('/api/pricing/margenes');

    return NextResponse.json(nuevaRegla, { status: 201 });
  } catch (error) {
    logApiError(error);
    if (error.code === 'P2002') {
      return NextResponse.json({ message: 'Ya existe una regla con este identificador base' }, { status: 409 });
    }
    return NextResponse.json({ message: 'Error al crear margen' }, { status: 500 });
  }
}
