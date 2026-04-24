import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

import { logUpdate } from '@/lib/audit';

// PUT: Actualizar una tarifa específica
export async function PUT(request, { params }) {
    try {
        const { id } = await params;
        const data = await request.json();

        // Obtener la tarifa anterior para el log
        const oldTarifa = await db.tarifaTransporte.findUnique({
            where: { id },
            select: {
                parcel: true, miniQuarter: true, quarter: true,
                miniLight: true, half: true, light: true,
                megaLight: true, full: true, megaFull: true
            }
        });

        // Extraer solo los campos de tipología
        const { parcel, miniQuarter, quarter, miniLight, half, light, megaLight, full, megaFull } = data;

        const updatedData = {
            parcel: parcel ? parseFloat(parcel) : null,
            miniQuarter: miniQuarter ? parseFloat(miniQuarter) : null,
            quarter: quarter ? parseFloat(quarter) : null,
            miniLight: miniLight ? parseFloat(miniLight) : null,
            half: half ? parseFloat(half) : null,
            light: light ? parseFloat(light) : null,
            megaLight: megaLight ? parseFloat(megaLight) : null,
            full: full ? parseFloat(full) : null,
            megaFull: megaFull ? parseFloat(megaFull) : null
        };

        const updated = await db.tarifaTransporte.update({
            where: { id },
            data: updatedData
        });

        // Registrar en Audit Log
        if (oldTarifa) {
            await logUpdate(
                'TarifaTransporte',
                id,
                oldTarifa,
                updatedData,
                'Admin' // TODO: Obtener usuario real cuando haya auth
            );
        }

        return NextResponse.json(updated);
    } catch (error) {
        console.error('Error updating tarifa:', error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}
