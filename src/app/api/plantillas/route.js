import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const dataFilePath = path.join(process.cwd(), 'src/data/plantillas.json');

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

// GET /api/plantillas - Obtiene todas las plantillas
export async function GET() {
    const plantillas = await readData();
    return NextResponse.json(plantillas);
}

// POST /api/plantillas - Crea una nueva plantilla
export async function POST(request) {
    const nuevaPlantilla = await request.json();
    const { fabricante, modelo, material, espesor, largo, ancho } = nuevaPlantilla;

    if (!fabricante || !modelo || !material || !espesor || !largo || !ancho) {
        return NextResponse.json({ message: 'Todos los campos de la plantilla son requeridos' }, { status: 400 });
    }

    const plantillas = await readData();

    const existe = plantillas.some(p => 
        p.fabricante.trim().toUpperCase() === fabricante.trim().toUpperCase() &&
        p.modelo.trim().toUpperCase() === modelo.trim().toUpperCase() &&
        p.material === material &&
        p.espesor == espesor &&
        p.largo == largo &&
        p.ancho == ancho
    );

    if (existe) {
        return NextResponse.json({ message: `La plantilla ${fabricante} - ${modelo} ya existe.` }, { status: 409 });
    }

    nuevaPlantilla.id = Date.now();
    plantillas.unshift(nuevaPlantilla);
    await writeData(plantillas);
    return NextResponse.json(nuevaPlantilla, { status: 201 });
}
