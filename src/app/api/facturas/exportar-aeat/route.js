import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generarXMLLote } from '@/lib/verifactu';

// GET /api/facturas/exportar-aeat
// Genera RegFactuSistemaFacturacion.xml para envío a AEAT.
// Prioriza facturas PENDIENTE (las marca EXPORTADO). Si no hay PENDIENTE,
// re-exporta las EXPORTADO sin cambiar su estado.
export async function GET() {
  try {
    const emisor = await db.configuracionEmisor.findUnique({ where: { id: 1 } });
    if (!emisor?.nif) {
      return NextResponse.json(
        { message: 'Configura el NIF del emisor en Configuración → Emisor VeriFactu antes de exportar' },
        { status: 422 }
      );
    }

    const include = {
      cliente: true,
      facturaOriginal: { select: { numero: true, fechaHoraGenRegistro: true, fechaCreacion: true } },
    };
    const baseWhere = { estado: { in: ['EMITIDA', 'PAGADA'] }, huella: { not: null } };

    // Buscar primero las PENDIENTE; si no hay, re-exportar EXPORTADO
    let facturas = await db.factura.findMany({
      where: { ...baseWhere, estadoEnvioAeat: 'PENDIENTE' },
      include,
      orderBy: { fechaHoraGenRegistro: 'asc' },
    });

    const esReexportacion = facturas.length === 0;

    if (esReexportacion) {
      facturas = await db.factura.findMany({
        where: { ...baseWhere, estadoEnvioAeat: 'EXPORTADO' },
        include,
        orderBy: { fechaHoraGenRegistro: 'asc' },
      });
    }

    if (!facturas.length) {
      return NextResponse.json(
        { message: 'No hay facturas pendientes de exportar a la AEAT' },
        { status: 422 }
      );
    }

    const xml = generarXMLLote(facturas, emisor);

    // Solo actualizar estado si había PENDIENTE (no en re-exportación)
    if (!esReexportacion) {
      await db.factura.updateMany({
        where: { id: { in: facturas.map(f => f.id) } },
        data: { estadoEnvioAeat: 'EXPORTADO' },
      });
    }

    const fecha = new Date().toISOString().slice(0, 10);
    const suffix = esReexportacion ? 'reexport' : `${facturas.length}facturas`;
    const filename = `verifactu_${fecha}_${suffix}.xml`;

    return new Response(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=UTF-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: error.message || 'Error al generar XML' }, { status: 500 });
  }
}
