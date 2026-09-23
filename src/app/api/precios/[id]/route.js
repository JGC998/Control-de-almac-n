import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { handlePrismaError } from '@/lib/manejadores-api';
import { tarifaMaterialSchema, validateData } from '@/lib/validations';
import { logDelete, logUpdate } from '@/lib/audit';

const getSafeFloat = (v) => {
  if (v == null || v === '') return null;
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
};

export const dynamic = 'force-dynamic';

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const data = await request.json();

    const validation = validateData(tarifaMaterialSchema, {
      material: data.material,
      espesor: getSafeFloat(data.espesor),
      precio: getSafeFloat(data.precio),
      peso: getSafeFloat(data.peso),
      color: data.color || null,
      lonas: data.lonas != null && data.lonas !== '' ? parseInt(data.lonas, 10) : null,
      acabado: data.acabado?.trim() || null,
    });
    if (!validation.success) {
      return NextResponse.json({ message: 'Datos inválidos', errors: validation.errors }, { status: 400 });
    }

    const material = await db.material.findUnique({ where: { nombre: validation.data.material } });
    if (!material) {
      return NextResponse.json({ message: 'Material no encontrado' }, { status: 400 });
    }

    const anterior = await db.tarifaMaterial.findUnique({ where: { id } });
    const nuevoPrecio = validation.data.precio;
    const updatedItem = await db.$transaction(async (tx) => {
      const tarifa = await tx.tarifaMaterial.update({
        where: { id },
        data: {
          material: material.nombre,
          espesor: validation.data.espesor,
          precio: nuevoPrecio,
          peso: validation.data.peso,
          color: validation.data.color,
          lonas: validation.data.lonas,
          acabado: validation.data.acabado,
        },
      });
      if (nuevoPrecio != null && nuevoPrecio !== anterior?.precio) {
        const rollos = await tx.tarifaRollo.findMany({
          where: { material: tarifa.material, espesor: tarifa.espesor },
        });
        await Promise.all(rollos.map(r => {
          if (!r.ancho) return Promise.resolve();
          return tx.tarifaRollo.update({
            where: { id: r.id },
            data: { precioBase: nuevoPrecio * (r.ancho / 1000) * r.metrajeMinimo },
          });
        }));
      }
      return tarifa;
    });
    logUpdate('TarifaMaterial', id, anterior, updatedItem, 'Admin').catch(() => {});
    return NextResponse.json(updatedItem);
  } catch (error) {
    return handlePrismaError(error, {
      notFound: 'Tarifa no encontrada',
      conflict: 'Ya existe una tarifa para ese Material y Espesor.',
    });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const anterior = await db.tarifaMaterial.findUnique({ where: { id } });
    await db.tarifaMaterial.delete({ where: { id } });
    logDelete('TarifaMaterial', id, anterior, 'Admin').catch(() => {});
    return NextResponse.json({ message: 'Tarifa eliminada' });
  } catch (error) {
    return handlePrismaError(error, { notFound: 'Tarifa no encontrada' });
  }
}
