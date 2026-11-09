import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generarPrefacturaPDF } from '@/lib/pdfGenerator';
import { logApiError } from '@/lib/logger';
import { getIvaRate } from '@/lib/config-cache';

export const dynamic = 'force-dynamic';

export async function POST(request, { params }) {
    try {
        const { id } = await params;

        const pedido = await db.pedido.findUnique({
            where: { id },
            include: {
                cliente: true,
                items: {
                    orderBy: { descripcion: 'asc' },
                    include: { producto: true },
                },
            },
        });
        if (!pedido) return new NextResponse('Pedido no encontrado', { status: 404 });

        const body = await request.json();
        const { agencia, costesEnvio } = body;

        const ivaRate = await getIvaRate();
        const pdfBuffer = await generarPrefacturaPDF(pedido, { costesEnvio, agencia, ivaRate });

        return new NextResponse(pdfBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="prefactura-${pedido.numero}.pdf"`,
            },
        });
    } catch (error) {
        logApiError(error, 'Error generando prefactura');
        return NextResponse.json({ error: 'Error al generar la prefactura' }, { status: 500 });
    }
}
