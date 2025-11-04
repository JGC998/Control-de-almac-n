import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST /api/stock-management/receive-order
export async function POST(request, { params }) {
  try {
    const data = await request.json();
    const { pedidoId } = data;

    if (!pedidoId) {
      return NextResponse.json({ message: 'Se requiere pedidoId' }, { status: 400 });
    }

    const newStockItems = await db.$transaction(async (tx) => {
      // 1. Encontrar el pedido y sus bobinas
      const pedido = await tx.pedidoProveedor.findUnique({
        where: { id: pedidoId },
        include: { bobinas: true, proveedor: true },
      });

      if (!pedido) throw new Error('Pedido a proveedor no encontrado');
      if (pedido.estado === 'Recibido') throw new Error('Este pedido ya ha sido recibido');

      // 2. Actualizar estado del pedido
      await tx.pedidoProveedor.update({
        where: { id: pedidoId },
        data: { estado: 'Recibido' },
      });

      // --- 3. NUEVA LÓGICA DE COSTE ---
      const tasaCambio = pedido.tasaCambio || 1;
      const gastosTotales = pedido.gastosTotales || 0;
      
      const costeTotalBobinas = pedido.bobinas.reduce((acc, b) => acc + (b.precioMetro * (b.largo || 0)), 0);
      const costeTotalDivisa = costeTotalBobinas + gastosTotales;
      const costeTotalEuros = costeTotalDivisa * tasaCambio;
      const totalMetros = pedido.bobinas.reduce((acc, b) => acc + (b.largo || 0), 0);
      
      if (totalMetros === 0) {
         throw new Error('El pedido no tiene metros. No se puede calcular el coste prorrateado.');
      }
      
      const costePorMetroProrrateado = costeTotalEuros / totalMetros;
      // --- FIN NUEVA LÓGICA ---

      const createdStock = [];

      // 4. Crear un item de Stock por cada bobina y su movimiento
      for (const bobina of pedido.bobinas) {
        
        // 4a. Actualizar la bobina con su coste final
        await tx.bobinaPedido.update({
          where: { id: bobina.id },
          data: { costoFinalMetro: costePorMetroProrrateado }
        });

        // 4b. Crear el nuevo item de Stock
        const newStockItem = await tx.stock.create({
          data: {
            material: pedido.material,
            espesor: bobina.espesor, // Ya es Float
            metrosDisponibles: bobina.largo || 0,
            proveedor: pedido.proveedor.nombre,
            ubicacion: 'Almacén',
            costoMetro: costePorMetroProrrateado // <-- Guardamos el coste real
          },
        });

        // 4c. Crear el movimiento de entrada
        await tx.movimientoStock.create({
          data: {
            tipo: 'Entrada',
            cantidad: bobina.largo || 0,
            referencia: `Pedido Prov: ${pedido.id}`,
            stockId: newStockItem.id,
          },
        });
        createdStock.push(newStockItem);
      }
      return createdStock;
    });

    return NextResponse.json(newStockItems, { status: 201 });

  } catch (error) {
    console.error('Error al recibir el pedido:', error);
    return NextResponse.json({ message: error.message || 'Error interno' }, { status: 500 });
  }
}
