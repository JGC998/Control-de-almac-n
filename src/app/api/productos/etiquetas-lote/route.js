import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateEtiquetasLoteA4PDF } from '@/lib/pdfGenerator';
import { logApiError } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// POST /api/productos/etiquetas-lote
// Body: { items: [{ id: string, cantidad: number }] }
// Devuelve un PDF A4 con dos secciones: etiquetas de 15mm (32/pág) y de 10mm (50/pág).
export async function POST(request) {
  try {
    const body = await request.json();
    const items = body.items;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ message: 'Se requiere al menos un item' }, { status: 400 });
    }

    const totalEtiquetas = items.reduce((s, it) => s + (parseInt(it.cantidad) || 1), 0);
    if (totalEtiquetas > 200) {
      return NextResponse.json({ message: 'Máximo 200 etiquetas por lote' }, { status: 400 });
    }

    const ids = [...new Set(items.map(it => it.id))];

    const productos = await db.producto.findMany({
      where: { id: { in: ids } },
      include: {
        fabricante: { select: { nombre: true } },
        material:   { select: { nombre: true } },
        subfamilia: { select: { nombre: true, familia: { select: { nombre: true } } } },
      },
    });

    const productosMap = Object.fromEntries(productos.map(p => [p.id, p]));

    const itemsConProducto = items
      .map(it => ({
        producto: productosMap[it.id],
        cantidad: Math.max(1, Math.min(99, parseInt(it.cantidad) || 1)),
      }))
      .filter(it => it.producto != null);

    if (itemsConProducto.length === 0) {
      return NextResponse.json({ message: 'Ningún producto encontrado' }, { status: 404 });
    }

    const nomRow = await db.config.findUnique({ where: { key: 'nomenclatura' } });
    const nomConfig = nomRow ? JSON.parse(nomRow.value) : {};

    const buffer = await generateEtiquetasLoteA4PDF(itemsConProducto, nomConfig);
    const total  = itemsConProducto.reduce((s, it) => s + it.cantidad, 0);

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="etiquetas-${total}.pdf"`,
      },
    });
  } catch (error) {
    logApiError(error, 'POST /api/productos/etiquetas-lote');
    return NextResponse.json({ message: 'Error generando etiquetas' }, { status: 500 });
  }
}
