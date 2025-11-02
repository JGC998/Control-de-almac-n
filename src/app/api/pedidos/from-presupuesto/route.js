
import { NextResponse } from 'next/server';
import { readData, writeData, getNextPedidoNumber } from '@/utils/dataManager';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request) {
  try {
    const { presupuestoId } = await request.json();

    if (!presupuestoId) {
      return NextResponse.json({ message: 'Falta el ID del presupuesto' }, { status: 400 });
    }

    const [allQuotes, allProducts] = await Promise.all([
        readData('presupuestos.json'),
        readData('productos.json')
    ]);

    const quoteIndex = allQuotes.findIndex(q => q.id === presupuestoId);

    if (quoteIndex === -1) {
      return NextResponse.json({ message: 'Presupuesto no encontrado' }, { status: 404 });
    }

    const quote = allQuotes[quoteIndex];

    if (quote.estado === 'Aceptado') {
        return NextResponse.json({ message: 'El presupuesto ya ha sido aceptado y convertido en pedido.' }, { status: 400 });
    }

    const productMap = new Map(allProducts.map(p => [p.id, p]));

    // Crear el nuevo pedido a partir del presupuesto
    const newOrder = {
      id: uuidv4(),
      numero: await getNextPedidoNumber(),
      fechaCreacion: new Date().toISOString(),
      clienteId: quote.clienteId,
      productos: quote.items.map(item => {
        const product = productMap.get(item.productId);
        return {
            id: uuidv4(),
            plantillaId: item.productId,
            nombre: item.description,
            cantidad: item.quantity,
            precioUnitario: item.unitPrice,
            pesoUnitario: product ? product.pesoUnitario : 0,
        }
      }),
      subtotal: quote.subtotal,
      tax: quote.tax,
      total: quote.total,
      estado: 'Activo', // Estado inicial del pedido
      presupuestoId: quote.id, // Guardar referencia al presupuesto original
    };

    // Actualizar el estado del presupuesto
    allQuotes[quoteIndex].estado = 'Aceptado';

    // Guardar los cambios
    const allOrders = await readData('pedidos.json');
    allOrders.push(newOrder);

    await writeData('presupuestos.json', allQuotes);
    await writeData('pedidos.json', allOrders);

    return NextResponse.json(newOrder, { status: 201 });

  } catch (error) {
    console.error('Error al crear el pedido desde el presupuesto:', error);
    return NextResponse.json({ message: 'Error interno al crear el pedido' }, { status: 500 });
  }
}
