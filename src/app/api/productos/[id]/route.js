import { NextResponse } from 'next/server';
import { readData, writeData } from '../../../../utils/dataManager';

const FILENAME = 'productos.json';

// GET /api/productos/[id] - Obtiene un producto por su ID
export async function GET(request, { params }) {
    const { id } = params;
    const productos = await readData(FILENAME);
    const producto = productos.find(p => p.id === id);

    if (!producto) {
        return NextResponse.json({ message: 'Producto no encontrado' }, { status: 404 });
    }

    return NextResponse.json(producto);
}

// PUT /api/productos/[id] - Actualiza un producto
export async function PUT(request, { params }) {
    const { id } = params;
    const updatedProducto = await request.json();
    const productos = await readData(FILENAME);

    const productoIndex = productos.findIndex(p => p.id === id);

    if (productoIndex === -1) {
        return NextResponse.json({ message: 'Producto no encontrado' }, { status: 404 });
    }

    productos[productoIndex] = { ...productos[productoIndex], ...updatedProducto };

    await writeData(FILENAME, productos);
    return NextResponse.json(productos[productoIndex]);
}

// DELETE /api/productos/[id] - Elimina un producto
export async function DELETE(request, { params }) {
    const { id } = params;
    const productos = await readData(FILENAME);
    const nuevosProductos = productos.filter(p => p.id !== id);

    if (productos.length === nuevosProductos.length) {
        return NextResponse.json({ message: 'Producto no encontrado' }, { status: 404 });
    }

    await writeData(FILENAME, nuevosProductos);
    return NextResponse.json({ message: 'Producto eliminado' }, { status: 200 });
}
