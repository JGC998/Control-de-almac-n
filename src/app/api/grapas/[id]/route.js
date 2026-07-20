import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { handlePrismaError } from '@/lib/manejadores-api';

const grapaPatchSchema = z.object({
  nombre: z.string().min(1).max(200).optional(),
  fabricante: z.string().max(200).optional().nullable(),
  descripcion: z.string().max(500).optional().nullable(),
  precioMetro: z.coerce.number().nonnegative().optional(),
});

export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = grapaPatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues[0].message }, { status: 400 });
    }
    const { nombre, fabricante, descripcion, precioMetro } = parsed.data;
    const updated = await db.grapa.update({
      where: { id: parseInt(id) },
      data: {
        ...(nombre !== undefined && { nombre: nombre.trim() }),
        ...(fabricante !== undefined && { fabricante: fabricante?.trim() || null }),
        ...(descripcion !== undefined && { descripcion: descripcion?.trim() || null }),
        ...(precioMetro !== undefined && { precioMetro }),
      },
    });
    return NextResponse.json(updated);
  } catch (error) {
    return handlePrismaError(error, { notFound: 'Grapa no encontrada' });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await db.grapa.delete({ where: { id: parseInt(id) } });
    return NextResponse.json({ message: 'Grapa eliminada correctamente' });
  } catch (error) {
    return handlePrismaError(error, { notFound: 'Grapa no encontrada' });
  }
}
