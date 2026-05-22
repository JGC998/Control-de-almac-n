import { NextResponse } from 'next/server';
import { logApiError } from '@/lib/logger';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { getNextNumber } from '@/lib/sequence';

const TIPOS_VALIDOS = ['R1', 'R2', 'R3', 'R4', 'R5'];

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const { tipoFactura = 'R1', tipoRectificativa = 'I', notas } = await request.json();

    if (!TIPOS_VALIDOS.includes(tipoFactura)) {
      return NextResponse.json({ message: 'Tipo de rectificativa no válido (R1–R5)' }, { status: 400 });
    }
    if (!['S', 'I'].includes(tipoRectificativa)) {
      return NextResponse.json({ message: 'Modalidad no válida (S=Sustitución / I=Diferencias)' }, { status: 400 });
    }

    const original = await db.factura.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!original) {
      return NextResponse.json({ message: 'Factura no encontrada' }, { status: 404 });
    }
    if (!['EMITIDA', 'PAGADA'].includes(original.estado)) {
      return NextResponse.json(
        { message: 'Solo se pueden rectificar facturas emitidas o pagadas' },
        { status: 422 }
      );
    }

    const rectExistente = await db.factura.findFirst({
      where: { facturaOriginalId: id, estado: { not: 'CANCELADA' } },
      select: { numero: true },
    });
    if (rectExistente) {
      return NextResponse.json(
        { message: `Ya existe una rectificativa activa (${rectExistente.numero})` },
        { status: 422 }
      );
    }

    const numero = await getNextNumber('rectificativa');

    const rectificativa = await db.factura.create({
      data: {
        numero,
        tipoFactura,
        tipoRectificativa,
        facturaOriginal: { connect: { id } },
        estado: 'BORRADOR',
        notas: notas || `Rectificativa de ${original.numero}`,
        subtotal: original.subtotal,
        tax: original.tax,
        total: original.total,
        ...(original.clienteId && { cliente: { connect: { id: original.clienteId } } }),
        items: {
          create: original.items.map(i => ({
            descripcion:      i.descripcion,
            quantity:         i.quantity,
            unitPrice:        i.unitPrice,
            pesoUnitario:     i.pesoUnitario || 0,
            detallesTecnicos: i.detallesTecnicos || null,
            ...(i.productoId && { producto: { connect: { id: i.productoId } } }),
          })),
        },
      },
      include: { items: true, cliente: true },
    });

    // S4 — Audit log al crear rectificativa
    db.auditLog.create({
      data: {
        action: 'RECTIFICATIVA_CREADA',
        entity: 'Factura',
        entityId: rectificativa.id,
        details: JSON.stringify({
          facturaOriginalId: id,
          facturaOriginalNumero: original.numero,
          tipo: tipoFactura,
          modalidad: tipoRectificativa,
          numero: rectificativa.numero,
        }),
      },
    }).catch(() => {});

    revalidatePath('/facturas');
    revalidatePath(`/facturas/${id}`);
    return NextResponse.json(rectificativa, { status: 201 });
  } catch (error) {
    logApiError(error);
    return NextResponse.json({ message: 'Error al crear rectificativa' }, { status: 500 });
  }
}
