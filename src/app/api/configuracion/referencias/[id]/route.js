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
        ancho: data.ancho != null && data.ancho !== '' && !isNaN(parseFloat(data.ancho)) ? parseFloat(data.ancho) : null,
        lonas: data.lonas != null && data.lonas !== '' && !isNaN(parseInt(data.lonas, 10)) ? parseInt(data.lonas, 10) : null,
        pesoPorMetroLineal: data.pesoPorMetroLineal != null && data.pesoPorMetroLineal !== '' && !isNaN(parseFloat(data.pesoPorMetroLineal)) ? parseFloat(data.pesoPorMetroLineal) : null,
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
