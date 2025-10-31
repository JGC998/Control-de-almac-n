import { NextResponse } from 'next/server';
import { readData, writeData } from '../../../utils/dataManager';

const FILENAME = 'productos.json';

// GET /api/productos - Obtiene todos los productos
export async function GET() {
    const productos = await readData(FILENAME);
    return NextResponse.json(productos);
}

// POST /api/productos - Crea un nuevo producto
export async function POST(request) {
    const nuevoProducto = await request.json();
    const productos = await readData(FILENAME);

    // Asignar un nuevo ID (puedes usar una lógica más robusta como UUID)
    nuevoProducto.id = `prod-${Date.now()}`;

    productos.push(nuevoProducto);

    await writeData(FILENAME, productos);
    return NextResponse.json(nuevoProducto, { status: 201 });
}
