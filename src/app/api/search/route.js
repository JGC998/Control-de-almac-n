import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query) {
      return NextResponse.json({ message: 'Se requiere un término de búsqueda' }, { status: 400 });
    }

    const searchConfig = {
      where: {
        nombre: {
          contains: query,
        },
      },
      take: 5,
    };
    
    const numSearchConfig = (field) => ({
      where: {
        [field]: {
          contains: query,
        },
      },
      take: 5,
    });

    // Buscar en paralelo
    const [clientes, productos, pedidos, presupuestos] = await Promise.all([
      db.cliente.findMany(searchConfig),
      db.producto.findMany(searchConfig),
      db.pedido.findMany(numSearchConfig('numero')),
      db.presupuesto.findMany(numSearchConfig('numero')),
    ]);

    const results = [
      ...clientes.map(c => ({ ...c, type: 'cliente' })),
      ...productos.map(p => ({ ...p, type: 'producto' })),
      ...pedidos.map(p => ({ ...p, type: 'pedido' })),
      ...presupuestos.map(q => ({ ...q, type: 'presupuesto' })),
    ];

    return NextResponse.json(results);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error al realizar la búsqueda' }, { status: 500 });
  }
}
