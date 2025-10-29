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

// DELETE /api/plantillas/[id] - Elimina una plantilla por su ID
export async function DELETE(request, { params }) {
    const { id } = params;
    const plantillas = await readData();
    const nuevasPlantillas = plantillas.filter(p => p.id != id);

    await writeData(nuevasPlantillas);
    return NextResponse.json({ message: 'Plantilla eliminada' }, { status: 200 });
}
