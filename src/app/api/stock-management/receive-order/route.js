import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const { pedidoId } = await request.json();

    // 1. Obtener el pedido completo con sus bobinas
    const pedido = await db.pedidoProveedor.findUnique({
      where: { id: pedidoId },
      include: { bobinas: { include: { referencia: true } } }
    });

    if (!pedido) {
      return NextResponse.json({ message: 'Pedido no encontrado' }, { status: 404 });
    }

    // 2. CÁLCULO DE COSTES (Lógica Ponderada idéntica al frontend)
    const tasa = pedido.tasaCambio || 1;
    const gastos = pedido.gastosTotales || 0;
    const esImportacion = pedido.tipo === 'IMPORTACION';

    // Calcular valor total base en EUROS para prorrateo
    const valorTotalMercanciaEUR = pedido.bobinas.reduce((acc, b) => {
      const precioBaseEUR = (b.precioMetro || 0) * (esImportacion ? tasa : 1);
      return acc + (precioBaseEUR * (b.largo || 0));
    }, 0);

    await db.$transaction(async (tx) => {
      // Recorrer bobinas y crear Stock
      for (const bobina of pedido.bobinas) {
        const metrosPorBobina = parseFloat(bobina.largo) || 0;
        const cantidadBobinas = parseInt(bobina.cantidad) || 1;
        const metrosTotales = metrosPorBobina * cantidadBobinas;

        const precioBaseOriginal = parseFloat(bobina.precioMetro) || 0;
        
        // Cálculos
        const precioBaseEUR = precioBaseOriginal * (esImportacion ? tasa : 1);
        const costeTotalBaseLinea = precioBaseEUR * metrosTotales;
        
        // Prorrateo
        const factorParticipacion = valorTotalMercanciaEUR > 0 ? (costeTotalBaseLinea / valorTotalMercanciaEUR) : 0;
        const gastosAsignados = gastos * factorParticipacion;
        
        // Costo Final Unitario
        const costoMetroFinal = metrosTotales > 0 ? (precioBaseEUR + (gastosAsignados / metrosTotales)) : 0;

        // 3. Actualizar la bobina con el costo final calculado (para histórico)
        await tx.bobinaPedido.update({
            where: { id: bobina.id },
            data: { costoFinalMetro: costoMetroFinal }
        });

        // 4. Crear entrada en Stock
        const materialNombre = pedido.material || 'Material';
        const referenciaNombre = bobina.referencia?.nombre || `${materialNombre} ${bobina.espesor}mm`;

        await tx.stock.create({
          data: {
            material: materialNombre,
            espesor: bobina.espesor,
            metrosDisponibles: metrosTotales, // Usar metros totales
            proveedor: pedido.proveedorId,
            costoMetro: costoMetroFinal, 
            fechaEntrada: new Date(),
            ubicacion: 'Recepción',
            cantidadBobinas: cantidadBobinas, // Guardar cantidad de bobinas
            
            // Registrar el movimiento inicial de entrada
            movimientos: {
              create: {
                tipo: 'ENTRADA',
                cantidad: metrosTotales, // Usar metros totales
                referencia: `Recepción Pedido ${pedido.id.slice(0,8)}`,
                fecha: new Date()
              }
            }
          }
        });
      }

      // 5. Marcar pedido como Recibido
      await tx.pedidoProveedor.update({
        where: { id: pedidoId },
        data: { estado: 'Recibido' }
      });
    });

    return NextResponse.json({ message: 'Pedido recibido y stock actualizado correctamente' });

  } catch (error) {
    console.error('Error al recibir pedido:', error);
    return NextResponse.json({ message: error.message || 'Error interno' }, { status: 500 });
  }
}
