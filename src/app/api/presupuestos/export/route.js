import { NextResponse } from 'next/server';
import { logApiError } from '@/lib/logger';
import { db } from '@/lib/db';
import { exportarPresupuestosExcel } from '@/lib/export';
import { checkRateLimit, getClientIp } from '@/lib/rateLimiter';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const ip = getClientIp(request);
  const rl = checkRateLimit(`export-presupuestos:${ip}`, 10);
  if (!rl.allowed) {
    return NextResponse.json({ message: 'Demasiadas peticiones' }, { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } });
  }

  try {
    // API-02: Limitado a 1000 para evitar OOM — suficiente para operativa diaria
    const presupuestos = await db.presupuesto.findMany({
      take: 1000,
      include: { cliente: { select: { id: true, nombre: true, email: true, telefono: true, direccion: true, nif: true } } },
      orderBy: { fechaCreacion: 'desc' },
    });

    const buffer = await exportarPresupuestosExcel(presupuestos);

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="presupuestos-${new Date().toISOString().split('T')[0]}.xlsx"`,
      },
    });
  } catch (error) {
    logApiError(error, 'Error exportando presupuestos:');
    return NextResponse.json({ message: 'Error al exportar' }, { status: 500 });
  }
}
