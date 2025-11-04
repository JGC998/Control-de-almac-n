import { NextResponse } from 'next/server';
import { db } from '@/lib/db'; // Importamos el cliente de BD

// GET /api/clientes - Obtiene todos los clientes
export async function GET() {
  try {
    const clientes = await db.cliente.findMany();
    return NextResponse.json(clientes);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error al obtener clientes' }, { status: 500 });
  }
}

// POST /api/clientes - Crea un nuevo cliente
export async function POST(request) {
  try {
    const data = await request.json();

    const nuevoCliente = await db.cliente.create({
      data: {
        nombre: data.nombre,
        email: data.email,
        direccion: data.direccion,
        telefono: data.telefono,
      },
    });
    
    return NextResponse.json(nuevoCliente, { status: 201 });
  } catch (error) {
    console.error(error);
    // P2002 es el código de error de Prisma para "violación de unicidad"
    if (error.code === 'P2002') {
        return NextResponse.json({ message: 'Ya existe un cliente con este nombre' }, { status: 409 });
    }
    return NextResponse.json({ message: 'Error al crear el cliente' }, { status: 500 });
  }
}
