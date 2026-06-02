import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { handlePrismaError } from '@/lib/manejadores-api';
import { z } from 'zod';

const mermaSchema = z.object({
  mermaGrapaPct: z.coerce.number().min(0, 'No puede ser negativo').max(100, 'No puede superar el 100%'),
});

export async function PUT(request) {
  try {
    const body = await request.json();
    const parsed = mermaSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues[0].message }, { status: 400 });
    }
    await db.config.upsert({
      where: { key: 'mermaGrapaPct' },
      update: { value: String(parsed.data.mermaGrapaPct) },
      create: { key: 'mermaGrapaPct', value: String(parsed.data.mermaGrapaPct) },
    });
    return NextResponse.json({ mermaGrapaPct: parsed.data.mermaGrapaPct });
  } catch (error) {
    return handlePrismaError(error);
  }
}
