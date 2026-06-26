import { NextResponse } from 'next/server';
import { logApiError } from '@/lib/logger';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function POST(request) {
  try {
    const { pedidoId } = await request.json();

    if (!pedidoId || typeof pedidoId !== 'string') {
      return NextResponse.json({ message: 'pedidoId requerido' }, { status: 400 });
    }

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

    const bobinaData = pedido.bobinas.map((bobina) => {
      const metrosPorBobina = parseFloat(bobina.largo) || 0;
      const cantidadBobinas = parseInt(bobina.cantidad, 10) || 1;
      const metrosTotales = metrosPorBobina * cantidadBobinas;
      const precioBaseEUR = (parseFloat(bobina.precioMetro) || 0) * (esImportacion ? tasa : 1);
      const costeTotalBaseLinea = precioBaseEUR * metrosTotales;
      const factorParticipacion = valorTotalMercanciaEUR > 0 ? (costeTotalBaseLinea / valorTotalMercanciaEUR) : 0;
      const gastosAsignados = gastos * factorParticipacion;
      const costoMetroFinal = metrosTotales > 0 ? (precioBaseEUR + (gastosAsignados / metrosTotales)) : 0;
      return { bobina, metrosTotales, cantidadBobinas, costoMetroFinal };
    });

    await db.$transaction(async (tx) => {
      // Guard atómico: marcar como Recibido solo si aún no lo está (evita doble recepción)
      const marcado = await tx.pedidoProveedor.updateMany({
        where: { id: pedidoId, estado: { not: 'Recibido' } },
        data: { estado: 'Recibido' },
      });
      if (marcado.count === 0) {
        throw Object.assign(new Error('Este pedido ya ha sido recibido anteriormente.'), { alreadyReceived: true });
      }

      // Secuencial para evitar deadlocks en MySQL y SQLITE_BUSY en SQLite
      for (const { bobina, metrosTotales, cantidadBobinas, costoMetroFinal } of bobinaData) {
        await tx.stock.create({
          data: {
            material: pedido.material || 'Material',
            espesor: bobina.espesor,
            metrosDisponibles: metrosTotales,
            proveedorId: pedido.proveedorId,
            costoMetro: costoMetroFinal,
            cantidadBobinas: cantidadBobinas,
            movimientos: {
              create: { tipo: 'ENTRADA', cantidad: metrosTotales },
            },
          },
        });
      }
    });

    revalidatePath('/almacen');
    revalidatePath('/proveedores');
    revalidatePath('/');
    revalidatePath(`/pedidos-proveedores-data/${pedidoId}`);
    return NextResponse.json({ message: 'Pedido recibido y stock actualizado correctamente' });
  } catch (error) {
    if (error.alreadyReceived) {
      return NextResponse.json({ message: error.message }, { status: 409 });
    }
    logApiError(error, 'Error al recibir pedido:');
    return NextResponse.json({ message: 'Error interno' }, { status: 500 });
  }
}
