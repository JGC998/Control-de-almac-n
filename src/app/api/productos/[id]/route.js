import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/productos/[id] - Obtiene un producto por su ID
export async function GET(request, { params: paramsPromise }) {
  try {
    const { id } = await paramsPromise; 
    const producto = await db.producto.findUnique({
      where: { id: id },
      include: {
        fabricante: true,
        material: true,
        cliente: true, // <-- NUEVO
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

    // Necesitamos los IDs de las relaciones, no los nombres
    const fabricante = await db.fabricante.findUnique({
      where: { nombre: data.fabricante },
    });
    const material = await db.material.findUnique({
      where: { nombre: data.material },
    });

    if (!fabricante) {
      return NextResponse.json({ message: `Fabricante "${data.fabricante}" no encontrado.` }, { status: 400 });
    }
    if (!material) {
      return NextResponse.json({ message: `Material "${data.material}" no encontrado.` }, { status: 400 });
    }

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
        fabricanteId: fabricante.id,
        materialId: material.id,
        clienteId: data.clienteId || null, // <-- NUEVO
        tieneTroquel: data.tieneTroquel || false, // <-- NUEVO
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
    const { id } = await paramsPromise; 
    await db.producto.delete({
      where: { id: id },
    });
    return NextResponse.json({ message: 'Producto eliminado' }, { status: 200 });
  } catch (error) {
    console.error(error);
    if (error.code === 'P2025') {
      return NextResponse.json({ message: 'Producto no encontrado' }, { status: 404 });
    }
    // Error de clave foránea (si el producto está en un pedido)
    if (error.code === 'P2003' || error.code === 'P2014') {
       return NextResponse.json({ message: 'Error: El producto está siendo usado en pedidos o presupuestos y no se puede eliminar.' }, { status: 409 });
    }
    return NextResponse.json({ message: 'Error al eliminar producto' }, { status: 500 });
  }
}
