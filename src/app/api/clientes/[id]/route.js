import { NextResponse } from 'next/server';
import { db } from '@/lib/db'; // Importamos el cliente de BD

export const dynamic = 'force-dynamic';

// GET /api/clientes/[id] - Obtiene un cliente por su ID
export async function GET(request, { params: paramsPromise }) {
  try {
    const { id } = await paramsPromise; // <-- CORREGIDO
    const cliente = await db.cliente.findUnique({
      where: { id: id },
    });

    if (!cliente) {
      return NextResponse.json({ message: 'Cliente no encontrado' }, { status: 404 });
    }
    return NextResponse.json(cliente);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error al obtener cliente' }, { status: 500 });
  }
}

// PUT /api/clientes/[id] - Actualiza un cliente
export async function PUT(request, { params: paramsPromise }) {
  try {
    const { id } = await paramsPromise; // <-- CORREGIDO
    const data = await request.json();

    const updatedCliente = await db.cliente.update({
      where: { id: id },
      data: {
        nombre: data.nombre,
        email: data.email,
        direccion: data.direccion,
        telefono: data.telefono,
        tier: data.categoria, // <-- CORRECCIÓN CLAVE: Mapear 'categoria' del frontend a 'tier' de Prisma
      },
    });
    return NextResponse.json(updatedCliente);
  } catch (error) {
    console.error(error);
    if (error.code === 'P2025') { // Error de Prisma si no encuentra el registro
      return NextResponse.json({ message: 'Cliente no encontrado' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Error al actualizar cliente' }, { status: 500 });
  }
}

// DELETE /api/clientes/[id] - Elimina un cliente
export async function DELETE(request, { params: paramsPromise }) {
  try {
    const { id } = await paramsPromise; // <-- CORREGIDO
    await db.cliente.delete({
      where: { id: id },
    });
    return NextResponse.json({ message: 'Cliente eliminado' }, { status: 200 });
  } catch (error) {
    console.error(error);
    if (error.code === 'P2025') {
      return NextResponse.json({ message: 'Cliente no encontrado' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Error al eliminar cliente' }, { status: 500 });
  }
}
