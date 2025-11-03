import { NextResponse } from 'next/server';
import { readData, writeData } from '../../../utils/dataManager';
import { v4 as uuidv4 } from 'uuid';

const FILENAME = 'productos.json';

// GET /api/productos - Obtiene todos los productos
export async function GET() {
    // FASE II: La lectura ahora es más rápida gracias a la caché en dataManager.
    const productos = await readData(FILENAME);
    return NextResponse.json(productos);
}

// POST /api/productos - Crea un nuevo producto
export async function POST(request) {
    // FASE II: readData obtiene los datos (probablemente de la caché).
    const nuevoProducto = await request.json();
    const productos = await readData(FILENAME);

    // FASE III: Usar UUID para claves primarias robustas.
    nuevoProducto.id = uuidv4();

    productos.push(nuevoProducto);

    await writeData(FILENAME, productos);
    return NextResponse.json(nuevoProducto, { status: 201 });
}
