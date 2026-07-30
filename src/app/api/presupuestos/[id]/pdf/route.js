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

    const rawIva = configIva ? parseFloat(configIva.value) : 21;
    const ivaRate = rawIva > 1 ? rawIva / 100 : rawIva;
    const marginRule = margenes?.find(m => m.id === quote.marginId);

    const multiplicador = marginRule?.multiplicador || 1;
    const gastoFijoTotal = marginRule?.gastoFijo || 0;

    const totalQuantity = quote.items.reduce((sum, i) => sum + (i.quantity || 0), 0);
    const itemsCalculados = quote.items.map(item => {
      const costoUnitario = item.unitPrice || 0;
      const gastoFijoUnitario = totalQuantity > 0 ? gastoFijoTotal / totalQuantity : 0;
      const precioUnitarioVenta = (costoUnitario * multiplicador) + gastoFijoUnitario;
      return {
        ...item,
        unitPriceVenta: precioUnitarioVenta,
        totalVentaItem: precioUnitarioVenta * (item.quantity || 0),
      };
    });

    // Recalcular totales con margen aplicado para que el pie del PDF cuadre con las filas
    const subtotalVenta = parseFloat(itemsCalculados.reduce((sum, item) => sum + item.totalVentaItem, 0).toFixed(2));
    const taxVenta = parseFloat((subtotalVenta * ivaRate).toFixed(2));
    const totalVenta = parseFloat((subtotalVenta + taxVenta).toFixed(2));

    const quoteWithCalculations = {
      ...quote,
      items: itemsCalculados,
      subtotal: subtotalVenta,
      tax: taxVenta,
      total: totalVenta,
    };

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