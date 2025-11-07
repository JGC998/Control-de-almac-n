import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/precios
export async function GET() {
  try {
    const tarifas = await db.tarifaMaterial.findMany({
      include: { material: true },
      orderBy: [{ material: { nombre: 'asc' } }, { espesor: 'asc' }],
    });
    return NextResponse.json(tarifas.map(t => ({
      ...t,
      material: t.material.nombre 
    })));
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error al obtener tarifas' }, { status: 500 });
  }
}

// POST /api/precios - Crea una nueva tarifa
export async function POST(request) {
  try {
    const data = await request.json();
    
    // 1. Obtener el ID del material (el frontend envía el nombre)
    const material = await db.material.findUnique({
      where: { nombre: data.material },
    });
    if (!material) {
      return NextResponse.json({ message: 'Material no encontrado' }, { status: 400 });
    }

    const newTarifa = await db.tarifaMaterial.create({
      data: {
        materialId: material.id, // Usar el ID
        espesor: parseFloat(data.espesor),
        precio: parseFloat(data.precio),
        peso: parseFloat(data.peso),
      },
    });
    return NextResponse.json(newTarifa, { status: 201 });
  } catch (error) {
    // Devolvemos el mensaje de error completo de Prisma, incluyendo la causa.
    console.error('Error de Prisma en POST /api/precios:', error);
    return NextResponse.json({ 
        message: error.message || "Error interno del servidor",
        code: error.code || "N/A"
    }, { status: 500 });
  }
}
