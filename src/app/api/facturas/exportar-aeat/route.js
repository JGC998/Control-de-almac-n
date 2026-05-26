import { NextResponse } from 'next/server';
import { logApiError } from '@/lib/logger';
import { db } from '@/lib/db';
import { generarXMLLote } from '@/lib/verifactu';

async function exportarAeat() {
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
  const baseWhere = { estado: { in: ['EMITIDA', 'PAGADA'] }, huella: { not: null }, fechaHoraGenRegistro: { not: null } };

  const MAX_POR_LOTE = 1000;

  let facturas = await db.factura.findMany({
    where: { ...baseWhere, estadoEnvioAeat: 'PENDIENTE' },
    include,
    orderBy: { fechaHoraGenRegistro: 'asc' },
    take: MAX_POR_LOTE,
  });

  const esReexportacion = facturas.length === 0;

  if (esReexportacion) {
    facturas = await db.factura.findMany({
      where: { ...baseWhere, estadoEnvioAeat: 'EXPORTADO' },
      include,
      orderBy: { fechaHoraGenRegistro: 'asc' },
      take: MAX_POR_LOTE,
    });
  }

  if (!facturas.length) {
    return NextResponse.json(
      { message: 'No hay facturas pendientes de exportar a la AEAT' },
      { status: 422 }
    );
  }

  const xml = generarXMLLote(facturas, emisor);

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
}

// POST /api/facturas/exportar-aeat
// Genera RegFactuSistemaFacturacion.xml para envío a AEAT.
// Prioriza facturas PENDIENTE (las marca EXPORTADO). Si no hay PENDIENTE,
// re-exporta las EXPORTADO sin cambiar su estado.
export async function POST() {
  try {
    return await exportarAeat();
  } catch (error) {
    logApiError(error);
    return NextResponse.json({ message: 'Error al generar XML AEAT' }, { status: 500 });
  }
}

// GET kept for backwards compatibility (read-only re-export, no state change)
export async function GET() {
  try {
    return await exportarAeat();
  } catch (error) {
    logApiError(error);
    return NextResponse.json({ message: 'Error al generar XML AEAT' }, { status: 500 });
  }
}
