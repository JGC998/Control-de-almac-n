
import { NextResponse } from 'next/server';
import { readData, writeData, getNextPedidoNumber } from '@/utils/dataManager';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request) {
  try {
    const { presupuestoId } = await request.json();

    if (!presupuestoId) {
      return NextResponse.json({ message: 'Falta el ID del presupuesto' }, { status: 400 });
    }

    // FASE II: Las lecturas se benefician de la caché.
    const [allQuotes, allProducts, allOrders] = await Promise.all([
        readData('presupuestos.json'),
        readData('productos.json'),
        readData('pedidos.json')
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

    // Iniciar transacción: Actualizar el estado del presupuesto y luego crear el pedido.
    // Si falla la creación del pedido, revertir el estado del presupuesto.
    let quoteUpdated = false;
    try {
      // 1. Actualizar el estado del presupuesto a 'Aceptado'
      const updateQuoteSuccess = await updateData('presupuestos.json', presupuestoId, { estado: 'Aceptado' });
      if (!updateQuoteSuccess) {
        throw new Error('No se pudo actualizar el estado del presupuesto.');
      }
      quoteUpdated = true;

      // 2. Añadir el nuevo pedido a la lista de pedidos
      allOrders.push(newOrder);
      await writeData('pedidos.json', allOrders);

      return NextResponse.json(newOrder, { status: 201 });

    } catch (error) {
      console.error('Error en la transacción de creación de pedido desde presupuesto:', error);
      // Si el presupuesto fue actualizado pero el pedido no se creó, intentar revertir el estado del presupuesto.
      if (quoteUpdated) {
        console.warn('Intentando revertir el estado del presupuesto debido a un fallo en la creación del pedido.');
        await updateData('presupuestos.json', presupuestoId, { estado: quote.estado }); // Revertir al estado original
      }
      return NextResponse.json({ message: 'Error interno al crear el pedido' }, { status: 500 });
    }

  } catch (error) {
    console.error('Error al crear el pedido desde el presupuesto:', error);
    return NextResponse.json({ message: 'Error interno al crear el pedido' }, { status: 500 });
  }
}
