import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/productos - Obtiene todos los productos
// AÑADIDO: Soporte para ?clienteId=...
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const clienteId = searchParams.get('clienteId');

    const whereClause = {};
    if (clienteId) {
      whereClause.clienteId = clienteId;
    }

    const productos = await db.producto.findMany({
      where: whereClause,
      include: {
        fabricante: true,
        material: true,
        cliente: true, // <-- Incluir datos del cliente
      },
      orderBy: { nombre: 'asc' },
    });
    return NextResponse.json(productos);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error al obtener productos' }, { status: 500 });
  }
}

// POST /api/productos - Crea un nuevo producto
export async function POST(request) {
  try {
    const data = await request.json();
    
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

    const nuevoProducto = await db.producto.create({
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

    return NextResponse.json(nuevoProducto, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error al crear el producto' }, { status: 500 });
  }
}
