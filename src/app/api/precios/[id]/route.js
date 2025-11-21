import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// PUT /api/precios/[id]
export async function PUT(request, { params: paramsPromise }) {
  try {
    const { id } = await paramsPromise;
    const data = await request.json();

    // 1. Verificar que el material existe (buscamos por nombre)
    const material = await db.material.findUnique({
      where: { nombre: data.material },
    });

    if (!material) {
      return NextResponse.json({ message: 'Material no encontrado' }, { status: 400 });
    }

    // 2. Actualizar la tarifa
    // CORRECCIÓN: Usamos 'material' (String) en lugar de 'materialId'
    const updatedItem = await db.tarifaMaterial.update({
      where: { id: id },
      data: { 
        material: material.nombre, // <--- CAMBIO AQUÍ: Usamos el nombre, no el ID
        espesor: parseFloat(data.espesor),
        precio: parseFloat(data.precio),
        peso: parseFloat(data.peso),
      },
    });

    return NextResponse.json(updatedItem);

  } catch (error) {
    if (error.code === 'P2025') {
      return NextResponse.json({ message: 'Tarifa no encontrada' }, { status: 404 });
    }
    if (error.code === 'P2002') {
        return NextResponse.json({ message: 'Ya existe una tarifa para ese Material y Espesor.' }, { status: 409 });
    }
    console.error('Error al actualizar tarifa:', error);
    return NextResponse.json({ message: 'Error al actualizar tarifa' }, { status: 500 });
  }
}

// DELETE /api/precios/[id]
export async function DELETE(request, { params: paramsPromise }) {
  try {
    const { id } = await paramsPromise;
    await db.tarifaMaterial.delete({
      where: { id: id },
    });
    return NextResponse.json({ message: 'Tarifa eliminada' }, { status: 200 });
  } catch (error) {
    if (error.code === 'P2025') {
      return NextResponse.json({ message: 'Tarifa no encontrada' }, { status: 404 });
    }
    console.error('Error al eliminar tarifa:', error);
    return NextResponse.json({ message: 'Error al eliminar tarifa' }, { status: 500 });
  }
}