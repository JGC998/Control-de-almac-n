import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/pricing/especiales
export async function GET() {
  try {
    const data = await db.precioEspecial.findMany({ include: { cliente: true, producto: true } });
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ message: 'Error al obtener precios especiales' }, { status: 500 });
  }
}

// POST /api/pricing/especiales
export async function POST(request) {
  try {
    const data = await request.json();
    const nuevaRegla = await db.precioEspecial.create({
      data: {
        descripcion: data.descripcion,
        precio: parseFloat(data.precio),
        clienteId: data.clienteId,
        productoId: data.productoId,
      },
    });
    return NextResponse.json(nuevaRegla, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: 'Error al crear precio especial' }, { status: 500 });
  }
}
