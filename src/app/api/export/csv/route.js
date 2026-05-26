import { NextResponse } from 'next/server';
import { logApiError } from '@/lib/logger';
import { db } from '@/lib/db';
import { generarCSV, CSV_DEFINITIONS } from '@/lib/export';
import { checkRateLimit } from '@/lib/rateLimiter';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        // SEC — Rate limit: 10 exportaciones/min por IP
        const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
          || request.headers.get('x-real-ip')
          || '127.0.0.1';
        const rl = checkRateLimit(ip, 10);
        if (!rl.allowed) {
          return NextResponse.json(
            { message: 'Demasiadas peticiones. Espera un momento.' },
            { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
          );
        }

        const { searchParams } = new URL(request.url);
        const model = searchParams.get('model');

        if (!model || !CSV_DEFINITIONS[model]) {
            return NextResponse.json({ message: 'Modelo no válido o no especificado' }, { status: 400 });
        }

        const MAX_ROWS = 5000;
        let data = [];
        if (model === 'tarifaLogistica') {
            data = await db.tarifaTransporte.findMany({ take: MAX_ROWS });
        } else if (model === 'producto') {
            data = await db.producto.findMany({ take: MAX_ROWS });
        } else if (model === 'cliente') {
            data = await db.cliente.findMany({ take: MAX_ROWS });
        }

        const csvContent = generarCSV(data, CSV_DEFINITIONS[model]);

        return new NextResponse(csvContent, {
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="${model}-${new Date().toISOString().split('T')[0]}.csv"`,
            },
        });

    } catch (error) {
        logApiError(error, 'Error exportando CSV:');
        return NextResponse.json({ message: 'Error interno' }, { status: 500 });
    }
}
