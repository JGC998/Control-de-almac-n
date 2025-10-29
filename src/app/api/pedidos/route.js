import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const dataFilePath = path.join(process.cwd(), 'src/data/pedidos.json');

async function readData() {
    try {
        const data = await fs.readFile(dataFilePath, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        // Si el archivo no existe, devuelve un array vacío
        if (error.code === 'ENOENT') {
            return [];
        }
        throw error;
    }
}

async function writeData(data) {
    await fs.writeFile(dataFilePath, JSON.stringify(data, null, 2), 'utf-8');
}

// GET /api/pedidos - Obtiene todos los pedidos
export async function GET() {
    const pedidos = await readData();
    return NextResponse.json(pedidos);
}

// POST /api/pedidos - Crea un nuevo pedido
export async function POST(request) {
    const nuevoPedido = await request.json();
    const pedidos = await readData();

    // Asignamos un ID único
    nuevoPedido.id = Date.now();
    pedidos.unshift(nuevoPedido); // Añade al principio

    await writeData(pedidos);
    return NextResponse.json(nuevoPedido, { status: 201 });
}
