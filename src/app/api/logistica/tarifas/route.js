import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { logApiError } from '@/lib/logger';

export async function GET() {
    try {
        const tarifas = await db.tarifaTransporte.findMany({
            orderBy: { provincia: 'asc' },
            take: 500,
        });
        return NextResponse.json(tarifas);
    } catch (error) {
        logApiError(error, 'Error fetching tarifas:');
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}
