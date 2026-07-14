import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { handlePrismaError } from '@/lib/manejadores-api';
import { articuloSimpleSchema, validateData } from '@/lib/validations';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const categoria = searchParams.get('categoria');
    const incluirInactivos = searchParams.get('inactivos') === 'true';

    const subfamiliaId = searchParams.get('subfamiliaId');
    const familiaId = searchParams.get('familiaId');

    const articulos = await db.articuloSimple.findMany({
      where: {
        ...(categoria && { categoria }),
        ...(!incluirInactivos && { activo: true }),
        ...(subfamiliaId && { subfamiliaId }),
        ...(familiaId && { subfamilia: { familiaId } }),
      },
      orderBy: [{ categoria: 'asc' }, { nombre: 'asc' }],
      take: 500,
      include: { subfamilia: { include: { familia: true } } },
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
    const { nombre, categoria, unidad, precioUnitario, costoUnitario, fabricante, descripcion, activo, subfamiliaId } = validation.data;
    const articulo = await db.articuloSimple.create({
      data: {
        nombre: nombre.trim(),
        categoria,
        unidad,
        precioUnitario,
        costoUnitario: costoUnitario ?? null,
        fabricante: fabricante?.trim() || null,
        descripcion: descripcion?.trim() || null,
        activo: activo ?? true,
        subfamiliaId: subfamiliaId ?? null,
      },
    });
    return NextResponse.json(articulo, { status: 201 });
  } catch (error) {
    return handlePrismaError(error);
  }
}
