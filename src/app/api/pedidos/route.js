import { NextResponse } from 'next/server';
import { readData, writeData } from '../../../utils/dataManager';

const FILENAME = 'pedidos.json';

// GET /api/pedidos - Obtiene todos los pedidos
export async function GET() {
    const pedidos = await readData(FILENAME);
    return NextResponse.json(pedidos);
}

// POST /api/pedidos - Crea un nuevo pedido
export async function POST(request) {
    const nuevoPedido = await request.json();
    const pedidos = await readData(FILENAME);

    // --- Nueva lógica para generar ID secuencial ---
    let maxId = 0;
    for (const pedido of pedidos) {
        // Extraer solo la parte numérica del ID
        const idNum = parseInt(String(pedido.id).split('-').pop(), 10);
        if (!isNaN(idNum) && idNum > maxId) {
            maxId = idNum;
        }
    }
    // Asignar el nuevo ID formateado
    nuevoPedido.id = `PED-${String(maxId + 1).padStart(4, '0')}`;
    // ---

    pedidos.unshift(nuevoPedido); // Añade al principio

    await writeData(FILENAME, pedidos);
    return NextResponse.json(nuevoPedido, { status: 201 });
}
