import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generarParteAgenciaPDF } from '@/lib/pdfGenerator';
import { logApiError } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    if (!id) return new NextResponse('ID requerido', { status: 400 });

    const pedido = await db.pedido.findUnique({
      where: { id },
      include: { cliente: true, items: { include: { producto: true } } },
    });
    if (!pedido) return new NextResponse('Pedido no encontrado', { status: 404 });

    const body = await request.json();
    const { agencia, bultos, kg, reembolso, observaciones, direccion, cp, poblacion, provincia, volumen } = body;

    if (!agencia || !bultos) {
      return NextResponse.json({ error: 'Agencia y bultos son obligatorios' }, { status: 400 });
    }

    // Guardar direccion/cp/poblacion en el cliente si se proporcionaron y el cliente no los tiene
    if ((direccion || cp || poblacion) && pedido.clienteId) {
      const updateData = {};
      if (direccion && !pedido.cliente?.direccion) updateData.direccion = direccion;
      if (cp) updateData.cp = cp;
      if (poblacion) updateData.poblacion = poblacion;
      if (Object.keys(updateData).length) {
        await db.cliente.update({ where: { id: pedido.clienteId }, data: updateData }).catch(() => {});
      }
    }

    const pdfBuffer = await generarParteAgenciaPDF(pedido, {
      agencia, bultos, kg, reembolso, observaciones, direccion, cp, poblacion, provincia, volumen,
    });

    const agenciaNombre = agencia.toLowerCase();
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="parte-${agenciaNombre}-${pedido.numero}.pdf"`,
      },
    });
  } catch (error) {
    logApiError(error, 'Error generando parte de agencia');
    return NextResponse.json({ error: 'Error al generar el parte' }, { status: 500 });
  }
}
