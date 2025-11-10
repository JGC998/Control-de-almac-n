import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * Lógica para recibir un pedido de proveedor.
 * Esto calcula el coste final, actualiza el estado del pedido,
 * y añade las bobinas al Stock.
 */
export async function POST(request) {
  try {
    const { pedidoId } = await request.json();

    if (!pedidoId) {
      return NextResponse.json({ message: 'Se requiere pedidoId' }, { status: 400 });
    }

    const updatedPedido = await db.$transaction(async (tx) => {
      // 1. Encontrar el pedido y sus bobinas
      const pedido = await tx.pedidoProveedor.findUnique({
        where: { id: pedidoId },
        include: { bobinas: true, proveedor: true },
      });

      if (!pedido) {
        throw new Error('Pedido no encontrado');
      }
      if (pedido.estado === 'Recibido') {
        throw new Error('Este pedido ya ha sido recibido');
      }

      // 2. Calcular costes (lógica extraída de la API de GET)
      const tasaCambio = pedido.tasaCambio || 1;
      const gastosTotales = pedido.gastosTotales || 0;
      
      const costeTotalBobinas = pedido.bobinas.reduce((acc, b) => acc + (b.precioMetro * (b.largo || 0)), 0);
      const costeTotalDivisa = costeTotalBobinas + gastosTotales;
      const costeTotalEuros = costeTotalDivisa * tasaCambio;
      const totalMetros = pedido.bobinas.reduce((acc, b) => acc + (b.largo || 0), 0);

      let costePorMetroProrrateado = 0;
      if (totalMetros > 0) {
        costePorMetroProrrateado = costeTotalEuros / totalMetros;
      }

      // 3. Actualizar bobinas con coste y crear Stock
      for (const bobina of pedido.bobinas) {
        // 3a. Actualizar coste final en la bobina
        await tx.bobinaPedido.update({
          where: { id: bobina.id },
          data: { costoFinalMetro: costePorMetroProrrateado },
        });

        // 3b. Crear la entrada de Stock
        const newStockItem = await tx.stock.create({
          data: {
            material: pedido.material,
            espesor: bobina.espesor,
            metrosDisponibles: bobina.largo || 0,
            proveedor: pedido.proveedor?.nombre || 'N/A',
            ubicacion: 'Almacén', // Ubicación por defecto
            costoMetro: costePorMetroProrrateado,
            stockMinimo: 100, // Valor por defecto, se puede ajustar
          },
        });

        // 3c. Crear el movimiento de stock
        await tx.movimientoStock.create({
          data: {
            tipo: "Entrada",
            cantidad: bobina.largo || 0,
            referencia: `Pedido Prov: ${pedido.id}`,
            stockId: newStockItem.id,
          },
        });
      }

      // 4. Actualizar estado del pedido
      return tx.pedidoProveedor.update({
        where: { id: pedidoId },
        data: { estado: 'Recibido' },
      });
    });

    return NextResponse.json(updatedPedido, { status: 200 });

  } catch (error) {
    console.error('Error al recibir el pedido:', error);
    return NextResponse.json({ message: error.message || 'Error interno' }, { status: 500 });
  }
}
