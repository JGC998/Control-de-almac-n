import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { logApiError } from '@/lib/logger';

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

        const toDecimal = v => (v != null && v !== '' && !isNaN(parseFloat(v)) ? parseFloat(v) : null);

        const updatedData = {
            parcel: toDecimal(parcel),
            miniQuarter: toDecimal(miniQuarter),
            quarter: toDecimal(quarter),
            miniLight: toDecimal(miniLight),
            half: toDecimal(half),
            light: toDecimal(light),
            megaLight: toDecimal(megaLight),
            full: toDecimal(full),
            megaFull: toDecimal(megaFull),
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
        logApiError(error, 'Error updating tarifa');
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}
