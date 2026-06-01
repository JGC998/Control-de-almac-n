import { NextResponse } from 'next/server';
import { logApiError } from '@/lib/logger';
import { generarCartaPortePDF } from '@/lib/pdfGenerator';
import { z } from 'zod';

const cartaPorteSchema = z.object({
  expedidor:    z.object({ nombre: z.string().min(1) }).passthrough(),
  destinatario: z.object({ nombre: z.string().min(1) }).passthrough(),
  mercancias:   z.array(z.object({ descripcion: z.string().min(1) }).passthrough()).min(1),
  detalles:     z.object({}).passthrough().optional(),
  pales:        z.array(z.object({}).passthrough()).optional(),
});

export async function POST(request) {
  try {
    const raw = await request.json();
    const parsed = cartaPorteSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ message: 'Datos inválidos', errors: parsed.error.flatten().fieldErrors }, { status: 400 });
    }
    const datos = { ...raw, ...parsed.data };
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
