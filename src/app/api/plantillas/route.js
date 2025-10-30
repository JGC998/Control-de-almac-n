import { NextResponse } from 'next/server';
import { readData, writeData } from '../../../utils/dataManager';
import { v4 as uuidv4 } from 'uuid';

const FILENAME = 'plantillas.json';

// GET /api/plantillas - Obtiene todas las plantillas
export async function GET() {
    const plantillas = await readData(FILENAME);
    return NextResponse.json(plantillas);
}

// POST /api/plantillas - Crea una nueva plantilla
export async function POST(request) {
    const nuevaPlantilla = await request.json();
    const { fabricante, modelo, material, espesor, largo, ancho } = nuevaPlantilla;

    if (!fabricante || !modelo || !material || !espesor || !largo || !ancho) {
        return NextResponse.json({ message: 'Todos los campos de la plantilla son requeridos' }, { status: 400 });
    }

    const plantillas = await readData(FILENAME);

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

    nuevaPlantilla.id = uuidv4();
    plantillas.unshift(nuevaPlantilla);
    await writeData(FILENAME, plantillas);
    return NextResponse.json(nuevaPlantilla, { status: 201 });
}
