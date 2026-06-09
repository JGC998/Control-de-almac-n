import { NextResponse } from 'next/server';
import { logApiError } from '@/lib/logger';
import { db } from '@/lib/db';
import { generateBudgetPDF } from '@/lib/pdfGenerator';
import { getMargenes } from '@/lib/config-cache';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    if (!id || id === 'undefined') return new NextResponse('ID requerido', { status: 400 });

    const quote = await db.presupuesto.findUnique({
      where: { id },
      include: { cliente: true, items: true },
    });

    if (!quote) {
      return new NextResponse('Presupuesto no encontrado', { status: 404 });
    }

    const [configIva, margenes] = await Promise.all([
      db.config.findUnique({ where: { key: 'iva_rate' } }),
      getMargenes(),
    ]);

    const ivaRate = configIva ? parseFloat(configIva.value) : 0.21;
    const marginRule = margenes?.find(m => m.id === quote.marginId);

    // --- PRE-CÁLCULO DE VALORES DE VENTA ---
    const multiplicador = marginRule?.multiplicador || 1;
    const gastoFijoTotal = marginRule?.gastoFijo || 0;

    const itemsCalculados = quote.items.map(item => {
      const costoUnitario = item.unitPrice || 0;
      // BUG-09: el gasto fijo se divide entre la cantidad de ESTE ítem, no la total
      // (igual que hace /api/pricing/calculate línea 75)
      const gastoFijoUnitario = gastoFijoTotal / (item.quantity || 1);
      const precioUnitarioVenta = (costoUnitario * multiplicador) + gastoFijoUnitario;
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
    logApiError(error, 'Error al generar el PDF (API)');
    return new NextResponse(JSON.stringify({ message: "Error interno al generar el PDF" }), { status: 500 });
  }
}