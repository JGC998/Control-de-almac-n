import { NextResponse } from 'next/server';
import { readData, writeData, updateData } from '../../../../utils/dataManager';

const FILENAME = 'pedidos.json';

// GET /api/pedidos/[id] - Obtiene un pedido por su ID
export async function GET(request, { params }) {
    const { id } = params;
    const pedidos = await readData(FILENAME);
    const pedido = pedidos.find(p => String(p.id) === String(id));

    if (!pedido) {
        return NextResponse.json({ message: 'Pedido no encontrado' }, { status: 404 });
    }

    return NextResponse.json(pedido);
}

// PUT /api/pedidos/[id] - Actualiza el estado de un pedido
export async function PUT(request, { params }) {
    const { id } = params;
    const pedidoActualizado = await request.json();

    const success = await updateData(FILENAME, id, pedidoActualizado);

    if (!success) {
        return NextResponse.json({ message: 'Pedido no encontrado' }, { status: 404 });
    }

    // Para devolver el pedido actualizado, necesitamos leerlo de nuevo o construirlo.
    // Por simplicidad, leeremos todos los pedidos y encontraremos el actualizado.
    const pedidos = await readData(FILENAME);
    const updatedPedido = pedidos.find(p => String(p.id) === String(id));

    return NextResponse.json(updatedPedido);
}

// DELETE /api/pedidos/[id] - Elimina un pedido por su ID
export async function DELETE(request, { params }) {
    const { id } = params;
    const pedidos = await readData(FILENAME);
    const nuevosPedidos = pedidos.filter(p => String(p.id) !== String(id));

    if (nuevosPedidos.length === pedidos.length) {
        return NextResponse.json({ message: 'Pedido no encontrado' }, { status: 404 });
    }

    await writeData(FILENAME, nuevosPedidos);
    return NextResponse.json({ message: 'Pedido eliminado' }, { status: 200 });
}