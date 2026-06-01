import { NextResponse } from 'next/server';
import { logApiError } from '@/lib/logger';
import { generarCartaPortePDF } from '@/lib/pdfGenerator';

export async function POST(request) {
  try {
    const datos = await request.json();
    const pdfBuffer = await generarCartaPortePDF(datos);
    const slug = (datos.referencia || Date.now()).toString().replace(/[^a-zA-Z0-9_\-]/g, '-');
    const filename = `carta-porte-${slug}.pdf`;

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    logApiError(error, 'Error generando carta de porte PDF');
    return NextResponse.json({ message: 'Error al generar la carta de porte' }, { status: 500 });
  }
}
