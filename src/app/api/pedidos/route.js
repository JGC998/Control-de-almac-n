import { NextResponse } from 'next/server';
import { readData, writeData } from '../../../utils/dataManager';
import { v4 as uuidv4 } from 'uuid';

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

    // Asignamos un ID único y robusto
    nuevoPedido.id = uuidv4();
    pedidos.unshift(nuevoPedido); // Añade al principio

    await writeData(FILENAME, pedidos);
    return NextResponse.json(nuevoPedido, { status: 201 });
}
