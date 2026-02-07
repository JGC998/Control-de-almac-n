import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { exportarPedidosExcel } from '@/lib/export';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const pedidos = await db.pedido.findMany({
            include: { cliente: true },
            orderBy: { fechaCreacion: 'desc' }
        });

        const buffer = await exportarPedidosExcel(pedidos);

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="pedidos-${new Date().toISOString().split('T')[0]}.xlsx"`,
            },
        });
    } catch (error) {
        console.error('Error exportando pedidos:', error);
        return NextResponse.json({ message: 'Error al exportar' }, { status: 500 });
    }
}
