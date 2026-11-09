import { NextResponse } from 'next/server';
import { generarPackingListPDF } from '@/lib/pdfGenerator';
import { logApiError } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function POST(request) {
    try {
        const { palet, items, cliente } = await request.json();

        if (!palet || !items?.length) {
            return NextResponse.json({ error: 'palet e items son obligatorios' }, { status: 400 });
        }

        const pdfBuffer = await generarPackingListPDF(palet, items, cliente);

        const paletLabel = (palet.label || 'pale').replace(/\s+/g, '-').toLowerCase();
        return new NextResponse(pdfBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="packing-list-${paletLabel}.pdf"`,
            },
        });
    } catch (error) {
        logApiError(error, 'Error generando packing list');
        return NextResponse.json({ error: 'Error al generar el packing list' }, { status: 500 });
    }
}
