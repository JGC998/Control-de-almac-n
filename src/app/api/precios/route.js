import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/precios
export async function GET() {
  try {
    const tarifas = await db.tarifaMaterial.findMany({
      orderBy: [{ material: 'asc' }, { espesor: 'asc' }],
    });
    return NextResponse.json(tarifas);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error al obtener tarifas' }, { status: 500 });
  }
}

// PUT /api/precios (Actualización masiva)
export async function PUT(request) {
  try {
    const data = await request.json();
    if (!Array.isArray(data)) {
      return NextResponse.json({ message: 'Se esperaba un array de tarifas' }, { status: 400 });
    }

    const operations = data.map(tarifa => 
      db.tarifaMaterial.upsert({
        where: { id: tarifa.id }, // Asume que el ID se envía desde el frontend
        update: {
          precio: parseFloat(tarifa.precio) || 0,
          peso: parseFloat(tarifa.peso) || 0,
        },
        create: { // Fallback si se añade una nueva fila
          material: tarifa.material,
          espesor: String(tarifa.espesor),
          precio: parseFloat(tarifa.precio) || 0,
          peso: parseFloat(tarifa.peso) || 0,
        }
      })
    );
    
    await db.$transaction(operations);
    
    return NextResponse.json({ message: 'Tarifas actualizadas' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error al actualizar tarifas' }, { status: 500 });
  }
}
