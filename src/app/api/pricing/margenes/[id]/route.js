import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { handlePrismaError } from '@/lib/manejadores-api';

export const dynamic = 'force-dynamic';

// PUT /api/pricing/margenes/[id] - Actualiza una regla de margen
export async function PUT(request, { params }) {
  try {
    // FIX CRÍTICO: Usamos await para desestructurar 'id'
    const { id } = await params;
    const data = await request.json();
    // Usamos 'multiplicador' y 'gastoFijo'
    const { descripcion, tipo, multiplicador, categoria, tierCliente, gastoFijo } = data;

    const parsedMultiplicador = parseFloat(multiplicador);

    // Validación de datos
    if (!descripcion || !tipo || isNaN(parsedMultiplicador) || parsedMultiplicador <= 0) {
      return NextResponse.json(
        { message: 'Datos de margen incompletos o inválidos. Se requiere descripción, tipo y un multiplicador numérico positivo.' },
        { status: 400 }
      );
    }

    // Obtener regla anterior
    const oldRegla = await db.reglaMargen.findUnique({ where: { id: id } });

    const updatedData = {
      descripcion: descripcion,
      tipo: tipo,
      multiplicador: parsedMultiplicador,
      gastoFijo: parseFloat(gastoFijo) || 0,
      categoria: categoria,
      tierCliente: tierCliente,
    };

    const updatedRegla = await db.reglaMargen.update({
      where: { id: id },
      data: updatedData,
    });

    // Audit Log
    try {
      const { logUpdate } = await import('@/lib/audit');
      await logUpdate('ReglaMargen', id, oldRegla, updatedData, 'Admin');
    } catch (e) { console.error(e); }

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
    } catch (e) { console.error(e); }

    return NextResponse.json({ message: 'Regla de margen eliminada' }, { status: 200 });
  } catch (error) {
    return handlePrismaError(error, { notFound: 'Regla de margen no encontrada' });
  }
}
