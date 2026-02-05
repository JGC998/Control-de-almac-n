import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/tacos - Obtiene todos los tacos activos
export async function GET() {
    try {
        const tacos = await db.taco.findMany({
            where: { activo: true },
            orderBy: [
                { tipo: 'asc' },
                { altura: 'asc' },
            ],
        });

        return NextResponse.json(tacos);
    } catch (error) {
        console.error('Error al obtener tacos:', error);
        return NextResponse.json(
            { message: 'Error al obtener tacos' },
            { status: 500 }
        );
    }
}

// POST /api/tacos - Actualiza precios de tacos en lote (admin)
export async function POST(request) {
    try {
        const data = await request.json();
        const { updates } = data;

        // Validación
        if (!updates || !Array.isArray(updates)) {
            return NextResponse.json(
                { message: 'Se requiere un array de updates con formato: [{ id, precioMetro }]' },
                { status: 400 }
            );
        }

        // Actualizar cada taco
        const results = await Promise.all(
            updates.map(async ({ id, precioMetro }) => {
                if (!id || precioMetro === undefined || precioMetro < 0) {
                    throw new Error(`Datos inválidos para taco ${id}`);
                }

                return await db.taco.update({
                    where: { id },
                    data: { precioMetro }
                });
            })
        );

        return NextResponse.json({
            message: `${results.length} tacos actualizados correctamente`,
            updated: results
        }, { status: 200 });
    } catch (error) {
        console.error('Error al actualizar tacos:', error);
        return NextResponse.json(
            { message: 'Error interno al guardar los tacos: ' + error.message },
            { status: 500 }
        );
    }
}
