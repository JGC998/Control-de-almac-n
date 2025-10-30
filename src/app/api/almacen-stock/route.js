import { NextResponse } from 'next/server';
import { readData, writeData } from '../../../utils/dataManager';

export async function GET() {
  try {
    // readData handles cases where files don't exist by returning an empty array.
    const pedidosProveedores = await readData('pedidos-proveedores.json');
    const currentStock = await readData('stock.json');

    const stockFromPedidos = [];
    pedidosProveedores.forEach(pedido => {
      if (pedido.type === 'Nacional' && pedido.estado === 'Recibido' && pedido.coils) {
        pedido.coils.forEach((coil, index) => {
          stockFromPedidos.push({
            id: `${pedido.id}-${index}-${pedido.commonMaterial}-${coil.espesor}-${coil.attribute || 'no-attr'}`,
            material: pedido.commonMaterial,
            espesor: coil.espesor,
            metrosDisponibles: coil.length, // Assuming length is metrosDisponibles
            proveedor: pedido.proveedor,
            ubicacion: 'Almacén', // Placeholder, could be improved later
            fechaEntrada: pedido.fecha, // Use order date as entry date
          });
        });
      }
    });

    // Combine stock from pedidos and existing stock. 
    // Note: The original comment about potential duplicate IDs is still relevant and should be addressed in a future step.
    const combinedStock = [...currentStock, ...stockFromPedidos];

    return NextResponse.json(combinedStock);
  } catch (error) {
    console.error("Unhandled error in GET /api/almacen-stock:", error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const updatedStock = await request.json();
    await writeData('stock.json', updatedStock);
    return NextResponse.json({ message: 'Stock updated successfully' });
  } catch (error) {
    console.error("Error in PUT /api/almacen-stock:", error);
    return NextResponse.json({ error: 'Failed to update stock', details: error.message }, { status: 500 });
  }
}
