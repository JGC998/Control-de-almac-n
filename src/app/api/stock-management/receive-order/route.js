import { NextResponse } from 'next/server';
import { readData, writeData, updateData } from '../../../../utils/dataManager';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request) {
  try {
    const { pedidoId } = await request.json();

    if (!pedidoId) {
      return NextResponse.json({ message: 'Falta el ID del pedido de proveedor' }, { status: 400 });
    }

    const pedidosProveedores = await readData('pedidos-proveedores.json');
    const currentStock = await readData('stock.json');

    const pedidoIndex = pedidosProveedores.findIndex(p => p.id === pedidoId);

    if (pedidoIndex === -1) {
      return NextResponse.json({ message: 'Pedido de proveedor no encontrado' }, { status: 404 });
    }

    const pedido = pedidosProveedores[pedidoIndex];

    // Check if the order has already been integrated into stock
    if (pedido.stockIntegrated) {
      return NextResponse.json({ message: 'Este pedido ya ha sido integrado en el stock.' }, { status: 400 });
    }

    const newStockItems = [];
    if (pedido.type === 'Nacional' && pedido.estado === 'Recibido' && pedido.coils) {
      pedido.coils.forEach(coil => {
        newStockItems.push({
          id: uuidv4(), // Use UUID for unique stock item ID
          material: pedido.commonMaterial,
          espesor: coil.espesor,
          metrosDisponibles: coil.length,
          proveedor: pedido.proveedor,
          ubicacion: 'Almacén', // Default location
          fechaEntrada: pedido.fecha,
        });
      });
    }

    if (newStockItems.length === 0) {
      return NextResponse.json({ message: 'No hay bobinas válidas en este pedido para añadir al stock.' }, { status: 400 });
    }

    // Add new stock items to the current stock
    const updatedStock = [...currentStock, ...newStockItems];
    await writeData('stock.json', updatedStock);

    // Mark the supplier order as integrated into stock
    await updateData('pedidos-proveedores.json', pedidoId, { stockIntegrated: true });

    return NextResponse.json({ message: 'Stock actualizado correctamente', newItems: newStockItems }, { status: 200 });

  } catch (error) {
    console.error('Error al integrar el pedido de proveedor en el stock:', error);
    return NextResponse.json({ error: 'Error interno al actualizar el stock', details: error.message }, { status: 500 });
  }
}
