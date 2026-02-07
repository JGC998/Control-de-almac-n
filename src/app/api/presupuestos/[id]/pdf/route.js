import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateBudgetPDF } from '@/lib/pdfGenerator';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  try {
    const { id } = params;

    const quote = await db.presupuesto.findUnique({
      where: { id },
      include: { cliente: true, items: true },
    });

    if (!quote) {
      return new NextResponse('Presupuesto no encontrado', { status: 404 });
    }

    const [configIva, margenes] = await Promise.all([
      db.config.findUnique({ where: { key: 'iva_rate' } }),
      db.reglaMargen.findMany(),
    ]);

    const ivaRate = configIva ? parseFloat(configIva.value) : 0.21;
    const marginRule = margenes?.find(m => m.id === quote.marginId);

    // --- PRE-CÁLCULO DE VALORES DE VENTA ---
    const multiplicador = marginRule?.multiplicador || 1;
    const gastoFijoTotal = marginRule?.gastoFijo || 0;
    const totalQuantity = (quote.items || []).reduce((sum, item) => sum + (item.quantity || 0), 0);
    const gastoFijoUnitarioProrrateado = totalQuantity > 0 ? (gastoFijoTotal / totalQuantity) : 0;

    const itemsCalculados = quote.items.map(item => {
      const costoUnitario = item.unitPrice || 0;
      const precioUnitarioVenta = (costoUnitario * multiplicador) + gastoFijoUnitarioProrrateado;
      return {
        ...item,
        unitPriceVenta: precioUnitarioVenta,
        totalVentaItem: precioUnitarioVenta * (item.quantity || 0),
      };
    });

    // Inyectar items calculados en el objeto quote para el generador
    const quoteWithCalculations = { ...quote, items: itemsCalculados };

    // Generar PDF usando utilidad
    const pdfBuffer = await generateBudgetPDF(quoteWithCalculations, ivaRate);

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="presupuesto-${quote.numero}.pdf"`,
      },
    });

  } catch (error) {
    console.error('Error al generar el PDF (API):', error);
    return new NextResponse(JSON.stringify({ message: `Error interno: ${error.message}` }), { status: 500 });
  }
}