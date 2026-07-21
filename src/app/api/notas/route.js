import { NextResponse } from 'next/server';
import { logApiError } from '@/lib/logger';
import { db } from '@/lib/db';
import { z } from 'zod';
import { checkRateLimit, getClientIp } from '@/lib/rateLimiter';

const notaSchema = z.object({ content: z.string().min(1, 'El contenido es requerido').max(2000, 'Máximo 2000 caracteres') });

export const dynamic = 'force-dynamic';

// GET /api/notas (Obtener las últimas 20 notas)
export async function GET(request) {
  const ip = getClientIp(request);
  const rl = checkRateLimit(`notas:${ip}`, 60);
  if (!rl.allowed) {
    return NextResponse.json({ message: 'Demasiadas peticiones.' }, { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } });
  }
  try {
    const notas = await db.nota.findMany({
      orderBy: { fecha: 'desc' },
      take: 20,
    });
    return NextResponse.json(notas);
  } catch (error) {
    logApiError(error, 'GET /api/notas');
    return NextResponse.json({ message: 'Error al obtener notas' }, { status: 500 });
  }
}

// POST /api/notas (Crear una nueva nota)
export async function POST(request) {
  const ip = getClientIp(request);
  const rl = checkRateLimit(`notas-post:${ip}`, 30);
  if (!rl.allowed) {
    return NextResponse.json({ message: 'Demasiadas peticiones.' }, { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } });
  }
  try {
    const parsed = notaSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues[0].message }, { status: 400 });
    }
    const newNote = await db.nota.create({ data: { content: parsed.data.content } });
    return NextResponse.json(newNote, { status: 201 });
  } catch (error) {
    logApiError(error, 'POST /api/notas');
    return NextResponse.json({ message: 'Error al crear la nota' }, { status: 500 });
  }
}

