import { NextResponse } from 'next/server';
import { readData, writeData } from '../../../utils/dataManager';

const FILENAME = 'clientes.json';

// GET /api/clientes - Obtiene todos los clientes
export async function GET() {
    const clientes = await readData(FILENAME);
    return NextResponse.json(clientes);
}

// POST /api/clientes - Crea un nuevo cliente
export async function POST(request) {
    const nuevoCliente = await request.json();
    const clientes = await readData(FILENAME);

    // Asignar un nuevo ID (puedes usar una lógica más robusta como UUID)
    nuevoCliente.id = `cli-${Date.now()}`;

    clientes.push(nuevoCliente);

    await writeData(FILENAME, clientes);
    return NextResponse.json(nuevoCliente, { status: 201 });
}
