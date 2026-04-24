import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';

// GET /api/productos/[id] - Obtiene un producto por su ID
export async function GET(request, { params: paramsPromise }) {
  try {
    const { id } = await paramsPromise;

    const producto = await db.producto.findUnique({
      where: { id },
      include: {
        fabricante: { select: { nombre: true } },
        material: { select: { nombre: true } },
      },
    });

    if (!producto) {
      return NextResponse.json({ message: 'Producto no encontrado' }, { status: 404 });
    }

    return NextResponse.json(producto);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error al obtener producto' }, { status: 500 });
  }
}

// PUT /api/productos/[id] - Actualiza un producto
export async function PUT(request, { params: paramsPromise }) {
  try {
    const { id } = await paramsPromise;
    const data = await request.json();

    const updateData = {};
    if (data.nombre !== undefined) updateData.nombre = data.nombre;
    if (data.precioUnitario !== undefined) updateData.precioUnitario = parseFloat(data.precioUnitario);
    if (data.costoUnitario !== undefined) updateData.costoUnitario = parseFloat(data.costoUnitario);
    if (data.pesoUnitario !== undefined) updateData.pesoUnitario = parseFloat(data.pesoUnitario);
    if (data.espesor !== undefined) updateData.espesor = data.espesor ? parseFloat(data.espesor) : null;
    if (data.largo !== undefined) updateData.largo = data.largo ? parseFloat(data.largo) : null;
    if (data.ancho !== undefined) updateData.ancho = data.ancho ? parseFloat(data.ancho) : null;
    if (data.color !== undefined) updateData.color = data.color;
    if (data.referenciaFabricante !== undefined) updateData.referenciaFabricante = data.referenciaFabricante;
    if (data.tieneTroquel !== undefined) updateData.tieneTroquel = Boolean(data.tieneTroquel);
    if (data.fabricanteId !== undefined) updateData.fabricanteId = data.fabricanteId || null;
    if (data.materialId !== undefined) updateData.materialId = data.materialId || null;

    const updatedProducto = await db.producto.update({
      where: { id },
      data: updateData,
    });

    revalidatePath('/gestion/productos');
    revalidatePath(`/gestion/productos/${id}`);
    return NextResponse.json(updatedProducto);
  } catch (error) {
    console.error('Error al actualizar producto:', error);
    if (error.code === 'P2025') {
      return NextResponse.json({ message: 'Producto no encontrado' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Error al actualizar producto' }, { status: 500 });
  }
}

// DELETE /api/productos/[id] - Elimina un producto
export async function DELETE(request, { params: paramsPromise }) {
  try {
    const { id } = await paramsPromise;

    await db.producto.delete({
      where: { id },
    });
    revalidatePath('/gestion/productos');
    return NextResponse.json({ message: 'Producto eliminado' }, { status: 200 });
  } catch (error) {
    console.error('Error al eliminar producto:', error);
    if (error.code === 'P2025') {
      return NextResponse.json({ message: 'Producto no encontrado' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Error al eliminar producto' }, { status: 500 });
  }
}