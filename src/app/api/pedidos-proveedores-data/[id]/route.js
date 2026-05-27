import { NextResponse } from 'next/server';
import { logApiError } from '@/lib/logger';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { handlePrismaError } from '@/lib/manejadores-api';
import { validateData, pedidoProveedorSchema } from '@/lib/validations';

// GET /api/pedidos-proveedores-data/[id]
export async function GET(request, { params }) {
  try {
    const { id } = await params;

    const pedido = await db.pedidoProveedor.findUnique({
      where: { id },
      include: {
        bobinas: { include: { referencia: true } },
        proveedor: true,
      },
    });

    if (!pedido) {
      return NextResponse.json({ message: 'Pedido no encontrado' }, { status: 404 });
    }
    return NextResponse.json(pedido);
  } catch (error) {
    logApiError(error);
    return NextResponse.json({ message: 'Error al obtener el pedido' }, { status: 500 });
  }
}

// PUT /api/pedidos-proveedores-data/[id]
export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();

    const validation = validateData(pedidoProveedorSchema, body);
    if (!validation.success) {
      return NextResponse.json({ message: 'Datos inválidos', errors: validation.errors }, { status: 400 });
    }

    const { bobinas, ...pedidoData } = validation.data;

    const updatedPedido = await db.$transaction(async (tx) => {
      await tx.pedidoProveedor.update({
        where: { id },
        data: {
          proveedorId: pedidoData.proveedorId,
          material: pedidoData.material,
          tipo: pedidoData.tipo,
          notas: pedidoData.notas,
          numeroFactura: pedidoData.numeroFactura,
          gastosTotales: pedidoData.gastosTotales ?? 0,
          tasaCambio: pedidoData.tasaCambio ?? 1,
          numeroContenedor: pedidoData.numeroContenedor,
          naviera: pedidoData.naviera,
          fechaLlegadaEstimada: pedidoData.fechaLlegadaEstimada ? new Date(pedidoData.fechaLlegadaEstimada) : null,
        },
      });

      await tx.bobinaPedido.deleteMany({ where: { pedidoId: id } });

      if (bobinas && bobinas.length > 0) {
        await tx.bobinaPedido.createMany({
          data: bobinas.map(b => ({
            referenciaId: b.referenciaId || null,
            cantidad: b.cantidad ?? 1,
            ancho: b.ancho ?? null,
            largo: b.largo ?? null,
            espesor: b.espesor ?? null,
            precioMetro: b.precioMetro ?? 0,
            pedidoId: id,
          })),
        });
      }

      return tx.pedidoProveedor.findUnique({
        where: { id },
        include: { bobinas: true },
      });
    });

    revalidatePath('/proveedores');
    revalidatePath('/almacen');
    revalidatePath('/');
    revalidatePath(`/pedidos-proveedores-data/${id}`);
    return NextResponse.json(updatedPedido, { status: 200 });
  } catch (error) {
    return handlePrismaError(error, { notFound: 'Pedido no encontrado' });
  }
}

// DELETE /api/pedidos-proveedores-data/[id]
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;

    await db.$transaction(async (tx) => {
      await tx.bobinaPedido.deleteMany({ where: { pedidoId: id } });
      await tx.pedidoProveedor.delete({ where: { id } });
    });

    revalidatePath('/proveedores');
    revalidatePath('/almacen');
    revalidatePath('/');
    return NextResponse.json({
      message: 'Pedido de proveedor eliminado. Si el pedido estaba Recibido, el stock asociado NO se ha revertido automáticamente — ajústalo manualmente en /almacen/stock.',
    }, { status: 200 });
  } catch (error) {
    return handlePrismaError(error, { notFound: 'Pedido no encontrado' });
  }
}
