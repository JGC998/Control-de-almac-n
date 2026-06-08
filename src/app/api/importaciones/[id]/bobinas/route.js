import { NextResponse } from 'next/server';
import { z } from 'zod';
import { logApiError } from '@/lib/logger';
import { db } from '@/lib/db';

const schema = z.object({
  bobinas: z.string().min(2, 'Artículos requeridos'),
});

// PATCH /api/importaciones/[id]/bobinas
// Actualiza solo el campo bobinas de una importación existente (modo borrador).
// Permite actualizar el listado sin tocar los campos financieros.
export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const body   = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', errors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const registro = await db.importacionContenedor.update({
      where: { id },
      data:  { bobinas: parsed.data.bobinas },
    });

    return NextResponse.json(registro);
  } catch (error) {
    logApiError(error, 'PATCH /api/importaciones/[id]/bobinas');
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Importación no encontrada' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Error al actualizar artículos' }, { status: 500 });
  }
}
