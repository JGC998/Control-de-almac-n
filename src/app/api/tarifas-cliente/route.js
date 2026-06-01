import { NextResponse } from 'next/server';
import { logApiError } from '@/lib/logger';
import { db } from '@/lib/db';
import { tarifaClienteCreateSchema, tarifaClienteUpdateSchema } from '@/lib/validations';

// GET /api/tarifas-cliente?clienteId=xxx
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const clienteId = searchParams.get('clienteId');

    if (!clienteId) {
      return NextResponse.json({ error: 'clienteId requerido' }, { status: 400 });
    }

    const tarifas = await db.tarifaCliente.findMany({
      where: { clienteId },
      include: { producto: { select: { id: true, nombre: true } } },
      orderBy: { creadaEn: 'desc' },
    });

    return NextResponse.json(tarifas);
  } catch (error) {
    logApiError(error, 'GET /api/tarifas-cliente');
    return NextResponse.json({ error: 'Error al obtener tarifas' }, { status: 500 });
  }
}

// POST /api/tarifas-cliente
export async function POST(request) {
  try {
    const body = await request.json();
    const parsed = tarifaClienteCreateSchema.safeParse({
      ...body,
      precioEspecial: body.precioEspecial != null ? parseFloat(body.precioEspecial) : undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', errors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { clienteId, descripcion, productoId, precioEspecial, notas } = parsed.data;

    const tarifa = await db.tarifaCliente.create({
      data: {
        clienteId,
        descripcion: descripcion.trim(),
        productoId: productoId || null,
        precioEspecial,
        notas: notas?.trim() || null,
      },
      include: { producto: { select: { id: true, nombre: true } } },
    });

    return NextResponse.json(tarifa, { status: 201 });
  } catch (error) {
    logApiError(error, 'POST /api/tarifas-cliente');
    return NextResponse.json({ error: 'Error al crear la tarifa' }, { status: 500 });
  }
}

// PUT /api/tarifas-cliente
export async function PUT(request) {
  try {
    const body = await request.json();
    const parsed = tarifaClienteUpdateSchema.safeParse({
      ...body,
      precioEspecial: body.precioEspecial != null ? parseFloat(body.precioEspecial) : undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', errors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { id, descripcion, productoId, precioEspecial, notas, activa } = parsed.data;

    const tarifa = await db.tarifaCliente.update({
      where: { id },
      data: {
        ...(descripcion != null && { descripcion: descripcion.trim() }),
        ...(productoId !== undefined && { productoId: productoId || null }),
        ...(precioEspecial != null && { precioEspecial }),
        ...(notas !== undefined && { notas: notas?.trim() || null }),
        ...(activa !== undefined && { activa }),
      },
      include: { producto: { select: { id: true, nombre: true } } },
    });

    return NextResponse.json(tarifa);
  } catch (error) {
    logApiError(error, 'PUT /api/tarifas-cliente');
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Tarifa no encontrada' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Error al actualizar la tarifa' }, { status: 500 });
  }
}

// DELETE /api/tarifas-cliente?id=xxx
export async function DELETE(request) {
  try {
    const id = new URL(request.url).searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id requerido' }, { status: 400 });
    }

    await db.tarifaCliente.delete({ where: { id } });
    return NextResponse.json({ message: 'Tarifa eliminada' });
  } catch (error) {
    logApiError(error, 'DELETE /api/tarifas-cliente');
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Tarifa no encontrada' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Error al eliminar la tarifa' }, { status: 500 });
  }
}
