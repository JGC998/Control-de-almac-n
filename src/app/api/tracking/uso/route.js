import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logApiError } from '@/lib/logger';

const CUOTA = 10;

function mesActual() {
  return new Date().toISOString().slice(0, 7); // "2026-06"
}

function configKey(mes) {
  return `ship24_trackers_${mes}`;
}

function resetDate(mes) {
  const [year, month] = mes.split('-').map(Number);
  const next = month === 12
    ? new Date(year + 1, 0, 1)
    : new Date(year, month, 1);
  return next.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
}

// GET /api/tracking/uso — devuelve el consumo del mes actual
export async function GET() {
  try {
    const mes = mesActual();
    const row = await db.config.findUnique({ where: { key: configKey(mes) } });
    const uso = parseInt(row?.value || '0', 10);
    return NextResponse.json({ uso, cuota: CUOTA, mes, reset: resetDate(mes) });
  } catch (error) {
    logApiError(error, 'GET /api/tracking/uso');
    return NextResponse.json({ uso: 0, cuota: CUOTA }, { status: 500 });
  }
}

// PUT /api/tracking/uso — corrección manual del contador
export async function PUT(request) {
  try {
    const { uso } = await request.json();
    const valor = Math.max(0, Math.min(CUOTA, parseInt(uso, 10) || 0));
    const mes = mesActual();
    await db.config.upsert({
      where: { key: configKey(mes) },
      update: { value: String(valor) },
      create: { key: configKey(mes), value: String(valor) },
    });
    return NextResponse.json({ uso: valor, cuota: CUOTA, mes, reset: resetDate(mes) });
  } catch (error) {
    logApiError(error, 'PUT /api/tracking/uso');
    return NextResponse.json({ message: 'Error al actualizar' }, { status: 500 });
  }
}
