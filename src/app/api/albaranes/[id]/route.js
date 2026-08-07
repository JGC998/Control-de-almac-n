import { NextResponse } from 'next/server';
import { logApiError } from '@/lib/logger';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { handlePrismaError } from '@/lib/manejadores-api';

export const dynamic = 'force-dynamic';

// GET /api/albaranes/[id]
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const albaran = await db.albaran.findUnique({
      where: { id },
      include: {
        cliente: { select: { id: true, nombre: true, direccion: true, nif: true, telefono: true, email: true } },
        pedido: { select: { id: true, numero: true } },
        items: { include: { producto: { select: { id: true, nombre: true, referenciaFabricante: true } } } },
        factura: { select: { id: true, numero: true, estado: true } },
      },
    });

    if (!albaran) return NextResponse.json({ message: 'Albarán no encontrado' }, { status: 404 });

    return NextResponse.json({
      ...albaran,
      subtotal: Number(albaran.subtotal),
      tax: Number(albaran.tax),
      total: Number(albaran.total),
      items: albaran.items.map(i => ({ ...i, unitPrice: Number(i.unitPrice), pesoUnitario: Number(i.pesoUnitario) })),
    });
  } catch (error) {
    logApiError(error, 'Error al obtener albarán');
    return NextResponse.json({ message: 'Error interno' }, { status: 500 });
  }
}

// DELETE /api/albaranes/[id]
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const albaran = await db.albaran.findUnique({
      where: { id },
      select: { id: true, numero: true, factura: { select: { id: true } } },
    });

    if (!albaran) return NextResponse.json({ message: 'Albarán no encontrado' }, { status: 404 });
    if (albaran.factura) {
      return NextResponse.json({ message: 'No se puede eliminar un albarán con factura asociada' }, { status: 409 });
    }

    await db.albaran.delete({ where: { id } });
    revalidatePath('/albaranes');
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handlePrismaError(error, { notFound: 'Albarán no encontrado.' });
  }
}
