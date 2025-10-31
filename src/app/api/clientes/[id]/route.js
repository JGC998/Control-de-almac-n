import { NextResponse } from 'next/server';
import { readData, writeData } from '../../../../utils/dataManager';

const FILENAME = 'clientes.json';

// GET /api/clientes/[id] - Obtiene un cliente por su ID
export async function GET(request, { params }) {
    const { id } = params;
    const clientes = await readData(FILENAME);
    const cliente = clientes.find(c => c.id === id);

    if (!cliente) {
        return NextResponse.json({ message: 'Cliente no encontrado' }, { status: 404 });
    }

    return NextResponse.json(cliente);
}

// PUT /api/clientes/[id] - Actualiza un cliente
export async function PUT(request, { params }) {
    const { id } = params;
    const updatedCliente = await request.json();
    const clientes = await readData(FILENAME);

    const clienteIndex = clientes.findIndex(c => c.id === id);

    if (clienteIndex === -1) {
        return NextResponse.json({ message: 'Cliente no encontrado' }, { status: 404 });
    }

    clientes[clienteIndex] = { ...clientes[clienteIndex], ...updatedCliente };

    await writeData(FILENAME, clientes);
    return NextResponse.json(clientes[clienteIndex]);
}

// DELETE /api/clientes/[id] - Elimina un cliente
export async function DELETE(request, { params }) {
    const { id } = params;
    const clientes = await readData(FILENAME);
    const nuevosClientes = clientes.filter(c => c.id !== id);

    if (clientes.length === nuevosClientes.length) {
        return NextResponse.json({ message: 'Cliente no encontrado' }, { status: 404 });
    }

    await writeData(FILENAME, nuevosClientes);
    return NextResponse.json({ message: 'Cliente eliminado' }, { status: 200 });
}
