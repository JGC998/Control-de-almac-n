import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const { metrajeMinimo, precioBase, peso, ancho } = await request.json();

    const tarifa = await db.tarifaRollo.update({
      where: { id },
      data: {
        ...(metrajeMinimo !== undefined && { metrajeMinimo: parseFloat(metrajeMinimo) }),
        ...(precioBase !== undefined && { precioBase: parseFloat(precioBase) }),
        ...(peso !== undefined && { peso: parseFloat(peso) }),
        ...(ancho !== undefined && { ancho: ancho ? parseFloat(ancho) : null }),
      },
    });
    return NextResponse.json(tarifa);
  } catch (error) {
    if (error.code === 'P2025') {
      return NextResponse.json({ message: 'Tarifa no encontrada' }, { status: 404 });
    }
    console.error('Error al actualizar tarifa de rollo:', error);
    return NextResponse.json({ message: 'Error al actualizar la tarifa' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await db.tarifaRollo.delete({ where: { id } });
    return NextResponse.json({ message: 'Tarifa eliminada correctamente' });
  } catch (error) {
    if (error.code === 'P2025') {
      return NextResponse.json({ message: 'Tarifa no encontrada' }, { status: 404 });
    }
    console.error('Error al eliminar tarifa de rollo:', error);
    return NextResponse.json({ message: 'Error al eliminar la tarifa' }, { status: 500 });
  }
}
