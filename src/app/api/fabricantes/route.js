import { NextResponse } from 'next/server';
import { readData, writeData } from '../../../utils/dataManager';
import { v4 as uuidv4 } from 'uuid';

const FILENAME = 'fabricantes.json';

// GET /api/fabricantes - Obtiene todos los fabricantes
export async function GET() {
    const fabricantes = await readData(FILENAME);
    return NextResponse.json(fabricantes);
}

// POST /api/fabricantes - Añade un nuevo fabricante
export async function POST(request) {
    const { nombre } = await request.json();
    if (!nombre) {
        return NextResponse.json({ message: 'El nombre es requerido' }, { status: 400 });
    }

    const fabricantes = await readData(FILENAME);
    const nombreNormalizado = nombre.trim().toUpperCase();

    if (fabricantes.some(f => f.nombre.toUpperCase() === nombreNormalizado)) {
        return NextResponse.json({ message: 'El fabricante ya existe' }, { status: 409 }); // 409 Conflict
    }

    const nuevoFabricante = { id: uuidv4(), nombre: nombre.trim() };
    fabricantes.push(nuevoFabricante);
    await writeData(FILENAME, fabricantes);
    return NextResponse.json(nuevoFabricante, { status: 201 });
}
