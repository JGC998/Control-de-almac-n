import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/pedidos-proveedores-data
export async function GET() {
  try {
    const pedidos = await db.pedidoProveedor.findMany({
      include: { bobinas: true },
      orderBy: { fecha: 'desc' },
    });
    return NextResponse.json(pedidos);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error al obtener pedidos a proveedores' }, { status: 500 });
  }
}

// POST /api/pedidos-proveedores-data
export async function POST(request) {
  try {
    const data = await request.json();
    const { bobinas, ...pedidoData } = data;

    const newPedidoProv = await db.pedidoProveedor.create({
      data: {
        ...pedidoData,
        estado: 'Pendiente',
        bobinas: {
          create: bobinas.map(b => ({
            precioMetro: parseFloat(b.precioMetro),
            longitud: parseFloat(b.longitud),
            ancho: parseFloat(b.ancho),
            espesor: String(b.espesor),
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
