import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/stock-info/available-meters?material=X&espesor=Y
// Returns the total sum of metrosDisponibles for a specific material and espesor.
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const material = searchParams.get('material');
        const espesor = parseFloat(searchParams.get('espesor'));

        if (!material || isNaN(espesor)) {
            return NextResponse.json({ totalMetros: 0 }, { status: 400 });
        }

        const result = await db.stock.aggregate({
            _sum: {
                metrosDisponibles: true,
            },
            where: {
                material: material,
                espesor: espesor,
            },
        });

        const totalMetros = result._sum.metrosDisponibles || 0;

        return NextResponse.json({ totalMetros });
    } catch (error) {
        console.error('Error al obtener stock disponible:', error);
        return NextResponse.json({ message: 'Error interno al obtener stock' }, { status: 500 });
    }
}
