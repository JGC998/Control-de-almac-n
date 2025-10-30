import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const PEDIDOS_PROVEEDORES_FILE = path.join(process.cwd(), 'src', 'data', 'pedidos-proveedores.json');
const STOCK_FILE = path.join(process.cwd(), 'public', 'data', 'stock.json');

export async function GET() {
  try {
    const data = await fs.promises.readFile(PEDIDOS_PROVEEDORES_FILE, 'utf-8');
    return NextResponse.json(JSON.parse(data));
  } catch (error) {
    if (error.code === 'ENOENT') {
      // File not found, return empty array
      return NextResponse.json([]);
    }
    console.error("Error reading pedidos-proveedores.json:", error);
    return NextResponse.json({ error: 'Failed to read pedidos-proveedores data' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const newPedidosContent = await request.json();

    // Read previous pedidos to find newly received ones
    let oldPedidosContent = [];
    try {
      const oldData = await fs.promises.readFile(PEDIDOS_PROVEEDORES_FILE, 'utf-8');
      oldPedidosContent = JSON.parse(oldData);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.warn("Could not read old pedidos-proveedores.json for comparison:", error);
      }
    }

    // Write the new pedidos-proveedores.json content
    await fs.promises.writeFile(PEDIDOS_PROVEEDORES_FILE, JSON.stringify(newPedidosContent, null, 2), 'utf-8');

    // Process stock updates for newly received orders
    const newlyReceivedOrders = newPedidosContent.filter(newPedido => {
      const oldPedido = oldPedidosContent.find(old => old.id === newPedido.id);
      return newPedido.estado === 'Recibido' && (!oldPedido || oldPedido.estado !== 'Recibido');
    });

    if (newlyReceivedOrders.length > 0) {
      let stockData = [];
      try {
        const currentStockRaw = await fs.promises.readFile(STOCK_FILE, 'utf-8');
        stockData = JSON.parse(currentStockRaw);
      } catch (error) {
        if (error.code === 'ENOENT') {
          console.log("stock.json not found, initializing with empty array.");
        } else {
          console.warn("Could not read existing stock.json for update:", error);
        }
      }

      newlyReceivedOrders.forEach(pedido => {
        if (pedido.coils) {
          pedido.coils.forEach((coil, index) => {
            // Generate a truly unique ID for each new stock item
            const stockItemId = `${pedido.id}-${index}-${Date.now()}`;
            
            // Check if an item with the same material, espesor, and attribute already exists
            const existingStockItemIndex = stockData.findIndex(
              s => s.material === pedido.commonMaterial &&
                   s.espesor === coil.espesor &&
                   s.attribute === (coil.attribute || 'no-attr')
            );

            if (existingStockItemIndex > -1) {
              // Update existing stock item
              stockData[existingStockItemIndex].stock += coil.length; // Assuming length is stock amount
              stockData[existingStockItemIndex].metrosDisponibles += coil.length; // Update metrosDisponibles as well
            } else {
              // Add new stock item
              stockData.push({
                id: stockItemId, // Unique ID for the stock item
                material: pedido.commonMaterial,
                espesor: coil.espesor,
                stock: coil.length, // Assuming length is stock amount
                stock_minimo: 0, // Default, can be managed later
                metrosDisponibles: coil.length,
                proveedor: pedido.proveedor,
                ubicacion: 'Almacén', // Placeholder
                fechaEntrada: pedido.fecha,
                attribute: coil.attribute || 'no-attr', // Store attribute for better matching
              });
            }
          });
        }
      });

      // Write the updated stock.json content
      await fs.promises.writeFile(STOCK_FILE, JSON.stringify(stockData, null, 2), 'utf-8');
      console.log("Stock.json updated with newly received orders.");
    }

    return NextResponse.json({ message: 'Pedidos proveedores data updated successfully' });
  } catch (error) {
    console.error("Error writing pedidos-proveedores.json or updating stock.json:", error);
    return NextResponse.json({ error: 'Failed to write pedidos-proveedores data or update stock.json', details: error.message }, { status: 500 });
  }
}