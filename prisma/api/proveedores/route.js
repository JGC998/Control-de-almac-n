import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/proveedores
export async function GET() {
  try {
    const proveedores = await db.proveedor.findMany({
      orderBy: { nombre: 'asc' },
    });
    return NextResponse.json(proveedores);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error al obtener proveedores' }, { status: 500 });
  }
}

// POST /api/proveedores
export async function POST(request) {
  try {
    const data = await request.json();
    const { nombre, email, telefono, direccion } = data;

    if (!nombre) {
      return NextResponse.json({ message: 'El nombre es requerido' }, { status: 400 });
    }

    const nuevoProveedor = await db.proveedor.create({
      data: {
        nombre,
        email,
        telefono,
        direccion,
      },
    });
    return NextResponse.json(nuevoProveedor, { status: 201 });
  } catch (error) {
    if (error.code === 'P2002') { // Error de unicidad
      return NextResponse.json({ message: 'Ya existe un proveedor con este nombre' }, { status: 409 });
    }
    console.error(error);
    return NextResponse.json({ message: 'Error al crear proveedor' }, { status: 500 });
  }
}
