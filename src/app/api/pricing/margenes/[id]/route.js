import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

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
    console.error('Error al actualizar margen:', error);
    if (error.code === 'P2025') {
      return NextResponse.json({ message: 'Regla de margen no encontrada' }, { status: 404 });
    }
    if (error.code === 'P2002') {
      return NextResponse.json({ message: 'Ya existe una regla con este identificador base' }, { status: 409 });
    }
    return NextResponse.json({ message: 'Error al actualizar margen' }, { status: 500 });
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
    console.error('Error al eliminar margen:', error);
    if (error.code === 'P2025') {
      return NextResponse.json({ message: 'Regla de margen no encontrada' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Error al eliminar margen' }, { status: 500 });
  }
}
