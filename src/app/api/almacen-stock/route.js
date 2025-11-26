import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

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
    // --- Lógica de SALIDA (Baja de Stock por Bobinas) ---
    // El frontend debe enviar 'cantidadBobinasToDiscard' en lugar de 'cantidad'
    const { stockId, cantidadBobinasToDiscard, referencia } = data;

    const cantidadBobinasFloat = parseFloat(cantidadBobinasToDiscard);

    if (!stockId || isNaN(cantidadBobinasFloat) || cantidadBobinasFloat <= 0) {
      return NextResponse.json(
        { message: 'Se requiere stockId, cantidadBobinasToDiscard y una cantidad positiva de bobinas para la salida.' },
        { status: 400 }
      );
    }

    // Usar una transacción para asegurar la atomicidad
    await db.$transaction(async (tx) => {
      const stockItem = await tx.stock.findUnique({ where: { id: stockId } });

      if (!stockItem) {
        throw new Error('Item de stock no encontrado.');
      }

      if (!stockItem.metrosInicialesPorBobina) {
        throw new Error('El item de stock no tiene definido "metrosInicialesPorBobina". No se puede procesar la baja por bobinas.');
      }

      if (stockItem.cantidadBobinas === null || cantidadBobinasFloat > stockItem.cantidadBobinas) {
        throw new Error(`Stock insuficiente de bobinas. Solo quedan ${stockItem.cantidadBobinas || 0} bobinas disponibles.`);
      }

      // Calcular los metros a descontar
      const metrosADescontar = cantidadBobinasFloat * stockItem.metrosInicialesPorBobina;

      // Validar si hay suficientes metros, aunque priorizamos la baja por bobinas
      if (metrosADescontar > stockItem.metrosDisponibles) {
        throw new Error(`Metros insuficientes para ${cantidadBobinasFloat} bobinas. Quedan ${stockItem.metrosDisponibles.toFixed(2)}m.`);
      }

      // 1. Crear el registro de MovimientoStock
      await tx.movimientoStock.create({
        data: {
          tipo: 'salida_bobina',
          cantidad: -metrosADescontar, // La cantidad en MovimientoStock sigue siendo metros, pero negativa
          referencia: referencia || `Baja por ${cantidadBobinasFloat} bobinas - ID: ${stockId}`,
          stockId: stockId,
        },
      });

      // 2. Actualizar el registro de Stock
      const newCantidadBobinas = stockItem.cantidadBobinas - cantidadBobinasFloat;
      const newMetrosDisponibles = stockItem.metrosDisponibles - metrosADescontar;

      if (newCantidadBobinas === 0 && newMetrosDisponibles > 0) {
        // Esto es un caso anómalo, no debería ocurrir si se gestiona bien
        console.warn(`Advertencia: Se agotaron las bobinas de Stock ${stockId}, pero quedan ${newMetrosDisponibles.toFixed(2)}m.`);
        // Podríamos decidir eliminar el stock o dejarlo con 0 bobinas y los metros restantes
        await tx.stock.delete({ where: { id: stockId } }); // O eliminar si el usuario lo prefiere
      } else if (newCantidadBobinas <= 0 && newMetrosDisponibles <= 0) {
        // Si se agotan las bobinas y los metros, eliminar el item de stock
        await tx.stock.delete({ where: { id: stockId } });
      } else {
        await tx.stock.update({
          where: { id: stockId },
          data: {
            cantidadBobinas: newCantidadBobinas,
            metrosDisponibles: newMetrosDisponibles,
          },
        });
      }
    });

    return NextResponse.json({ message: 'Salida de stock por bobinas procesada correctamente.' }, { status: 200 });

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
