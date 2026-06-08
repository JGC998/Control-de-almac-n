import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logApiError } from '@/lib/logger';
import { checkRateLimit } from '@/lib/rateLimiter';

export const dynamic = 'force-dynamic';

const precioEspecialSchema = z.object({
  descripcion: z.string().min(1).max(200),
  precio:      z.number().positive().max(100_000),
  clienteId:   z.string().uuid().optional().nullable(),
  productoId:  z.string().uuid().optional().nullable(),
});

// GET /api/pricing/especiales
export async function GET() {
  try {
    const data = await db.precioEspecial.findMany({ include: { cliente: true, producto: true } });
    return NextResponse.json(data);
  } catch (error) {
    logApiError(error, 'GET /api/pricing/especiales');
    return NextResponse.json({ message: 'Error al obtener precios especiales' }, { status: 500 });
  }
}

// POST /api/pricing/especiales
export async function POST(request) {
  try {
    // SEC-06: rate limit — 30 escrituras/min por IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
    const rl = checkRateLimit(`pricing-especiales:${ip}`, 30);
    if (!rl.allowed) {
      return NextResponse.json(
        { message: 'Demasiadas peticiones' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
      );
    }

    const body = await request.json();
    const parsed = precioEspecialSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', errors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const nuevaRegla = await db.precioEspecial.create({ data: parsed.data });
    return NextResponse.json(nuevaRegla, { status: 201 });
  } catch (error) {
    logApiError(error, 'POST /api/pricing/especiales');
    return NextResponse.json({ message: 'Error al crear precio especial' }, { status: 500 });
  }
}
