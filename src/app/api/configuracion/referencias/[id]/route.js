import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { handlePrismaError } from '@/lib/manejadores-api';

export const dynamic = 'force-dynamic';

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const data = await request.json();
    const updatedItem = await db.referenciaBobina.update({
      where: { id },
      data: {
        referencia: data.nombre,
        ancho: parseFloat(data.ancho) || 0,
        lonas: parseInt(data.lonas) || 0,
        pesoPorMetroLineal: parseFloat(data.pesoPorMetroLineal) || 0,
      },
    });
    return NextResponse.json(updatedItem);
  } catch (error) {
    return handlePrismaError(error, {
      notFound: 'Referencia no encontrada',
      conflict: 'Ya existe una referencia con este nombre',
    });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await db.referenciaBobina.delete({ where: { id } });
    return NextResponse.json({ message: 'Referencia eliminada' });
  } catch (error) {
    return handlePrismaError(error, {
      notFound: 'Referencia no encontrada',
      hasRelated: 'No se puede eliminar: la referencia está en un pedido de bobina.',
    });
  }
}
