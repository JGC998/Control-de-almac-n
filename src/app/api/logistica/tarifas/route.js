import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const tarifas = await db.tarifaTransporte.findMany({
            orderBy: { provincia: 'asc' }
        });
        return NextResponse.json(tarifas);
    } catch (error) {
        console.error('Error fetching tarifas:', error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}
