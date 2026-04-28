import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { handlePrismaError } from '@/lib/manejadores-api';

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
    return NextResponse.json(producto);
  } catch (error) {
    return handlePrismaError(error);
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const data = await request.json();

    const updateData = {};
    if (data.nombre !== undefined)               updateData.nombre = data.nombre;
    if (data.precioUnitario !== undefined)        updateData.precioUnitario = parseFloat(data.precioUnitario);
    if (data.costoUnitario !== undefined)         updateData.costoUnitario = parseFloat(data.costoUnitario);
    if (data.pesoUnitario !== undefined)          updateData.pesoUnitario = parseFloat(data.pesoUnitario);
    if (data.espesor !== undefined)              updateData.espesor = data.espesor ? parseFloat(data.espesor) : null;
    if (data.largo !== undefined)                updateData.largo = data.largo ? parseFloat(data.largo) : null;
    if (data.ancho !== undefined)                updateData.ancho = data.ancho ? parseFloat(data.ancho) : null;
    if (data.color !== undefined)                updateData.color = data.color;
    if (data.referenciaFabricante !== undefined) updateData.referenciaFabricante = data.referenciaFabricante;
    if (data.tieneTroquel !== undefined)         updateData.tieneTroquel = Boolean(data.tieneTroquel);
    if (data.fabricanteId !== undefined)         updateData.fabricanteId = data.fabricanteId || null;
    if (data.materialId !== undefined)           updateData.materialId = data.materialId || null;

    const updatedProducto = await db.producto.update({ where: { id }, data: updateData });
    revalidatePath('/gestion/productos');
    revalidatePath(`/gestion/productos/${id}`);
    return NextResponse.json(updatedProducto);
  } catch (error) {
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
