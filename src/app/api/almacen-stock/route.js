import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/almacen-stock - Obtiene todo el stock
export async function GET() {
  try {
    const stockItems = await db.stock.findMany({
      orderBy: { fechaEntrada: 'desc' },
    });
    return NextResponse.json(stockItems);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error al obtener stock' }, { status: 500 });
  }
}

// POST /api/almacen-stock - Añade un item de stock manualmente
export async function POST(request) {
  try {
    const data = await request.json();

    const newStockItem = await db.stock.create({
      data: {
        material: data.material,
        espesor: data.espesor,
        metrosDisponibles: parseFloat(data.metrosDisponibles),
        proveedor: data.proveedor,
        ubicacion: data.ubicacion,
      },
    });

    // Crear movimiento de entrada
    await db.movimientoStock.create({
        data: {
            tipo: "Entrada Manual",
            cantidad: parseFloat(data.metrosDisponibles),
            referencia: `Stock ID: ${newStockItem.id}`,
            stockId: newStockItem.id
        }
    });

    return NextResponse.json(newStockItem, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error al crear item de stock' }, { status: 500 });
  }
}
