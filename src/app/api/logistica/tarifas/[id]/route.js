import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { logApiError } from '@/lib/logger';
import { logUpdate } from '@/lib/audit';

const tarifaUpdateSchema = z.object({
    parcel: z.coerce.number().nonnegative().optional().nullable(),
    miniQuarter: z.coerce.number().nonnegative().optional().nullable(),
    quarter: z.coerce.number().nonnegative().optional().nullable(),
    miniLight: z.coerce.number().nonnegative().optional().nullable(),
    half: z.coerce.number().nonnegative().optional().nullable(),
    light: z.coerce.number().nonnegative().optional().nullable(),
    megaLight: z.coerce.number().nonnegative().optional().nullable(),
    full: z.coerce.number().nonnegative().optional().nullable(),
    megaFull: z.coerce.number().nonnegative().optional().nullable(),
});

export async function PUT(request, { params }) {
    try {
        const { id } = await params;
        const body = await request.json();
        const parsed = tarifaUpdateSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ message: parsed.error.issues[0].message }, { status: 400 });
        }

        const oldTarifa = await db.tarifaTransporte.findUnique({
            where: { id },
            select: {
                parcel: true, miniQuarter: true, quarter: true,
                miniLight: true, half: true, light: true,
                megaLight: true, full: true, megaFull: true
            }
        });

        const updated = await db.tarifaTransporte.update({
            where: { id },
            data: parsed.data,
        });

        if (oldTarifa) {
            await logUpdate('TarifaTransporte', id, oldTarifa, parsed.data, 'Admin');
        }

        return NextResponse.json(updated);
    } catch (error) {
        logApiError(error, 'Error updating tarifa');
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}
