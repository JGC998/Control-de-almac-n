import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const PEDIDOS_PROVEEDORES_FILE = path.join(process.cwd(), 'src', 'data', 'pedidos-proveedores.json');
const STOCK_FILE = path.join(process.cwd(), 'public', 'data', 'stock.json'); // Assuming stock.json still holds other stock

export async function GET() {
  try {
    let pedidosProveedores = [];
    try {
      const data = await fs.promises.readFile(PEDIDOS_PROVEEDORES_FILE, 'utf-8');
      pedidosProveedores = JSON.parse(data);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error("Error reading pedidos-proveedores.json:", error);
      }
      // If file not found or error, treat as empty array
      pedidosProveedores = [];
    }

    let currentStock = [];
    try {
      const stockData = await fs.promises.readFile(STOCK_FILE, 'utf-8');
      currentStock = JSON.parse(stockData);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error("Error reading stock.json:", error);
      }
      // If file not found or error, treat as empty array
      currentStock = [];
    }

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

    // Combine stock from pedidos and existing stock, ensuring unique IDs if possible
    // For simplicity, we'll just concatenate for now. Duplicates might occur if IDs overlap.
    const combinedStock = [...currentStock, ...stockFromPedidos];

    return NextResponse.json(combinedStock);
  } catch (error) {
    console.error("Unhandled error in GET /api/almacen-stock:", error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
