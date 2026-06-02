import { NextResponse } from 'next/server';
import { logApiError } from '@/lib/logger';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { logCreate, logUpdate, logDelete } from '@/lib/audit';
import { tarifaMaterialSchema, validateData } from '@/lib/validations';

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
      take: 2000,
    });
    return NextResponse.json(tarifas);
  } catch (error) {
    logApiError(error, 'Error fetching tarifas:');
    return NextResponse.json({ error: 'Error al obtener tarifas' }, { status: 500 });
  }
}

// POST /api/precios - Crea una nueva tarifa
export async function POST(request) {
  const data = await request.json();
  try {
    const validation = validateData(tarifaMaterialSchema, {
      material: data.material,
      espesor: getSafeFloat(data.espesor),
      precio: getSafeFloat(data.precio),
      peso: getSafeFloat(data.peso),
      color: data.color || null,
    });
    if (!validation.success) {
      return NextResponse.json({ error: 'Datos inválidos', errors: validation.errors }, { status: 400 });
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
        color: data.color || null,
      },
    });
    await logCreate('TarifaMaterial', newTarifa.id, newTarifa, 'Admin');
    revalidatePath('/tarifas');
    return NextResponse.json(newTarifa, { status: 201 });
  } catch (error) {
    logApiError(error, 'Error creating tarifa:');
    if (error.code === 'P2002') {
        return NextResponse.json({ error: 'Ya existe una tarifa para este Material y Espesor.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Error al crear la tarifa.' }, { status: 500 });
  }
}

// PUT /api/precios - Actualiza una tarifa existente
export async function PUT(request) {
  try {
    const { id, ...data } = await request.json();
    if (!id) {
      return NextResponse.json({ error: 'ID de la tarifa es requerido para actualizar.' }, { status: 400 });
    }

    const tarifaAnterior = await db.tarifaMaterial.findUnique({ where: { id } });
    const updatedTarifa = await db.tarifaMaterial.update({
      where: { id: id },
      data: {
        material: data.material,
        espesor: getSafeFloat(data.espesor),
        precio: getSafeFloat(data.precio),
        peso: getSafeFloat(data.peso),
        color: data.color || null,
      },
    });
    await logUpdate('TarifaMaterial', id, tarifaAnterior, updatedTarifa, 'Admin');
    revalidatePath('/tarifas');
    return NextResponse.json(updatedTarifa, { status: 200 });
  } catch (error) {
    logApiError(error, 'Error updating tarifa:');
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
  try {
    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ error: 'ID de la tarifa es requerido para eliminar.' }, { status: 400 });
    }

    const tarifaAnterior = await db.tarifaMaterial.findUnique({ where: { id } });
    await db.tarifaMaterial.delete({ where: { id: id } });
    await logDelete('TarifaMaterial', id, tarifaAnterior, 'Admin');
    revalidatePath('/tarifas');
    return NextResponse.json({ message: 'Tarifa eliminada.' }, { status: 200 });
  } catch (error) {
    logApiError(error, 'Error deleting tarifa:');
    if (error.code === 'P2025') {
        return NextResponse.json({ error: 'Tarifa no encontrada.' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Error al eliminar la tarifa.' }, { status: 500 });
  }
}
