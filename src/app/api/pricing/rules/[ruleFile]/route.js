import { NextResponse } from 'next/server';
import { readData, writeData } from '@/utils/dataManager';
import { v4 as uuidv4 } from 'uuid';

// Whitelist de archivos permitidos para modificar por esta API
const ALLOWED_FILES = ['margenes.json', 'descuentos.json', 'precios_especiales.json'];

// Helper para validar el nombre del archivo
function getValidatedFilename(filename) {
    if (ALLOWED_FILES.includes(filename)) {
        return filename;
    }
    return null;
}

// GET /api/pricing/rules/[ruleFile] - Obtiene todas las reglas de un archivo
export async function GET(request, { params }) {
    const filename = getValidatedFilename(params.ruleFile);
    if (!filename) {
        return NextResponse.json({ message: 'Acceso no autorizado al archivo' }, { status: 403 });
    }
    const data = await readData(filename);
    return NextResponse.json(data);
}

// POST /api/pricing/rules/[ruleFile] - Crea una nueva regla
export async function POST(request, { params }) {
    const filename = getValidatedFilename(params.ruleFile);
    if (!filename) {
        return NextResponse.json({ message: 'Acceso no autorizado al archivo' }, { status: 403 });
    }

    const newRule = await request.json();
    const allRules = await readData(filename);

    newRule.id = uuidv4();
    allRules.push(newRule);

    await writeData(filename, allRules);
    return NextResponse.json(newRule, { status: 201 });
}

// PUT /api/pricing/rules/[ruleFile] - Actualiza una regla existente
export async function PUT(request, { params }) {
    const filename = getValidatedFilename(params.ruleFile);
    if (!filename) {
        return NextResponse.json({ message: 'Acceso no autorizado al archivo' }, { status: 403 });
    }

    const updatedRule = await request.json();
    if (!updatedRule.id) {
        return NextResponse.json({ message: 'El ID de la regla es requerido para actualizar' }, { status: 400 });
    }

    const allRules = await readData(filename);
    const index = allRules.findIndex(rule => rule.id === updatedRule.id);

    if (index === -1) {
        return NextResponse.json({ message: `No se encontró la regla con ID ${updatedRule.id}` }, { status: 404 });
    }

    allRules[index] = updatedRule;
    await writeData(filename, allRules);
    return NextResponse.json(updatedRule);
}

// DELETE /api/pricing/rules/[ruleFile] - Elimina una regla
export async function DELETE(request, { params }) {
    const filename = getValidatedFilename(params.ruleFile);
    if (!filename) {
        return NextResponse.json({ message: 'Acceso no autorizado al archivo' }, { status: 403 });
    }

    const { id } = await request.json();
    if (!id) {
        return NextResponse.json({ message: 'El ID de la regla es requerido para eliminar' }, { status: 400 });
    }

    const allRules = await readData(filename);
    const filteredRules = allRules.filter(rule => rule.id !== id);

    if (allRules.length === filteredRules.length) {
        return NextResponse.json({ message: `No se encontró la regla con ID ${id}` }, { status: 404 });
    }

    await writeData(filename, filteredRules);
    return NextResponse.json({ message: `Regla ${id} eliminada con éxito` });
}
