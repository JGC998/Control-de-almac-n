import { NextResponse } from 'next/server';
import { logApiError } from '@/lib/logger';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache'; // 👈 Importación requerida

// GET /api/almacen-stock - Obtiene todo el stock
export async function GET() {
  try {
    // 1. Obtener todos los items de stock y todos los proveedores en paralelo
    const [stockItems, proveedores] = await Promise.all([
      db.stock.findMany({
        take: 1000,
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
    logApiError(error);
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

      // BUG-01: capturar datos del stock ANTES de la transacción (puede borrarse si se agota)
      let datosParaNotificar = null;
      let metrosFinales = 0;

      await db.$transaction(async (tx) => {
        const stockItem = await tx.stock.findUnique({ where: { id: stockId } });

        if (!stockItem) {
          throw new Error('Item de stock no encontrado.');
        }

        if (metrosADescontar > stockItem.metrosDisponibles + 0.01) {
          logApiError(
            new Error(`Stock insuficiente: disponibles ${stockItem.metrosDisponibles.toFixed(2)}m, solicitados ${metrosADescontar}m`),
            'SALIDA_STOCK'
          );
          const e = new Error('Stock insuficiente para realizar la salida.');
          e.isUserError = true;
          throw e;
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
        metrosFinales = newMetrosDisponibles;
        // Capturar datos del item para poder notificar después, aunque se borre
        datosParaNotificar = { ...stockItem, metrosDisponibles: Math.max(0, newMetrosDisponibles) };

        if (newMetrosDisponibles <= 0.01) {
          await tx.stock.delete({ where: { id: stockId } });
        } else {
          await tx.stock.update({
            where: { id: stockId },
            data: { metrosDisponibles: newMetrosDisponibles },
          });
        }
      });

      // N-05: Notificar si el stock resultante está por debajo del mínimo (incluso si fue borrado = 0 m)
      if (datosParaNotificar && (datosParaNotificar.stockMinimo || 0) > 0 &&
          datosParaNotificar.metrosDisponibles < datosParaNotificar.stockMinimo) {
        db.notificacion.create({
          data: {
            titulo: `⚠️ Stock bajo mínimo: ${datosParaNotificar.material}`,
            mensaje: `Quedan ${datosParaNotificar.metrosDisponibles.toFixed(1)} m de ${datosParaNotificar.material}${datosParaNotificar.espesor ? ` ${datosParaNotificar.espesor}mm` : ''} (mínimo configurado: ${datosParaNotificar.stockMinimo} m).`,
            leida: false,
          },
        }).catch(() => {});
      }

      revalidatePath('/almacen');
      revalidatePath('/');
      return NextResponse.json({ message: 'Salida de stock procesada correctamente.' }, { status: 200 });

    } else {
      // --- Lógica de ENTRADA (Añadir Stock Manual) ---

      const metros = parseFloat(data.metrosDisponibles);
      if (!data.material || typeof data.material !== 'string' || !data.material.trim()) {
        return NextResponse.json({ message: 'El campo material es requerido.' }, { status: 400 });
      }
      if (isNaN(metros) || metros <= 0) {
        return NextResponse.json({ message: 'Los metros disponibles deben ser un número positivo.' }, { status: 400 });
      }

      // BUG-04: Envolver en transacción para garantizar consistencia
      const newStockItem = await db.$transaction(async (tx) => {
        const item = await tx.stock.create({
          data: {
            material: data.material,
            espesor: parseFloat(data.espesor) || 0,
            metrosDisponibles: parseFloat(data.metrosDisponibles),
            proveedor: data.proveedor || null,
            cantidadBobinas: parseInt(data.cantidadBobinas) || 1,
          },
        });
        await tx.movimientoStock.create({
          data: {
            tipo: 'ENTRADA',
            cantidad: parseFloat(data.metrosDisponibles),
            stockId: item.id,
          },
        });
        return item;
      });
      revalidatePath('/almacen');
      revalidatePath('/');
      return NextResponse.json(newStockItem, { status: 201 });
    }

  } catch (error) {
    if (error.isUserError) {
      return NextResponse.json({ message: error.message }, { status: 422 });
    }
    logApiError(error, 'Error en POST /api/almacen-stock:');
    return NextResponse.json({ message: 'Error interno al procesar stock' }, { status: 500 });
  }
}
