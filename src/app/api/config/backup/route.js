import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        // 1. Recopilar todas las tablas de configuración
        const [
            config,
            reglasMargen,
            tarifasMaterial,
            tarifasTransporte,
            configPaletizado,
            sequence
        ] = await Promise.all([
            db.config.findMany(),
            db.reglaMargen.findMany(),
            db.tarifaMaterial.findMany(),
            db.tarifaTransporte.findMany(),
            db.configPaletizado.findMany(),
            db.sequence.findMany()
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

        return new NextResponse(JSON.stringify(backupData, null, 2), {
            headers: {
                'Content-Type': 'application/json',
                'Content-Disposition': `attachment; filename="backup-config-${new Date().toISOString().split('T')[0]}.json"`,
            },
        });

    } catch (error) {
        console.error('Error generando backup:', error);
        return NextResponse.json({ message: 'Error al generar backup' }, { status: 500 });
    }
}
