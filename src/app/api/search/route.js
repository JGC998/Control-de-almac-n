import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    // Permitir consulta si está vacía o es muy corta para la búsqueda en tiempo real
    if (!query || query.length < 2) {
      return NextResponse.json([]);
    }

    const searchConfig = {
      where: {
        nombre: {
          contains: query,
        },
      },
      take: 5, // Limitar a 5 resultados, según lo solicitado
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

    // Ordenar los resultados para priorizar los que coinciden al principio, si fuera necesario.
    // Aquí simplemente los devolvemos todos juntos.

    return NextResponse.json(results);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error al realizar la búsqueda' }, { status: 500 });
  }
}
