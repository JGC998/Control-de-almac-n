import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { handlePrismaError } from '@/lib/manejadores-api';

// GET /api/tarifas-material-opciones
// Devuelve los valores únicos de material, espesor y color de TarifaMaterial
// para construir los selectores en cascada del formulario de producto.
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const material = searchParams.get('material');
    const espesor  = searchParams.get('espesor');

    // Solo material → devuelve lista de materiales únicos
    if (!material) {
      const rows = await db.tarifaMaterial.findMany({
        select: { material: true },
        distinct: ['material'],
        orderBy: { material: 'asc' },
      });
      return NextResponse.json({ materiales: rows.map(r => r.material) });
    }

    // Material + sin espesor → devuelve espesores para ese material
    if (!espesor) {
      const rows = await db.tarifaMaterial.findMany({
        where: { material },
        select: { espesor: true },
        distinct: ['espesor'],
        orderBy: { espesor: 'asc' },
      });
      return NextResponse.json({ espesores: rows.map(r => r.espesor) });
    }

    // Material + espesor → devuelve colores y la tarifa completa
    const tarifas = await db.tarifaMaterial.findMany({
      where: { material, espesor: parseFloat(espesor) },
      orderBy: { color: 'asc' },
    });

    const colores = [...new Set(tarifas.map(t => t.color).filter(Boolean))];
    return NextResponse.json({ tarifas, colores });
  } catch (error) {
    return handlePrismaError(error);
  }
}
