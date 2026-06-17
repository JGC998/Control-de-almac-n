import { NextResponse } from 'next/server';
import { logApiError } from '@/lib/logger';
import { db } from '@/lib/db';
import { handlePrismaError } from '@/lib/manejadores-api';
import { reglaMargenSchema, validateData } from '@/lib/validations';

export const dynamic = 'force-dynamic';

// PUT /api/pricing/margenes/[id] - Actualiza una regla de margen
export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const data = await request.json();
    const validation = validateData(reglaMargenSchema, data);
    if (!validation.success) {
      return NextResponse.json({ message: 'Datos inválidos', errors: validation.errors }, { status: 400 });
    }
    const { descripcion, multiplicador, gastoFijo, tierCliente } = validation.data;

    const oldRegla = await db.reglaMargen.findUnique({ where: { id } });

    const updatedData = {
      descripcion,
      tipo: data.tipo || descripcion,
      base: validation.data.base || descripcion,
      multiplicador,
      gastoFijo: gastoFijo ?? 0,
      tierCliente: tierCliente ?? null,
    };

    const updatedRegla = await db.reglaMargen.update({
      where: { id: id },
      data: updatedData,
    });

    // Audit Log
    try {
      const { logUpdate } = await import('@/lib/audit');
      await logUpdate('ReglaMargen', id, oldRegla, updatedData, 'Admin');
    } catch (e) { logApiError(e); }

    return NextResponse.json(updatedRegla);
  } catch (error) {
    return handlePrismaError(error, {
      notFound: 'Regla de margen no encontrada',
      conflict: 'Ya existe una regla con este identificador base',
    });
  }
}

// DELETE /api/pricing/margenes/[id] - Elimina una regla de margen
export async function DELETE(request, { params }) {
  try {
    // FIX CRÍTICO: Usamos await para desestructurar 'id'
    const { id } = await params;

    // Obtener regla antes de borrar
    const oldRegla = await db.reglaMargen.findUnique({ where: { id: id } });

    await db.reglaMargen.delete({
      where: { id: id },
    });

    // Audit Log
    try {
      const { logDelete } = await import('@/lib/audit');
      await logDelete('ReglaMargen', id, oldRegla, 'Admin');
    } catch (e) { logApiError(e); }

    return NextResponse.json({ message: 'Regla de margen eliminada' }, { status: 200 });
  } catch (error) {
    return handlePrismaError(error, { notFound: 'Regla de margen no encontrada' });
  }
}
