

import { NextResponse } from 'next/server';
import { logApiError } from '@/lib/logger';
import { db } from '@/lib/db'; 
import { crearManejadoresCRUD } from '@/lib/manejadores-api';
import { revalidatePath } from 'next/cache';

// GET devuelve materiales con conteos de productos y tarifas m²
export async function GET() {
  try {
    const [materiales, tarifasCounts] = await Promise.all([
      db.material.findMany({
        orderBy: { nombre: 'asc' },
        include: { _count: { select: { productos: true } } },
      }),
      db.tarifaMaterial.groupBy({
        by: ['material'],
        _count: { id: true },
      }),
    ]);
    const tarifasMap = Object.fromEntries(tarifasCounts.map(t => [t.material, t._count.id]));
    return NextResponse.json(
      materiales.map(m => ({
        id: m.id,
        nombre: m.nombre,
        numProductos: m._count.productos,
        numTarifas:   tarifasMap[m.nombre] ?? 0,
      }))
    );
  } catch (error) {
    logApiError(error, 'GET /api/materiales');
    return NextResponse.json({ error: 'Error al cargar materiales' }, { status: 500 });
  }
}

const { POST } = crearManejadoresCRUD('material', {
  findMany: { orderBy: { nombre: 'asc' } },
}, '/configuracion');

export { POST };

export async function PUT(request) {
  try {
    const { id, ...data } = await request.json();
    if (!id || !data.nombre) {
      return NextResponse.json({ error: 'ID y Nombre del Material son requeridos para actualizar.' }, { status: 400 });
    }
    
    // El ID es un string (UUID)
    const updatedMaterial = await db.material.update({
      where: { id: id },
      data: {
        nombre: data.nombre,
      },
    });
    revalidatePath('/configuracion'); // Invalidate cache after update
    return NextResponse.json(updatedMaterial);
  } catch (error) {
    logApiError(error, 'Error updating material:');
    if (error.code === 'P2002') {
        return NextResponse.json({ error: 'Ya existe un material con ese nombre.' }, { status: 409 });
    }
    if (error.code === 'P2025') {
        return NextResponse.json({ error: 'Material no encontrado.' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Error al actualizar el material.' }, { status: 500 });
  }
}

