import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/productos - Obtiene todos los productos
export async function GET() {
  try {
    const productos = await db.producto.findMany({
      // "include" hace un JOIN para traer los nombres del fabricante y material
      include: {
        fabricante: true,
        material: true,
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
    
    // El frontend (gestion/productos/page.js) nos envía nombres,
    // pero la BD necesita los IDs de las relaciones.
    // Los buscamos primero.
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
        fabricanteId: fabricante.id, // Usamos el ID encontrado
        materialId: material.id,     // Usamos el ID encontrado
      },
    });

    return NextResponse.json(nuevoProducto, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error al crear el producto' }, { status: 500 });
  }
}