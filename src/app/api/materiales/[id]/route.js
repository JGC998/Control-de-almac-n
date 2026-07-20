import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { handlePrismaError } from '@/lib/manejadores-api';
import { logDelete, logUpdate } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const materialUpdateSchema = z.object({
  nombre: z.string().min(1, 'Nombre requerido').max(200),
});

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = materialUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues[0].message }, { status: 400 });
    }
    const { nombre } = parsed.data;
    const anterior = await db.material.findUnique({ where: { id } });
    const updatedItem = await db.material.update({ where: { id }, data: { nombre } });
    logUpdate('Material', id, anterior, updatedItem, 'Admin').catch(() => {});
    return NextResponse.json(updatedItem);
  } catch (error) {
    return handlePrismaError(error, {
      notFound: 'Material no encontrado',
      conflict: 'El material ya existe',
    });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    let deleted;
    await db.$transaction(async (tx) => {
      const mat = await tx.material.findUnique({ where: { id } });
      if (mat) {
        deleted = mat;
        await tx.tarifaMaterial.deleteMany({ where: { material: mat.nombre } });
      }
      await tx.material.delete({ where: { id } });
    });
    if (deleted) logDelete('Material', id, deleted, 'Admin').catch(() => {});
    return NextResponse.json({ message: 'Material eliminado' });
  } catch (error) {
    return handlePrismaError(error, {
      notFound: 'Material no encontrado',
      hasRelated: 'No se puede eliminar: el material tiene productos o tarifas asociadas.',
    });
  }
}
