import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET: Obtener plantilla específica
export async function GET(request, { params }) {
    try {
        const { id } = await params;
        const template = await db.presupuestoTemplate.findUnique({
            where: { id }
        });

        if (!template) {
            return NextResponse.json({ message: 'Plantilla no encontrada' }, { status: 404 });
        }

        return NextResponse.json(template);
    } catch (error) {
        return NextResponse.json({ message: 'Error interno' }, { status: 500 });
    }
}

// PUT: Actualizar plantilla
export async function PUT(request, { params }) {
    try {
        const { id } = await params;
        const data = await request.json();
        const { nombre, descripcion, items, marginId } = data;

        const updated = await db.presupuestoTemplate.update({
            where: { id },
            data: {
                nombre,
                descripcion,
                items,
                marginId
            }
        });

        return NextResponse.json(updated);
    } catch (error) {
        if (error.code === 'P2002') {
            return NextResponse.json({ message: 'Ya existe una plantilla con este nombre' }, { status: 409 });
        }
        return NextResponse.json({ message: 'Error al actualizar' }, { status: 500 });
    }
}

// DELETE: Eliminar plantilla
export async function DELETE(request, { params }) {
    try {
        const { id } = await params;
        await db.presupuestoTemplate.delete({
            where: { id }
        });
        return NextResponse.json({ message: 'Plantilla eliminada' });
    } catch (error) {
        return NextResponse.json({ message: 'Error al eliminar' }, { status: 500 });
    }
}
