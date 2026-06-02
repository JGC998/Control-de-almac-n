import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { handlePrismaError } from '@/lib/manejadores-api';
import { modeloGrapaSchema, validateData } from '@/lib/validations';

export async function GET() {
  try {
    const modelos = await db.modeloGrapa.findMany({
      where: { activo: true },
      orderBy: [{ tipo: 'asc' }, { espesorDesde: 'asc' }],
    });
    const mermaConfig = await db.config.findUnique({ where: { key: 'mermaGrapaPct' } });
    const mermaGrapaPct = mermaConfig ? parseFloat(mermaConfig.value) : 20;
    return NextResponse.json({ modelos, mermaGrapaPct });
  } catch (error) {
    return handlePrismaError(error);
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const validation = validateData(modeloGrapaSchema, body);
    if (!validation.success) {
      return NextResponse.json({ message: 'Datos inválidos', errors: validation.errors }, { status: 400 });
    }
    const { tipo, nombre, espesorDesde, espesorHasta, anchosDisponibles, precioMetroLineal } = validation.data;
    const modelo = await db.modeloGrapa.create({
      data: {
        tipo,
        nombre: nombre.trim(),
        espesorDesde,
        espesorHasta: espesorHasta ?? null,
        anchosDisponibles: anchosDisponibles ? anchosDisponibles.slice().sort((a, b) => a - b) : null,
        precioMetroLineal,
      },
    });
    return NextResponse.json(modelo, { status: 201 });
  } catch (error) {
    return handlePrismaError(error);
  }
}
