import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache'; // 👈 Importación requerida

// GET /api/almacen-stock - Obtiene todo el stock
export async function GET() {
  try {
    // 1. Obtener todos los items de stock y todos los proveedores en paralelo
    const [stockItems, proveedores] = await Promise.all([
      db.stock.findMany({
        orderBy: [
          { material: 'asc' },
          { espesor: 'asc' }
        ],
      }),
      db.proveedor.findMany({
        select: { id: true, nombre: true },
      }),
    ]);

    // 2. Crear un mapa para búsqueda rápida de nombres de proveedor
    const proveedorMap = new Map(proveedores.map(p => [p.id, p.nombre]));

    // 3. Unir los datos
    const stockConNombres = stockItems.map(item => ({
      ...item,
      proveedorNombre: proveedorMap.get(item.proveedor) || 'N/A',
    }));

    return NextResponse.json({ stock: stockConNombres });
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
      // --- Lógica de SALIDA (Baja de Stock por Metros) ---
      const { stockId, cantidad, cantidadBobinasToDiscard, referencia } = data;

      // Soportar ambos: 'cantidad' (metros) o 'cantidadBobinasToDiscard' (bobinas)
      let metrosADescontar = parseFloat(cantidad) || 0;

      if (!stockId || (isNaN(metrosADescontar) || metrosADescontar <= 0)) {
        return NextResponse.json(
          { message: 'Se requiere stockId y una cantidad positiva de metros para la salida.' },
          { status: 400 }
        );
      }

      // Usar una transacción para asegurar la atomicidad
      await db.$transaction(async (tx) => {
        const stockItem = await tx.stock.findUnique({ where: { id: stockId } });

        if (!stockItem) {
          throw new Error('Item de stock no encontrado.');
        }

        if (metrosADescontar > stockItem.metrosDisponibles + 0.01) {
          throw new Error(`Stock insuficiente. Solo quedan ${stockItem.metrosDisponibles.toFixed(2)}m disponibles.`);
        }

        // 1. Crear el registro de MovimientoStock
        await tx.movimientoStock.create({
          data: {
            tipo: 'SALIDA',
            cantidad: -metrosADescontar,
            stockId: stockId,
          },
        });

        // 2. Actualizar el registro de Stock
        const newMetrosDisponibles = stockItem.metrosDisponibles - metrosADescontar;

        if (newMetrosDisponibles <= 0.01) {
          // Si se agotan los metros, eliminar el item de stock
          await tx.stock.delete({ where: { id: stockId } });
        } else {
          await tx.stock.update({
            where: { id: stockId },
            data: {
              metrosDisponibles: newMetrosDisponibles,
            },
          });
        }
      });

      revalidatePath('/almacen');
      revalidatePath('/');
      return NextResponse.json({ message: 'Salida de stock procesada correctamente.' }, { status: 200 });

    } else {
      // --- Lógica de ENTRADA (Añadir Stock Manual) ---

      const newStockItem = await db.stock.create({
        data: {
          material: data.material,
          espesor: parseFloat(data.espesor) || 0,
          metrosDisponibles: parseFloat(data.metrosDisponibles),
          proveedor: data.proveedor || null,
          cantidadBobinas: parseInt(data.cantidadBobinas) || 1,
        },
      });

      // Crear movimiento de entrada
      await db.movimientoStock.create({
        data: {
          tipo: "ENTRADA",
          cantidad: parseFloat(data.metrosDisponibles),
          stockId: newStockItem.id
        }
      });
      revalidatePath('/almacen');
      revalidatePath('/');
      return NextResponse.json(newStockItem, { status: 201 });
    }

  } catch (error) {
    console.error('Error en POST /api/almacen-stock:', error);
    return NextResponse.json({ message: error.message || 'Error interno al crear/procesar stock.' }, { status: 500 });
  }
}
