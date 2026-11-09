import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generarPrefacturaMultiPDF } from '@/lib/pdfGenerator';
import { logApiError } from '@/lib/logger';
import { getIvaRate } from '@/lib/config-cache';

export const dynamic = 'force-dynamic';

export async function POST(request) {
    try {
        const { clienteId, pedidoIds, palets, provincia } = await request.json();

        if (!clienteId || !pedidoIds?.length) {
            return NextResponse.json({ error: 'clienteId y pedidoIds son obligatorios' }, { status: 400 });
        }

        const [cliente, pedidos] = await Promise.all([
            db.cliente.findUnique({ where: { id: clienteId } }),
            Promise.all(
                pedidoIds.map(id =>
                    db.pedido.findUnique({
                        where: { id },
                        include: { items: { orderBy: { descripcion: 'asc' }, include: { producto: true } } },
                    })
                )
            ),
        ]);

        const pedidosValidos = pedidos.filter(Boolean);
        const totalEnvio = (palets || []).reduce((s, p) => s + (Number(p.costePallex?.costeTotal) || 0), 0);
        const ivaRate = await getIvaRate();

        const pdfBuffer = await generarPrefacturaMultiPDF(pedidosValidos, palets || [], cliente, {
            totalEnvio,
            ivaRate,
        });

        const clienteNombre = (cliente?.nombre || 'cliente').replace(/\s+/g, '-').toLowerCase();
        return new NextResponse(pdfBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="prefactura-${clienteNombre}.pdf"`,
            },
        });
    } catch (error) {
        logApiError(error, 'Error generando prefactura multi-pedido');
        return NextResponse.json({ error: 'Error al generar la prefactura' }, { status: 500 });
    }
}
