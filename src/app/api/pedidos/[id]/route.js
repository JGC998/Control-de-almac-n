import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const dataFilePath = path.join(process.cwd(), 'src/data/pedidos.json');

async function readData() {
    try {
        const data = await fs.readFile(dataFilePath, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') return [];
        throw error;
    }
}

async function writeData(data) {
    await fs.writeFile(dataFilePath, JSON.stringify(data, null, 2), 'utf-8');
}

// GET /api/pedidos/[id] - Obtiene un pedido por su ID
export async function GET(request, { params }) {
    const { id } = await params;
    const pedidos = await readData();
    const pedido = pedidos.find(p => String(p.id) === String(id));

    if (!pedido) {
        return NextResponse.json({ message: 'Pedido no encontrado' }, { status: 404 });
    }

    return NextResponse.json(pedido);
}

// PUT /api/pedidos/[id] - Actualiza el estado de un pedido
export async function PUT(request, { params }) {
    const { id } = await params; // Await params as suggested by the error message
    const pedidoActualizado = await request.json();
    const pedidos = await readData();

    const pedidoIndex = pedidos.findIndex(p => p.id == id);

    if (pedidoIndex === -1) {
        return NextResponse.json({ message: 'Pedido no encontrado' }, { status: 404 });
    }

    pedidos[pedidoIndex] = {
        ...pedidos[pedidoIndex],
        ...pedidoActualizado
    };
    await writeData(pedidos);

    return NextResponse.json(pedidos[pedidoIndex]);
}

// DELETE /api/pedidos/[id] - Elimina un pedido por su ID
export async function DELETE(request, { params }) {
    const { id } = await params; // Await params as suggested by the error message
    const pedidos = await readData();
    const nuevosPedidos = pedidos.filter(p => p.id != id);

    await writeData(nuevosPedidos);
    return NextResponse.json({ message: 'Pedido eliminado' }, { status: 200 });
}