import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { exportarPresupuestosExcel } from '@/lib/export';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const presupuestos = await db.presupuesto.findMany({
            include: { cliente: true },
            orderBy: { fechaCreacion: 'desc' }
        });

        const buffer = await exportarPresupuestosExcel(presupuestos);

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="presupuestos-${new Date().toISOString().split('T')[0]}.xlsx"`,
            },
        });
    } catch (error) {
        console.error('Error exportando presupuestos:', error);
        return NextResponse.json({ message: 'Error al exportar' }, { status: 500 });
    }
}
