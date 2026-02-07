import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generarCSV, CSV_DEFINITIONS } from '@/lib/export';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const model = searchParams.get('model');

        if (!model || !CSV_DEFINITIONS[model]) {
            return NextResponse.json({ message: 'Modelo no válido o no especificado' }, { status: 400 });
        }

        let data = [];
        if (model === 'tarifaLogistica') {
            data = await db.tarifaTransporte.findMany();
        } else if (model === 'producto') {
            data = await db.producto.findMany();
        } else if (model === 'cliente') {
            data = await db.cliente.findMany();
        }

        const csvContent = generarCSV(data, CSV_DEFINITIONS[model]);

        return new NextResponse(csvContent, {
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="${model}-${new Date().toISOString().split('T')[0]}.csv"`,
            },
        });

    } catch (error) {
        console.error('Error exportando CSV:', error);
        return NextResponse.json({ message: 'Error interno' }, { status: 500 });
    }
}
