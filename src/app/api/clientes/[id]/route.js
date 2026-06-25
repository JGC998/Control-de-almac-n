import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { handlePrismaError } from '@/lib/manejadores-api';
import { z } from 'zod';

const clienteUpdateSchema = z.object({
  nombre: z.string().min(1, 'Nombre requerido'),
  email: z.string().email('Email inválido').optional().nullable(),
  direccion: z.string().optional().nullable(),
  telefono: z.string().optional().nullable(),
  nif: z.string().optional().nullable(),
  categoria: z.enum(['FABRICANTE', 'INTERMEDIARIO', 'FINAL']).optional().nullable(),
});

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const cliente = await db.cliente.findUnique({ where: { id } });
    if (!cliente) return NextResponse.json({ message: 'Cliente no encontrado' }, { status: 404 });
    return NextResponse.json(cliente);
  } catch (error) {
    return handlePrismaError(error);
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = clienteUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: 'Datos inválidos', errors: parsed.error.flatten().fieldErrors }, { status: 400 });
    }
    const { nombre, email, direccion, telefono, nif, categoria } = parsed.data;
    const updatedCliente = await db.cliente.update({
      where: { id },
      data: { nombre, email, direccion, telefono, nif, tier: categoria },
    });
    revalidatePath('/gestion/clientes');
    revalidatePath(`/gestion/clientes/${id}`);
    return NextResponse.json(updatedCliente);
  } catch (error) {
    return handlePrismaError(error, { notFound: 'Cliente no encontrado' });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await db.cliente.delete({ where: { id } });
    revalidatePath('/gestion/clientes');
    return NextResponse.json({ message: 'Cliente eliminado' });
  } catch (error) {
    return handlePrismaError(error, {
      notFound: 'Cliente no encontrado',
      hasRelated: 'No se puede eliminar: el cliente tiene pedidos o presupuestos asociados.',
    });
  }
}
