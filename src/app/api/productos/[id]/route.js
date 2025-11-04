import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/productos/[id] - Obtiene un producto por su ID
export async function GET(request, { params: paramsPromise }) {
  try {
    const { id } = await paramsPromise; // <-- CORREGIDO
    const producto = await db.producto.findUnique({
      where: { id: id },
      include: {
        fabricante: true,
        material: true,
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
    const { id } = await paramsPromise; // <-- CORREGIDO
    const data = await request.json();

    const updatedProducto = await db.producto.update({
      where: { id: id },
      data: {
        nombre: data.nombre,
        modelo: data.modelo,
        espesor: data.espesor,
        largo: data.largo,
        ancho: data.ancho,
        precioUnitario: data.precioUnitario,
        pesoUnitario: data.pesoUnitario,
      },
    });
    return NextResponse.json(updatedProducto);
  } catch (error) {
    console.error(error);
    if (error.code === 'P2025') {
      return NextResponse.json({ message: 'Producto no encontrado' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Error al actualizar producto' }, { status: 500 });
  }
}

// DELETE /api/productos/[id] - Elimina un producto
export async function DELETE(request, { params: paramsPromise }) {
  try {
    const { id } = await paramsPromise; // <-- CORREGIDO
    await db.producto.delete({
      where: { id: id },
    });
    return NextResponse.json({ message: 'Producto eliminado' }, { status: 200 });
  } catch (error) {
    console.error(error);
    if (error.code === 'P2025') {
      return NextResponse.json({ message: 'Producto no encontrado' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Error al eliminar producto' }, { status: 500 });
  }
}
