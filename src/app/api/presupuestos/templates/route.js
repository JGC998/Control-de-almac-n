import { NextResponse } from 'next/server';
import { z } from 'zod';
import { logApiError } from '@/lib/logger';
import { db } from '@/lib/db';

const templateSchema = z.object({
  nombre: z.string().min(1, 'Nombre requerido').max(200),
  descripcion: z.string().max(500).optional().nullable(),
  items: z.array(z.any()).optional().default([]),
  marginId: z.string().uuid().optional().nullable(),
});

export const dynamic = 'force-dynamic';

// GET: Listar todas las plantillas
export async function GET() {
    try {
        const templates = await db.presupuestoTemplate.findMany({
            orderBy: { nombre: 'asc' },
            take: 200,
        });
        return NextResponse.json(templates);
    } catch (error) {
        logApiError(error, 'Error fetching templates:');
        return NextResponse.json({ message: 'Error al obtener plantillas' }, { status: 500 });
    }
}

// POST: Crear nueva plantilla
export async function POST(request) {
    try {
        const body = await request.json();
        const parsed = templateSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ message: parsed.error.issues[0].message }, { status: 400 });
        }
        const { nombre, descripcion, items, marginId } = parsed.data;

        const newTemplate = await db.presupuestoTemplate.create({
            data: {
                nombre,
                descripcion: descripcion ?? null,
                items: items ?? [],
                marginId: marginId ?? null,
            }
        });

        return NextResponse.json(newTemplate, { status: 201 });
    } catch (error) {
        logApiError(error, 'Error creating template:');
        if (error.code === 'P2002') {
            return NextResponse.json({ message: 'Ya existe una plantilla con este nombre' }, { status: 409 });
        }
        return NextResponse.json({ message: 'Error al crear plantilla' }, { status: 500 });
    }
}
