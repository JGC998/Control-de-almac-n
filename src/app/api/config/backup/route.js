import { NextResponse } from 'next/server';
import { logApiError } from '@/lib/logger';
import { db } from '@/lib/db';
import { checkRateLimit, getClientIp } from '@/lib/rateLimiter';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const ip = getClientIp(request);
        const rl = checkRateLimit(`backup:${ip}`, 5);
        if (!rl.allowed) {
          return NextResponse.json(
            { message: 'Demasiadas peticiones. Espera un momento.' },
            { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
          );
        }
        // 1. Recopilar todas las tablas de configuración
        const [
            config,
            reglasMargen,
            tarifasMaterial,
            tarifasTransporte,
            configPaletizado,
            sequence
        ] = await Promise.all([
            db.config.findMany({ take: 500 }),
            db.reglaMargen.findMany({ take: 500 }),
            db.tarifaMaterial.findMany({ take: 500 }),
            db.tarifaTransporte.findMany({ take: 500 }),
            db.configPaletizado.findMany({ take: 500 }),
            db.sequence.findMany({ take: 500 }),
        ]);

        const backupData = {
            timestamp: new Date().toISOString(),
            data: {
                config,
                reglasMargen,
                tarifasMaterial,
                tarifasTransporte,
                configPaletizado,
                sequence
            }
        };

        db.auditLog.create({
          data: { action: 'CONFIG_BACKUP_DESCARGADO', entity: 'Config', entityId: 'backup', details: JSON.stringify({ ip }) },
        }).catch(err => logApiError(err, 'AUDIT_FAIL'));

        return new NextResponse(JSON.stringify(backupData, null, 2), {
            headers: {
                'Content-Type': 'application/json',
                'Content-Disposition': `attachment; filename="backup-config-${new Date().toISOString().split('T')[0]}.json"`,
            },
        });

    } catch (error) {
        logApiError(error, 'Error generando backup:');
        return NextResponse.json({ message: 'Error al generar backup' }, { status: 500 });
    }
}
