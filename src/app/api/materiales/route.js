

import { NextResponse } from 'next/server';
import { logApiError } from '@/lib/logger';
import { db } from '@/lib/db'; 
import { crearManejadoresCRUD } from '@/lib/manejadores-api';
import { revalidatePath } from 'next/cache';

const { GET, POST } = crearManejadoresCRUD('material', {
  findMany: {
    orderBy: { nombre: 'asc' },
  }
}, '/configuracion');

export { GET, POST };

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

