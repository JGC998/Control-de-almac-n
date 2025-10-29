import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const dataFilePath = path.join(process.cwd(), 'src/data/catalogo.json');

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

// GET /api/catalogo - Obtiene todos los productos del catálogo
export async function GET() {
    const catalogo = await readData();
    return NextResponse.json(catalogo);
}

// POST /api/catalogo - Añade un nuevo producto al catálogo
export async function POST(request) {
    const nuevoProducto = await request.json();
    const catalogo = await readData();

    // Asignamos un ID único
    nuevoProducto.id = Date.now();
    catalogo.unshift(nuevoProducto); // Añade al principio

    await writeData(catalogo);
    return NextResponse.json(nuevoProducto, { status: 201 });
}
