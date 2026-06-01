import { NextResponse } from 'next/server';
import { logApiError } from '@/lib/logger';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function POST(request) {
  try {
    const { pedidoId } = await request.json();

    const pedido = await db.pedidoProveedor.findUnique({
      where: { id: pedidoId },
      include: { bobinas: { include: { referencia: true } } },
    });

    if (!pedido) {
      return NextResponse.json({ message: 'Pedido no encontrado' }, { status: 404 });
    }

    const tasa = pedido.tasaCambio || 1;
    const gastos = pedido.gastosTotales || 0;
    const esImportacion = pedido.tipo === 'IMPORTACION';

    const valorTotalMercanciaEUR = pedido.bobinas.reduce((acc, b) => {
      const precioBaseEUR = (b.precioMetro || 0) * (esImportacion ? tasa : 1);
      return acc + (precioBaseEUR * (b.largo || 0));
    }, 0);

    await db.$transaction(async (tx) => {
      await Promise.all(pedido.bobinas.map(bobina => {
        const metrosPorBobina = parseFloat(bobina.largo) || 0;
        const cantidadBobinas = parseInt(bobina.cantidad) || 1;
        const metrosTotales = metrosPorBobina * cantidadBobinas;

        const precioBaseOriginal = parseFloat(bobina.precioMetro) || 0;
        const precioBaseEUR = precioBaseOriginal * (esImportacion ? tasa : 1);
        const costeTotalBaseLinea = precioBaseEUR * metrosTotales;

        const factorParticipacion = valorTotalMercanciaEUR > 0 ? (costeTotalBaseLinea / valorTotalMercanciaEUR) : 0;
        const gastosAsignados = gastos * factorParticipacion;
        const costoMetroFinal = metrosTotales > 0 ? (precioBaseEUR + (gastosAsignados / metrosTotales)) : 0;

        return tx.stock.create({
          data: {
            material: pedido.material || 'Material',
            espesor: bobina.espesor,
            metrosDisponibles: metrosTotales,
            proveedor: pedido.proveedorId,
            costoMetro: costoMetroFinal,
            cantidadBobinas: cantidadBobinas,
            movimientos: {
              create: { tipo: 'ENTRADA', cantidad: metrosTotales },
            },
          },
        });
      }));

      await tx.pedidoProveedor.update({
        where: { id: pedidoId },
        data: { estado: 'Recibido' },
      });
    });

    revalidatePath('/almacen');
    revalidatePath('/proveedores');
    revalidatePath('/');
    revalidatePath(`/pedidos-proveedores-data/${pedidoId}`);
    return NextResponse.json({ message: 'Pedido recibido y stock actualizado correctamente' });
  } catch (error) {
    logApiError(error, 'Error al recibir pedido:');
    return NextResponse.json({ message: 'Error interno' }, { status: 500 });
  }
}
