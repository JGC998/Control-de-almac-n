import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateEtiquetaPDF } from '@/lib/pdfGenerator';
import { logApiError } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// GET /api/productos/[id]/etiqueta?costo=1
// Genera un PDF de etiqueta (100×70mm) con QR apuntando a la ficha del producto.
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const mostrarCosto = searchParams.get('costo') === '1';

    const producto = await db.producto.findUnique({
      where: { id },
      include: {
        fabricante: { select: { nombre: true } },
        material:   { select: { nombre: true } },
      },
    });
    if (!producto) {
      return NextResponse.json({ message: 'Producto no encontrado' }, { status: 404 });
    }

    // Construir URL base desde los headers de la petición
    const host  = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'localhost:3000';
    const proto = request.headers.get('x-forwarded-proto') || 'http';
    const baseUrl = `${proto}://${host}`;

    const buffer = await generateEtiquetaPDF(producto, baseUrl, { mostrarCosto });

    const nombreSafe = producto.nombre.replace(/[^a-z0-9]/gi, '-').toLowerCase().slice(0, 40);
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="etiqueta-${nombreSafe}.pdf"`,
      },
    });
  } catch (error) {
    logApiError(error, 'GET /api/productos/[id]/etiqueta');
    return NextResponse.json({ message: 'Error generando etiqueta' }, { status: 500 });
  }
}
