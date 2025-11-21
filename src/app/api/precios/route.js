import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Función para obtener un número de forma segura o null si es inválido/vacío
const getSafeFloat = (value) => {
    if (value === null || value === undefined || value === '') {
        return null;
    }
    const num = parseFloat(value);
    return isNaN(num) ? null : num;
};

// GET /api/precios - Obtiene todas las tarifas
export async function GET() {
  try {
    const tarifas = await db.tarifaMaterial.findMany({
      orderBy: [{ material: 'asc' }, { espesor: 'asc' }],
    });
    return NextResponse.json(tarifas);
  } catch (error) {
    console.error('Error fetching tarifas:', error);
    return NextResponse.json({ error: 'Error al obtener tarifas' }, { status: 500 });
  }
}

// POST /api/precios - Crea una nueva tarifa
export async function POST(request) {
  const data = await request.json();
  try {
    if (!data.material || getSafeFloat(data.espesor) === null || getSafeFloat(data.precio) === null || getSafeFloat(data.peso) === null) {
      return NextResponse.json({ error: 'Faltan campos requeridos (material, espesor, precio, peso).' }, { status: 400 });
    }

    // Buscamos si el material existe por nombre. Si no, devolvemos un error.
    const materialExists = await db.material.findFirst({ where: { nombre: data.material } });
    if (!materialExists) {
        return NextResponse.json({ error: `El material "${data.material}" no existe. Debe crearlo primero.` }, { status: 400 });
    }

    const newTarifa = await db.tarifaMaterial.create({
      data: {
        material: data.material,
        espesor: getSafeFloat(data.espesor),
        precio: getSafeFloat(data.precio),
        peso: getSafeFloat(data.peso),
      },
    });
    return NextResponse.json(newTarifa, { status: 201 });
  } catch (error) {
    console.error('Error creating tarifa:', error);
    if (error.code === 'P2002') {
        return NextResponse.json({ error: 'Ya existe una tarifa para este Material y Espesor.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Error al crear la tarifa.' }, { status: 500 });
  }
}

// PUT /api/precios - Actualiza una tarifa existente
export async function PUT(request) {
  const { id, ...data } = await request.json();
  try {
    if (!id) {
      return NextResponse.json({ error: 'ID de la tarifa es requerido para actualizar.' }, { status: 400 });
    }

    const updatedTarifa = await db.tarifaMaterial.update({
      where: { id: id },
      data: {
        material: data.material,
        espesor: getSafeFloat(data.espesor),
        precio: getSafeFloat(data.precio),
        peso: getSafeFloat(data.peso),
      },
    });
    return NextResponse.json(updatedTarifa, { status: 200 });
  } catch (error) {
    console.error('Error updating tarifa:', error);
    if (error.code === 'P2002') {
        return NextResponse.json({ error: 'Ya existe una tarifa con esta combinación de Material y Espesor.' }, { status: 409 });
    }
    if (error.code === 'P2025') {
        return NextResponse.json({ error: 'Tarifa no encontrada.' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Error al actualizar la tarifa.' }, { status: 500 });
  }
}

// DELETE /api/precios - Elimina una tarifa
export async function DELETE(request) {
  const { id } = await request.json();
  try {
    if (!id) {
      return NextResponse.json({ error: 'ID de la tarifa es requerido para eliminar.' }, { status: 400 });
    }

    await db.tarifaMaterial.delete({
      where: { id: id },
    });
    return NextResponse.json({ message: 'Tarifa eliminada.' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting tarifa:', error);
    if (error.code === 'P2025') {
        return NextResponse.json({ error: 'Tarifa no encontrada.' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Error al eliminar la tarifa.' }, { status: 500 });
  }
}
