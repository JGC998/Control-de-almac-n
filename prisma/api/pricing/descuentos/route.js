import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Función de utilidad para manejar tipos
const getSafeFloat = (value) => {
    if (value === null || value === undefined || value === '') {
        return null;
    }
    const num = parseFloat(value);
    return isNaN(num) ? null : num;
};

// GET /api/pricing/descuentos
export async function GET() {
  try {
    const data = await db.reglaDescuento.findMany({ include: { tiers: true }, orderBy: { descripcion: 'asc' } });
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching descuentos:', error);
    return NextResponse.json({ error: 'Error al obtener descuentos' }, { status: 500 });
  }
}

// POST /api/pricing/descuentos - Crea una nueva regla de descuento (con tiers anidados)
export async function POST(request) {
  try {
    const data = await request.json();
    const { tiers, ...reglaData } = data; // Separar tiers

    if (!reglaData.descripcion || !reglaData.tipo || (reglaData.tipo !== 'volumen' && getSafeFloat(reglaData.descuento) === null)) {
        return NextResponse.json({ error: 'Faltan campos requeridos: descripción, tipo, y descuento (si no es volumen).' }, { status: 400 });
    }
    
    // Crear la regla y los tiers en una transacción
    const nuevaRegla = await db.reglaDescuento.create({
        data: {
            ...reglaData,
            descuento: getSafeFloat(reglaData.descuento) || 0,
            fechaInicio: reglaData.fechaInicio ? new Date(reglaData.fechaInicio) : null,
            fechaFin: reglaData.fechaFin ? new Date(reglaData.fechaFin) : null,
            // Crear tiers anidados
            tiers: {
                create: tiers?.map(t => ({
                    cantidadMinima: parseInt(t.cantidadMinima) || 0,
                    descuento: getSafeFloat(t.descuento) || 0,
                })) || [],
            },
        },
        include: { tiers: true },
    });

    return NextResponse.json(nuevaRegla, { status: 201 });
  } catch (error) {
    console.error('Error creating descuento:', error);
    return NextResponse.json({ error: 'Error al crear descuento' }, { status: 500 });
  }
}

// PUT /api/pricing/descuentos - Actualiza una regla de descuento (con tiers anidados)
export async function PUT(request) {
    const { id, ...data } = await request.json();
    const { tiers, ...reglaData } = data; // Separar tiers

    try {
        if (!id) {
            return NextResponse.json({ error: 'ID de la regla de descuento es requerido.' }, { status: 400 });
        }

        const updatedRegla = await db.$transaction(async (tx) => {
            
            // 1. Actualizar la regla principal
            const updated = await tx.reglaDescuento.update({
                where: { id: id },
                data: {
                    ...reglaData,
                    descuento: getSafeFloat(reglaData.descuento) || 0,
                    fechaInicio: reglaData.fechaInicio ? new Date(reglaData.fechaInicio) : null,
                    fechaFin: reglaData.fechaFin ? new Date(reglaData.fechaFin) : null,
                },
            });
            
            // 2. Si hay tiers, sincronizar (eliminar y recrear)
            if (tiers) {
                // a. Eliminar todos los tiers existentes
                await tx.descuentoTier.deleteMany({ where: { reglaId: id } });

                // b. Crear los nuevos tiers
                await tx.descuentoTier.createMany({
                    data: tiers.map(t => ({
                        reglaId: id,
                        cantidadMinima: parseInt(t.cantidadMinima) || 0,
                        descuento: getSafeFloat(t.descuento) || 0,
                    })),
                });
            }

            return updated;
        });

        return NextResponse.json(updatedRegla, { status: 200 });
    } catch (error) {
        console.error('Error updating descuento:', error);
        if (error.code === 'P2025') {
            return NextResponse.json({ error: 'Regla de descuento no encontrada.' }, { status: 404 });
        }
        return NextResponse.json({ error: 'Error al actualizar descuento' }, { status: 500 });
    }
}

// DELETE /api/pricing/descuentos - Elimina una regla de descuento (con tiers)
export async function DELETE(request) {
    const { id } = await request.json();
    try {
        if (!id) {
            return NextResponse.json({ error: 'ID de la regla de descuento es requerido.' }, { status: 400 });
        }
        
        await db.$transaction(async (tx) => {
            // 1. Eliminar los tiers asociados
            await tx.descuentoTier.deleteMany({ where: { reglaId: id } });
            
            // 2. Eliminar la regla principal
            await tx.reglaDescuento.delete({ where: { id: id } });
        });

        return NextResponse.json({ message: 'Regla de descuento eliminada.' }, { status: 200 });
    } catch (error) {
        console.error('Error deleting descuento:', error);
        if (error.code === 'P2025') {
            return NextResponse.json({ error: 'Regla de descuento no encontrada.' }, { status: 404 });
        }
        return NextResponse.json({ error: 'Error al eliminar descuento' }, { status: 500 });
    }
}
