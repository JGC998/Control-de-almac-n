import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Función para obtener un número de forma segura o null si es inválido/vacío
const getSafeNumber = (value) => {
    if (value === null || value === undefined || value === '') {
        return null;
    }
    const num = parseFloat(value);
    return isNaN(num) ? null : num;
};

// GET /api/pricing/margenes - Obtiene todas las reglas de margen
export async function GET() {
  try {
    const data = await db.reglaMargen.findMany();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching margenes:', error);
    return NextResponse.json({ error: 'Error al obtener márgenes' }, { status: 500 });
  }
}

// POST /api/pricing/margenes - Crea una nueva regla de margen
export async function POST(request) {
  try {
    const data = await request.json();

    // NUEVA VALIDACIÓN: Se requiere base y multiplicador (el campo fijo no es requerido)
    if (!data.base || !data.multiplicador || !data.descripcion) {
        return NextResponse.json({ error: 'Faltan campos requeridos (base, multiplicador, descripcion).' }, { status: 400 });
    }

    const nuevaRegla = await db.reglaMargen.create({
      data: {
        base: data.base, // NUEVO
        descripcion: data.descripcion,
        multiplicador: getSafeNumber(data.multiplicador), // NUEVO
        gastoFijo: getSafeNumber(data.gastoFijo), // NUEVO
        tipo: data.tipo || 'General', // Campo legacy
        categoria: data.categoria || null, // Campo legacy
      },
    });
    return NextResponse.json(nuevaRegla, { status: 201 });
  } catch (error) {
    console.error('Error creating margen:', error);
    if (error.code === 'P2002') {
        return NextResponse.json({ error: 'Ya existe una regla de margen con ese Tipo de Tarifa (base).' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Error al crear margen' }, { status: 500 });
  }
}

// PUT /api/pricing/margenes - Actualiza una regla de margen existente
export async function PUT(request) {
  const { id, ...data } = await request.json();
  try {
    if (!id) {
        return NextResponse.json({ error: 'ID de la regla de margen es requerido.' }, { status: 400 });
    }

    const updatedRegla = await db.reglaMargen.update({
        where: { id: id },
        data: {
            base: data.base, // NUEVO
            descripcion: data.descripcion,
            multiplicador: getSafeNumber(data.multiplicador),
            gastoFijo: getSafeNumber(data.gastoFijo),
            tipo: data.tipo || 'General',
            categoria: data.categoria || null,
        },
    });
    return NextResponse.json(updatedRegla, { status: 200 });
  } catch (error) {
    console.error('Error updating margen:', error);
    if (error.code === 'P2002') {
        return NextResponse.json({ error: 'Ya existe una regla de margen con ese Tipo de Tarifa (base).' }, { status: 409 });
    }
    if (error.code === 'P2025') {
        return NextResponse.json({ error: 'Regla de margen no encontrada.' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Error al actualizar el margen' }, { status: 500 });
  }
}

// DELETE /api/pricing/margenes - Elimina una regla de margen
export async function DELETE(request) {
    const { id } = await request.json();
    try {
        if (!id) {
            return NextResponse.json({ error: 'ID de la regla de margen es requerido.' }, { status: 400 });
        }

        await db.reglaMargen.delete({
            where: { id: id },
        });
        return NextResponse.json({ message: 'Regla de margen eliminada.' }, { status: 200 });
    } catch (error) {
        console.error('Error deleting margen:', error);
        if (error.code === 'P2025') {
            return NextResponse.json({ error: 'Regla de margen no encontrada.' }, { status: 404 });
        }
        return NextResponse.json({ error: 'Error al eliminar el margen' }, { status: 500 });
    }
}
