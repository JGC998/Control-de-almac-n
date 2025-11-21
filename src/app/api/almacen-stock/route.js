import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

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

// POST /api/almacen-stock?action=[entrada|salida] - Maneja ambas operaciones
export async function POST(request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const data = await request.json();

  try {
    if (action === 'salida') {
        // --- Lógica de SALIDA (Baja de Stock) ---
        const { stockId, cantidad, referencia } = data;
        const cantidadFloat = parseFloat(cantidad);

        if (!stockId || !cantidad || cantidadFloat <= 0) {
            return NextResponse.json({ message: 'Se requiere stockId, cantidad y una cantidad positiva para la salida.' }, { status: 400 });
        }

        await db.$transaction(async (tx) => {
            const stockItem = await tx.stock.findUnique({ where: { id: stockId } });
            if (!stockItem) {
                throw new Error('Item de stock no encontrado.');
            }
            
            const newMetros = stockItem.metrosDisponibles - cantidadFloat;
            if (newMetros < -0.001) { 
                throw new Error(`Stock insuficiente. Solo quedan ${stockItem.metrosDisponibles.toFixed(2)}m disponibles.`);
            }

            // 1. Crear movimiento de salida
            await tx.movimientoStock.create({
                data: {
                    tipo: "Salida",
                    cantidad: cantidadFloat,
                    referencia: referencia || `Baja Manual - ID: ${stockId}`,
                    // stockId es ahora opcional y no necesita cambios aquí
                    stockId: stockId,
                },
            });

            // 2. Actualizar o Eliminar el registro de Stock
            if (newMetros <= 0.001) { 
                // Esto disparará onDelete: SetNull en los MovimientosStock vinculados
                await tx.stock.delete({ where: { id: stockId } });
            } else {
                await tx.stock.update({
                    where: { id: stockId },
                    data: { metrosDisponibles: newMetros },
                });
            }
        });
        
        return NextResponse.json({ message: 'Salida de stock procesada correctamente.' }, { status: 200 });

    } else {
        // --- Lógica de ENTRADA (Añadir Stock Manual) ---
        
        const newStockItem = await db.stock.create({
            data: {
                material: data.material,
                espesor: data.espesor,
                metrosDisponibles: parseFloat(data.metrosDisponibles),
                proveedor: data.proveedor,
                ubicacion: data.ubicacion,
                stockMinimo: parseFloat(data.stockMinimo) || null
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
    }

  } catch (error) {
    console.error('Error en POST /api/almacen-stock:', error);
    return NextResponse.json({ message: error.message || 'Error interno al crear/procesar stock.' }, { status: 500 });
  }
}
