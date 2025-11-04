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
