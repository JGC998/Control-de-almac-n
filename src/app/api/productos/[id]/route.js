import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';

// GET /api/productos/[id] - Obtiene un producto por su ID
export async function GET(request, { params: paramsPromise }) {
  try {
    const { id } = await paramsPromise;
    const productoId = parseInt(id);

    if (isNaN(productoId)) {
      return NextResponse.json({ message: 'ID inválido' }, { status: 400 });
    }

    const producto = await db.producto.findUnique({
      where: { id: productoId },
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
    const productoId = parseInt(id);
    if (isNaN(productoId)) {
      return NextResponse.json({ message: 'ID inválido' }, { status: 400 });
    }

    const data = await request.json();

    const updateData = {};
    if (data.nombre !== undefined) updateData.nombre = data.nombre;
    if (data.descripcion !== undefined) updateData.descripcion = data.descripcion;
    if (data.precio !== undefined) updateData.precio = parseFloat(data.precio);
    if (data.stock !== undefined) updateData.stock = parseInt(data.stock);
    if (data.categoria !== undefined) updateData.categoria = data.categoria;

    const updatedProducto = await db.producto.update({
      where: { id: productoId },
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
    const productoId = parseInt(id);
    if (isNaN(productoId)) {
      return NextResponse.json({ message: 'ID inválido' }, { status: 400 });
    }

    await db.producto.delete({
      where: { id: productoId },
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