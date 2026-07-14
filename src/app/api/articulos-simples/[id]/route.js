import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { handlePrismaError } from '@/lib/manejadores-api';
import { articuloSimplePatchSchema, validateData } from '@/lib/validations';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const articulo = await db.articuloSimple.findUnique({
      where: { id },
      include: { subfamilia: { include: { familia: true } } },
    });
    if (!articulo) return NextResponse.json({ message: 'Artículo no encontrado' }, { status: 404 });
    return NextResponse.json(articulo);
  } catch (error) {
    return handlePrismaError(error);
  }
}

export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validation = validateData(articuloSimplePatchSchema, body);
    if (!validation.success) {
      return NextResponse.json({ message: 'Datos inválidos', errors: validation.errors }, { status: 400 });
    }
    const data = validation.data;
    if (data.nombre) data.nombre = data.nombre.trim();
    if (data.fabricante) data.fabricante = data.fabricante.trim();
    if (data.descripcion) data.descripcion = data.descripcion.trim();

    const updated = await db.articuloSimple.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch (error) {
    return handlePrismaError(error, { notFound: 'Artículo no encontrado' });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await db.articuloSimple.delete({ where: { id } });
    return NextResponse.json({ message: 'Artículo eliminado correctamente' });
  } catch (error) {
    return handlePrismaError(error, { notFound: 'Artículo no encontrado' });
  }
}
