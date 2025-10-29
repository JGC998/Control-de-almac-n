import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const dataFilePath = path.join(process.cwd(), 'src/data/pedidos_proveedores.json');

async function readData() {
    try {
        const data = await fs.readFile(dataFilePath, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        // Si el archivo no existe, devuelve un array vacío para evitar errores.
        if (error.code === 'ENOENT') {
            return [];
        }
        throw error;
    }
}

async function writeData(data) {
    await fs.writeFile(dataFilePath, JSON.stringify(data, null, 2), 'utf-8');
}

// GET /api/proveedores - Obtiene todos los pedidos a proveedores
export async function GET() {
    const pedidos = await readData();
    return NextResponse.json(pedidos);
}