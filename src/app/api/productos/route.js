import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';

// GET /api/productos - Obtiene todos los productos
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const nombre = searchParams.get('nombre');

    const whereClause = {};
    if (nombre) {
      whereClause.nombre = { contains: nombre, mode: 'insensitive' };
    }

    const productos = await db.producto.findMany({
      where: whereClause,
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

    // Validación básica
    if (!data.nombre || !data.precio) {
      return NextResponse.json({ message: 'Nombre y precio son requeridos' }, { status: 400 });
    }

    const nuevoProducto = await db.producto.create({
      data: {
        nombre: data.nombre,
        descripcion: data.descripcion || null,
        precio: parseFloat(data.precio),
        stock: parseInt(data.stock) || 0,
        categoria: data.categoria || null,
      },
    });

    revalidatePath('/gestion/productos');
    return NextResponse.json(nuevoProducto, { status: 201 });
  } catch (error) {
    console.error('Error al crear el producto:', error);
    return NextResponse.json({ message: 'Error al crear el producto' }, { status: 500 });
  }
}