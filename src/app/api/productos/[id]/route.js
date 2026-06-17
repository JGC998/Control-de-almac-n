import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { handlePrismaError } from '@/lib/manejadores-api';
import { logApiError } from '@/lib/logger';

const productoUpdateSchema = z.object({
  nombre:               z.string().min(1).max(200).optional(),
  precioUnitario:       z.number().nonnegative().max(1_000_000).optional(),
  costoUnitario:        z.number().nonnegative().max(1_000_000).optional(),
  pesoUnitario:         z.number().nonnegative().optional(),
  espesor:              z.number().nonnegative().optional().nullable(),
  largo:                z.number().nonnegative().optional().nullable(),
  ancho:                z.number().nonnegative().optional().nullable(),
  color:                z.string().max(100).optional().nullable(),
  referenciaFabricante: z.string().max(200).optional().nullable(),
  tieneTroquel:         z.boolean().optional(),
  fabricanteId:         z.string().optional().nullable(),
  materialId:           z.string().optional().nullable(),
});

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const producto = await db.producto.findUnique({
      where: { id },
      include: {
        fabricante: { select: { nombre: true } },
        material: { select: { nombre: true } },
      },
    });
    if (!producto) return NextResponse.json({ message: 'Producto no encontrado' }, { status: 404 });
    // SEC-09: excluir costoUnitario de la respuesta
    const { costoUnitario: _omit, ...productoPublico } = producto;
    return NextResponse.json(productoPublico);
  } catch (error) {
    return handlePrismaError(error);
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = productoUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0].message },
        { status: 400 }
      );
    }
    const updatedProducto = await db.producto.update({ where: { id }, data: parsed.data });
    revalidatePath('/gestion/productos');
    revalidatePath(`/gestion/productos/${id}`);
    const { costoUnitario: _omit, ...productoPublico } = updatedProducto;
    return NextResponse.json(productoPublico);
  } catch (error) {
    logApiError(error, 'PUT /api/productos/[id]');
    return handlePrismaError(error, { notFound: 'Producto no encontrado' });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await db.producto.delete({ where: { id } });
    revalidatePath('/gestion/productos');
    return NextResponse.json({ message: 'Producto eliminado' });
  } catch (error) {
    return handlePrismaError(error, {
      notFound: 'Producto no encontrado',
      hasRelated: 'No se puede eliminar: el producto está en pedidos o presupuestos.',
    });
  }
}
