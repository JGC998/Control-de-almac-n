import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET: Listar todas las plantillas
export async function GET() {
    try {
        const templates = await db.presupuestoTemplate.findMany({
            orderBy: { nombre: 'asc' }
        });
        return NextResponse.json(templates);
    } catch (error) {
        console.error('Error fetching templates:', error);
        return NextResponse.json({ message: 'Error al obtener plantillas' }, { status: 500 });
    }
}

// POST: Crear nueva plantilla
export async function POST(request) {
    try {
        const data = await request.json();
        const { nombre, descripcion, items, marginId } = data;

        if (!nombre) {
            return NextResponse.json({ message: 'Nombre es requerido' }, { status: 400 });
        }

        const newTemplate = await db.presupuestoTemplate.create({
            data: {
                nombre,
                descripcion,
                items: items || [],
                marginId
            }
        });

        return NextResponse.json(newTemplate, { status: 201 });
    } catch (error) {
        console.error('Error creating template:', error);
        if (error.code === 'P2002') {
            return NextResponse.json({ message: 'Ya existe una plantilla con este nombre' }, { status: 409 });
        }
        return NextResponse.json({ message: 'Error al crear plantilla' }, { status: 500 });
    }
}
