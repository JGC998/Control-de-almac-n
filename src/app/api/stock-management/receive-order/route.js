import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST /api/stock-management/receive-order
export async function POST(request) {
  try {
    const { pedidoId } = await request.json();

    if (!pedidoId) {
      return NextResponse.json({ message: 'Se requiere pedidoId' }, { status: 400 });
    }

    const newStockItems = await db.$transaction(async (tx) => {
      // 1. Encontrar el pedido y sus bobinas
      const pedido = await tx.pedidoProveedor.findUnique({
        where: { id: pedidoId },
        include: { bobinas: true },
      });

      if (!pedido) throw new Error('Pedido a proveedor no encontrado');
      if (pedido.estado === 'Recibido') throw new Error('Este pedido ya ha sido recibido');

      // 2. Actualizar estado del pedido
      await tx.pedidoProveedor.update({
        where: { id: pedidoId },
        data: { estado: 'Recibido' },
      });

      const createdStock = [];

      // 3. Crear un item de Stock por cada bobina y su movimiento
      for (const bobina of pedido.bobinas) {
        const newStockItem = await tx.stock.create({
          data: {
            material: pedido.material,
            espesor: bobina.espesor,
            metrosDisponibles: bobina.longitud,
            proveedor: pedido.proveedor,
            ubicacion: 'Almacén', // Ubicación por defecto
          },
        });

        await tx.movimientoStock.create({
          data: {
            tipo: 'Entrada',
            cantidad: bobina.longitud,
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
