import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const dataFilePath = path.join(process.cwd(), 'src/data/fabricantes.json');

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

// GET /api/fabricantes - Obtiene todos los fabricantes
export async function GET() {
    const fabricantes = await readData();
    return NextResponse.json(fabricantes);
}

// POST /api/fabricantes - Añade un nuevo fabricante
export async function POST(request) {
    const { nombre } = await request.json();
    if (!nombre) {
        return NextResponse.json({ message: 'El nombre es requerido' }, { status: 400 });
    }

    const fabricantes = await readData();
    const nombreNormalizado = nombre.trim().toUpperCase();

    if (fabricantes.some(f => f.nombre.toUpperCase() === nombreNormalizado)) {
        return NextResponse.json({ message: 'El fabricante ya existe' }, { status: 409 }); // 409 Conflict
    }

    const nuevoFabricante = { id: Date.now(), nombre: nombre.trim() };
    fabricantes.push(nuevoFabricante);
    await writeData(fabricantes);
    return NextResponse.json(nuevoFabricante, { status: 201 });
}
