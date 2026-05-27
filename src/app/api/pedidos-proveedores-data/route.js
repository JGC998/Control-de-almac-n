import { NextResponse } from 'next/server';
import { logApiError } from '@/lib/logger';
import { db } from '@/lib/db';
import { pedidoProveedorSchema, validateData } from '@/lib/validations';

export const dynamic = 'force-dynamic';

// GET /api/pedidos-proveedores-data
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
    const skip = (page - 1) * limit;

    const [pedidos, total] = await Promise.all([
      db.pedidoProveedor.findMany({
        include: {
          bobinas: {
            include: {
              referencia: true
            }
          },
          proveedor: {
            select: { nombre: true }
          }
        },
        orderBy: { fecha: 'desc' },
        take: limit,
        skip,
      }),
      db.pedidoProveedor.count(),
    ]);

    // Calcular el coste prorrateado on-the-fly para la vista previa
    const pedidosConCoste = pedidos.map(pedido => {
      // Si el pedido ya está recibido, el coste ya está guardado.
      // Si está pendiente, lo calculamos para la vista previa.
      if (pedido.estado === 'Pendiente') {
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

        // Sobrescribir las bobinas con el coste calculado
        const bobinasConCoste = pedido.bobinas.map(bobina => ({
          ...bobina,
          costoFinalMetro: costePorMetroProrrateado // Asignamos el coste calculado
        }));
        
        return {
          ...pedido,
          bobinas: bobinasConCoste
        };
      }
      return pedido;
    });

    return NextResponse.json({
      data: pedidosConCoste,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });

  } catch (error) {
    logApiError(error);
    return NextResponse.json({ message: 'Error al obtener pedidos a proveedores' }, { status: 500 });
  }
}

// POST /api/pedidos-proveedores-data (Modificado para nueva lógica)
export async function POST(request) {
  try {
    const body = await request.json();
    const validation = validateData(pedidoProveedorSchema, body);
    if (!validation.success) {
      return NextResponse.json({ message: 'Datos inválidos', errors: validation.errors }, { status: 400 });
    }
    const {
      bobinas,
      tipo,
      gastosTotales,
      tasaCambio,
      proveedorId,
      material,
      notas,
      numeroFactura,
      numeroContenedor,
      naviera,
      fechaLlegadaEstimada,
    } = validation.data;

    const newPedidoProv = await db.pedidoProveedor.create({
      data: {
        proveedorId,
        material,
        tipo,
        notas,
        numeroFactura,
        gastosTotales: gastosTotales ?? 0,
        tasaCambio: tasaCambio ?? 1,
        estado: 'Pendiente',
        numeroContenedor,
        naviera,
        fechaLlegadaEstimada: fechaLlegadaEstimada ? new Date(fechaLlegadaEstimada) : null,
        bobinas: {
          create: bobinas.map(b => ({
            referenciaId: b.referenciaId || null,
            cantidad: b.cantidad ?? 1,
            ancho: b.ancho ?? null,
            largo: b.largo ?? null,
            espesor: b.espesor ?? null,
            precioMetro: b.precioMetro,
          })),
        },
      },
    });
    return NextResponse.json(newPedidoProv, { status: 201 });
  } catch (error) {
    logApiError(error);
    return NextResponse.json({ message: 'Error al crear pedido a proveedor' }, { status: 500 });
  }
}
