import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/pedidos-proveedores-data
export async function GET() {
  try {
    const pedidos = await db.pedidoProveedor.findMany({
      include: { 
        bobinas: {
          include: {
            referencia: true // Incluir la referencia
          }
        },
        proveedor: {
          select: { nombre: true }
        }
      },
      orderBy: { fecha: 'desc' },
    });

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

    return NextResponse.json(pedidosConCoste); // Devolver los pedidos modificados

  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error al obtener pedidos a proveedores' }, { status: 500 });
  }
}

// POST /api/pedidos-proveedores-data (Modificado para nueva lógica)
export async function POST(request) {
  try {
    const data = await request.json();
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
        fechaLlegadaEstimada
      } = data;

    if (!proveedorId || !material || !bobinas || bobinas.length === 0) {
      return NextResponse.json({ message: 'Faltan datos (proveedor, material o bobinas)' }, { status: 400 });
    }

    const newPedidoProv = await db.pedidoProveedor.create({
      data: {
        proveedorId: proveedorId,
        material: material,
        tipo: tipo,
        notas: notas,
        numeroFactura: numeroFactura, 
        gastosTotales: parseFloat(gastosTotales) || 0,
        tasaCambio: parseFloat(tasaCambio) || 1,
        estado: 'Pendiente',
        numeroContenedor: numeroContenedor,
        naviera: naviera,
        fechaLlegadaEstimada: fechaLlegadaEstimada ? new Date(fechaLlegadaEstimada) : null,
        bobinas: {
          create: bobinas.map(b => ({
            referenciaId: b.referenciaId || null,
            cantidad: parseInt(b.cantidad) || 1, 
            ancho: parseFloat(b.ancho) || null,
            largo: parseFloat(b.largo) || null,
            espesor: parseFloat(b.espesor) || null,
            precioMetro: parseFloat(b.precioMetro) || 0,
          })),
        },
      },
    });
    return NextResponse.json(newPedidoProv, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error al crear pedido a proveedor' }, { status: 500 });
  }
}
