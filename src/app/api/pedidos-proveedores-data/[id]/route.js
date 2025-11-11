import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/pedidos-proveedores-data/[id]
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    
    const pedido = await db.pedidoProveedor.findUnique({
      where: { id: id },
      include: {
        bobinas: true,
        proveedor: true,
      },
    });

    if (!pedido) {
      return NextResponse.json({ message: 'Pedido no encontrado' }, { status: 404 });
    }
    return NextResponse.json(pedido);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error al obtener el pedido' }, { status: 500 });
  }
}

// PUT /api/pedidos-proveedores-data/[id]
export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    
    const data = await request.json();
    const { bobinas, ...pedidoData } = data;

    const updatedPedido = await db.$transaction(async (tx) => {
      // 1. Actualizar los datos principales del pedido
      await tx.pedidoProveedor.update({
        where: { id: id },
        data: {
          proveedorId: pedidoData.proveedorId,
          material: pedidoData.material,
          tipo: pedidoData.tipo,
          notas: pedidoData.notas,
          gastosTotales: parseFloat(pedidoData.gastosTotales) || 0,
          tasaCambio: parseFloat(pedidoData.tasaCambio) || 1,
          numeroContenedor: pedidoData.numeroContenedor,
          naviera: pedidoData.naviera,
          fechaLlegadaEstimada: pedidoData.fechaLlegadaEstimada ? new Date(pedidoData.fechaLlegadaEstimada) : null,
        },
      });

      // 2. Eliminar todas las bobinas antiguas
      await tx.bobinaPedido.deleteMany({
        where: { pedidoId: id },
      });

      // 3. Crear las nuevas bobinas
      if (bobinas && bobinas.length > 0) {
        await tx.bobinaPedido.createMany({
          data: bobinas.map(b => ({
            referenciaId: b.referenciaId || null,
            ancho: parseFloat(b.ancho) || null,
            largo: parseFloat(b.largo) || null,
            espesor: parseFloat(b.espesor) || null,
            precioMetro: parseFloat(b.precioMetro) || 0,
            color: b.color || null,
            pedidoId: id,
          })),
        });
      }

      // 4. Devolver el pedido actualizado
      return tx.pedidoProveedor.findUnique({
        where: { id: id },
        include: { bobinas: true },
      });
    });

    return NextResponse.json(updatedPedido, { status: 200 });
  } catch (error) {
    console.error('Error al actualizar el pedido:', error);
    if (error.code === 'P2025') {
      return NextResponse.json({ message: 'Pedido no encontrado' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Error interno al actualizar el pedido' }, { status: 500 });
  }
}


// DELETE /api/pedidos-proveedores-data/[id] - ELIMINA UN PEDIDO DE PROVEEDOR (con limpieza de stock)
export async function DELETE(request, { params }) {
    try {
        const { id } = await params;

        await db.$transaction(async (tx) => {
            // 1. Encontrar todos los movimientos de stock de ENTRADA relacionados con este pedido.
            const movimientos = await tx.movimientoStock.findMany({
                where: {
                    referencia: {
                        startsWith: `Pedido Prov: ${id}`,
                    },
                    tipo: 'Entrada' // Asegura que solo se limpien las entradas
                },
                select: {
                    stockId: true,
                }
            });

            // Recolectar los IDs únicos de stock para eliminar.
            const stockIdsToDelete = movimientos
                .map(m => m.stockId)
                .filter(stockId => stockId !== null);

            // 2. Eliminar los MovimientoStock asociados al pedido.
            //    (Esto limpia la referencia del movimiento, preparando para el borrado de Stock).
            await tx.movimientoStock.deleteMany({
                where: { 
                    referencia: {
                        startsWith: `Pedido Prov: ${id}`,
                    }
                },
            });
            
            // 3. Eliminar los Stock items que fueron creados por esta recepción.
            //    Esto revierte la subida de inventario, incluso si el pedido estaba 'Recibido'.
            if (stockIdsToDelete.length > 0) {
                 await tx.stock.deleteMany({
                    where: {
                        id: { in: stockIdsToDelete }
                    }
                 });
                 // Nota: Si un ítem de stock tiene más de un movimiento (ej. una entrada manual posterior), 
                 // esto causaría un error o una eliminación indeseada. Se asume que cada entrada de proveedor crea un nuevo Stock item.
            }
            
            // 4. Eliminar las bobinas asociadas al pedido
            await tx.bobinaPedido.deleteMany({
                where: { pedidoId: id },
            });
            
            // 5. Eliminar el pedido principal
            await tx.pedidoProveedor.delete({
                where: { id: id },
            });
        });

        // La mutación de cache de SWR se realiza en el frontend (page.js)
        return NextResponse.json({ message: 'Pedido de proveedor y stock asociado eliminados correctamente' }, { status: 200 });
    } catch (error) {
        console.error('Error al eliminar el pedido de proveedor:', error);
        if (error.code === 'P2025') {
            return NextResponse.json({ message: 'Pedido no encontrado' }, { status: 404 });
        }
        return NextResponse.json({ message: error.message || 'Error interno al eliminar el pedido.' }, { status: 500 });
    }
}
