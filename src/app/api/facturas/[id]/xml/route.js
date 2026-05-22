import { NextResponse } from 'next/server';
import { logApiError } from '@/lib/logger';
import { db } from '@/lib/db';
import { generarXMLRegistroAlta } from '@/lib/verifactu';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

// GET /api/facturas/[id]/xml
// Genera el XML VeriFactu para una única factura y la marca como EXPORTADO.
export async function GET(request, { params }) {
  try {
    const { id } = await params;

    const emisor = await db.configuracionEmisor.findUnique({ where: { id: 1 } });
    if (!emisor?.nif) {
      return NextResponse.json(
        { message: 'Configura el NIF del emisor en Configuración → Emisor VeriFactu antes de exportar' },
        { status: 422 }
      );
    }

    const factura = await db.factura.findUnique({
      where: { id },
      include: {
        cliente: true,
        facturaOriginal: { select: { numero: true, fechaHoraGenRegistro: true, fechaCreacion: true } },
      },
    });

    if (!factura) {
      return NextResponse.json({ message: 'Factura no encontrada' }, { status: 404 });
    }
    if (!factura.huella) {
      return NextResponse.json({ message: 'La factura no tiene huella VeriFactu (debe estar emitida)' }, { status: 422 });
    }
    if (!['EMITIDA', 'PAGADA'].includes(factura.estado)) {
      return NextResponse.json({ message: 'Solo se pueden exportar facturas emitidas o pagadas' }, { status: 422 });
    }

    // Obtener la factura anterior en la cadena para el bloque <RegistroAnterior>
    const prevFactura = factura.huellaAnterior
      ? await db.factura.findFirst({
          where: {
            huella: factura.huellaAnterior,
            id: { not: id },
          },
          select: { numero: true, fechaHoraGenRegistro: true, fechaCreacion: true },
        })
      : null;

    const xml = generarXMLRegistroAlta(factura, emisor, prevFactura);

    // Marcar como EXPORTADO solo si estaba PENDIENTE
    if (factura.estadoEnvioAeat === 'PENDIENTE') {
      await db.factura.update({
        where: { id },
        data: { estadoEnvioAeat: 'EXPORTADO' },
      });
      revalidatePath('/facturas');
      revalidatePath(`/facturas/${id}`);
    }

    return new Response(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=UTF-8',
        'Content-Disposition': `attachment; filename="verifactu_${factura.numero}.xml"`,
      },
    });
  } catch (error) {
    logApiError(error, 'Error al generar XML');
    return NextResponse.json({ message: 'Error al generar XML' }, { status: 500 });
  }
}
