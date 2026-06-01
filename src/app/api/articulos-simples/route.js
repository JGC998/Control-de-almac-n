import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { handlePrismaError } from '@/lib/manejadores-api';
import { articuloSimpleSchema, validateData } from '@/lib/validations';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const categoria = searchParams.get('categoria');
    const incluirInactivos = searchParams.get('inactivos') === 'true';

    const articulos = await db.articuloSimple.findMany({
      where: {
        ...(categoria && { categoria }),
        ...(!incluirInactivos && { activo: true }),
      },
      orderBy: [{ categoria: 'asc' }, { nombre: 'asc' }],
      take: 500,
    });
    return NextResponse.json(articulos);
  } catch (error) {
    return handlePrismaError(error);
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const validation = validateData(articuloSimpleSchema, body);
    if (!validation.success) {
      return NextResponse.json({ message: 'Datos inválidos', errors: validation.errors }, { status: 400 });
    }
    const { nombre, categoria, unidad, precioUnitario, costoUnitario, fabricante, descripcion } = validation.data;
    const articulo = await db.articuloSimple.create({
      data: {
        nombre: nombre.trim(),
        categoria,
        unidad,
        precioUnitario,
        costoUnitario: costoUnitario ?? null,
        fabricante: fabricante?.trim() || null,
        descripcion: descripcion?.trim() || null,
      },
    });
    return NextResponse.json(articulo, { status: 201 });
  } catch (error) {
    return handlePrismaError(error);
  }
}
