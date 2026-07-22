import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logApiError } from '@/lib/logger';

const CONFIG_KEY = 'nomenclatura';

export const DEFAULT_NOMENCLATURA = {
  familiaChars:    3,
  subfamiliaChars: 4,
  fabricanteMode:  'iniciales',
  fabricanteChars: 3,
  acabadoChars:    3,
  familiaAliases:  {},
};

export async function GET() {
  try {
    const row = await db.config.findUnique({ where: { key: CONFIG_KEY } });
    if (!row) return NextResponse.json(DEFAULT_NOMENCLATURA);
    return NextResponse.json({ ...DEFAULT_NOMENCLATURA, ...JSON.parse(row.value) });
  } catch (error) {
    logApiError(error, 'GET /api/configuracion/nomenclatura');
    return NextResponse.json({ message: 'Error al obtener nomenclatura' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const {
      familiaChars    = 3,
      subfamiliaChars = 4,
      fabricanteMode  = 'iniciales',
      fabricanteChars = 3,
      acabadoChars    = 3,
      familiaAliases  = {},
    } = body;

    if (!['iniciales', 'primeros'].includes(fabricanteMode)) {
      return NextResponse.json({ message: 'fabricanteMode inválido' }, { status: 400 });
    }

    const value = JSON.stringify({
      familiaChars:    Math.max(1, Math.min(8, parseInt(familiaChars) || 3)),
      subfamiliaChars: Math.max(1, Math.min(8, parseInt(subfamiliaChars) || 4)),
      fabricanteMode,
      fabricanteChars: Math.max(1, Math.min(10, parseInt(fabricanteChars) || 3)),
      acabadoChars:    Math.max(1, Math.min(8, parseInt(acabadoChars) || 3)),
      familiaAliases:  Object.fromEntries(
        Object.entries(familiaAliases)
          .map(([k, v]) => [k, String(v).trim().toUpperCase().slice(0, 8)])
          .filter(([, v]) => v.length > 0)
      ),
    });

    await db.config.upsert({
      where:  { key: CONFIG_KEY },
      update: { value },
      create: { key: CONFIG_KEY, value },
    });

    db.auditLog.create({
      data: { action: 'CONFIG_UPDATE', entity: 'Config', entityId: CONFIG_KEY, details: value },
    }).catch(() => {});

    return NextResponse.json({ message: 'Nomenclatura guardada' });
  } catch (error) {
    logApiError(error, 'PUT /api/configuracion/nomenclatura');
    return NextResponse.json({ message: 'Error al guardar nomenclatura' }, { status: 500 });
  }
}
